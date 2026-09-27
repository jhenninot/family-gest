import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'

// Connexion avec un compte Google (OpenID Connect, flux « authorization code » côté serveur).
//
// Réservée aux comptes FamilyGest existants : l'adresse e-mail vérifiée par Google doit être
// celle d'un compte, ou celle d'une invitation en attente (acceptée au passage). Personne ne
// crée de compte seul. Le mot de passe reste utilisable en parallèle.
//
// Déroulé :
//   GET /api/auth/google/start[?invite=<jeton>&lang=fr] -> page de Google
//   GET /api/auth/google/callback?code&state            -> retour à /auth/google#token=… (ou #error=…)
// Le `state` est signé et lié au navigateur par un cookie (anti-CSRF) ; valable 10 minutes.

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const STATE_COOKIE = 'fg_google_state'
const STATE_TTL_S = 600
const STATE_SECRET = `${process.env.JWT_SECRET || 'familygest_jwt_secret_key_2026'}:google-state`

const googleRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' }
})

export const googleRedirectUri = (baseUrl) => `${baseUrl}/api/auth/google/callback`

// Réglages complets et activés par le Super Admin
export const isGoogleAuthReady = (config) => Boolean(config?.googleAuthEnabled && config?.googleClientId && config?.googleClientSecret)

const readCookie = (req, name) => {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

// Contenu du jeton d'identité reçu directement de Google (connexion TLS authentifiée par notre
// secret client) : la vérification de signature n'est pas nécessaire (OpenID Connect § 3.1.3.7),
// on contrôle l'émetteur, le destinataire et l'expiration.
const readIdToken = (idToken, clientId) => {
  const payload = JSON.parse(Buffer.from(String(idToken).split('.')[1] || '', 'base64url').toString('utf8'))
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) throw new Error('issuer')
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!audience.includes(clientId)) throw new Error('audience')
  if (!payload.exp || payload.exp * 1000 < Date.now()) throw new Error('expired')
  return payload
}

/**
 * @param {import('express').Express} app
 * @param {Object} ctx - modèles et fonctions de server/index.js
 */
export const mountGoogleAuth = (app, ctx) => {
  const { User, Family, FamilyMember, FamilyInvitation, getConfig, publicBaseUrl, generateToken, attachPendingInvitations, normalizeLanguage } = ctx

  // Retour vers l'application (le jeton passe dans le fragment : jamais envoyé à un serveur)
  const finish = (res, params) => {
    res.clearCookie(STATE_COOKIE, { path: '/api/auth/google' })
    res.redirect(`/auth/google#${new URLSearchParams(params)}`)
  }

  // Le bouton « Continuer avec Google » ne s'affiche que si c'est configuré
  app.get('/api/auth/google/status', async (req, res) => {
    try {
      res.json({ enabled: isGoogleAuthReady(await getConfig()) })
    } catch {
      res.json({ enabled: false })
    }
  })

  app.get('/api/auth/google/start', googleRateLimiter, async (req, res) => {
    try {
      const config = await getConfig()
      if (!isGoogleAuthReady(config)) return finish(res, { error: 'not_configured' })
      const nonce = crypto.randomBytes(16).toString('hex')
      const state = jwt.sign({
        nonce,
        invite: req.query.invite ? String(req.query.invite).slice(0, 200) : null,
        lang: normalizeLanguage(req.query.lang)
      }, STATE_SECRET, { expiresIn: STATE_TTL_S })
      const baseUrl = await publicBaseUrl(req)
      res.cookie(STATE_COOKIE, nonce, {
        httpOnly: true,
        sameSite: 'lax',
        secure: baseUrl.startsWith('https://'),
        maxAge: STATE_TTL_S * 1000,
        path: '/api/auth/google'
      })
      const params = new URLSearchParams({
        client_id: config.googleClientId,
        redirect_uri: googleRedirectUri(baseUrl),
        response_type: 'code',
        scope: 'openid email profile',
        state,
        prompt: 'select_account'
      })
      res.redirect(`${AUTHORIZE_URL}?${params}`)
    } catch (err) {
      console.error('[Google] Démarrage de la connexion :', err.message)
      finish(res, { error: 'failed' })
    }
  })

  app.get('/api/auth/google/callback', googleRateLimiter, async (req, res) => {
    try {
      if (req.query.error) {
        return finish(res, { error: req.query.error === 'access_denied' ? 'denied' : 'failed' })
      }
      let state
      try {
        state = jwt.verify(String(req.query.state || ''), STATE_SECRET)
      } catch {
        return finish(res, { error: 'expired' })
      }
      const cookieNonce = readCookie(req, STATE_COOKIE)
      if (!cookieNonce || cookieNonce !== state.nonce) return finish(res, { error: 'expired' })

      const config = await getConfig()
      if (!isGoogleAuthReady(config)) return finish(res, { error: 'not_configured' })
      const tokenRes = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(req.query.code || ''),
          client_id: config.googleClientId,
          client_secret: config.googleClientSecret,
          redirect_uri: googleRedirectUri(await publicBaseUrl(req)),
          grant_type: 'authorization_code'
        }),
        signal: AbortSignal.timeout(15000)
      })
      const tokens = await tokenRes.json().catch(() => ({}))
      if (!tokenRes.ok || !tokens.id_token) {
        console.error('[Google] Échange du code refusé :', tokens.error_description || tokens.error || tokenRes.status)
        return finish(res, { error: 'failed' })
      }
      const profile = readIdToken(tokens.id_token, config.googleClientId)
      const email = String(profile.email || '').toLowerCase().trim()
      if (!email || profile.email_verified !== true) return finish(res, { error: 'email_not_verified' })

      // Compte déjà relié à ce compte Google, sinon compte ayant la même adresse
      let user = await User.findOne({ googleId: profile.sub }) || await User.findOne({ email })
      let familySlug = null

      // Invitation : même adresse que le compte Google, acceptée au passage
      if (state.invite) {
        const invitation = await FamilyInvitation.findOne({ token: state.invite })
        if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
          return finish(res, { error: 'invite_invalid' })
        }
        if (invitation.email.toLowerCase().trim() !== email) {
          return finish(res, { error: 'invite_mismatch', email })
        }
        const family = await Family.findById(invitation.familyId)
        if (!family) return finish(res, { error: 'invite_invalid' })
        const alreadyMember = user ? await FamilyMember.findOne({ familyId: family._id, userId: user.id }) : null
        if (!alreadyMember && await FamilyMember.countDocuments({ familyId: family._id }) >= family.maxMembers) {
          return finish(res, { error: 'quota' })
        }
        if (!user) {
          // Nouveau compte, sans mot de passe connu (un mot de passe aléatoire satisfait le modèle)
          const highestUser = await User.findOne().sort('-id')
          user = new User({
            id: (highestUser && typeof highestUser.id === 'number') ? highestUser.id + 1 : 1,
            firstName: (invitation.firstName || profile.given_name || 'Membre').trim(),
            lastName: (invitation.lastName || profile.family_name || '').trim(),
            email: invitation.email,
            password: `${crypto.randomBytes(24).toString('base64url')}Aa1!`,
            avatar: '👤',
            color: '#6366f1',
            isAdmin: false,
            isSuperAdmin: false,
            role: invitation.isAdmin ? 'Administrateur' : (invitation.role || 'Membre'),
            usualPresence: 'present',
            language: state.lang || null
          })
          await user.save()
          console.log(`[Google] Compte créé par invitation (famille ${family.slug})`)
        }
        familySlug = family.slug
      }

      if (!user) return finish(res, { error: 'no_account', email })

      if (user.googleId !== profile.sub) {
        await User.updateOne({ id: user.id }, { $set: { googleId: profile.sub } })
      }
      await User.updateOne({ id: user.id }, { $set: { lastLogin: new Date() } })
      // Invitations en attente à cette adresse (dont celle éventuellement utilisée) : comme à la connexion par mot de passe
      await attachPendingInvitations(user)

      console.log(`[Google] Connexion réussie${familySlug ? ` (invitation, famille ${familySlug})` : ''}`)
      finish(res, { token: generateToken(user.id, user.email, user.isAdmin, user.isSuperAdmin), ...(familySlug ? { family: familySlug } : {}) })
    } catch (err) {
      console.error('[Google] Retour de connexion :', err.message)
      finish(res, { error: 'failed' })
    }
  })
}
