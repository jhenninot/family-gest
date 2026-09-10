import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { connectDB } from './config/db.js'
import { seedDatabaseIfEmpty } from './seed.js'
import { requireAuth, requireAdmin, generateToken } from './middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import nodemailer from 'nodemailer'
import crypto from 'crypto'

import User from './models/User.js'
import Task from './models/Task.js'
import Event from './models/Event.js'
import ShoppingItem from './models/ShoppingItem.js'
import EmailConfig from './models/EmailConfig.js'
import Shortcut from './models/Shortcut.js'
import Absence from './models/Absence.js'
import MealGuest from './models/MealGuest.js'
import PushConfig from './models/PushConfig.js'
import PushSubscription from './models/PushSubscription.js'
import webpush from 'web-push'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API FamilyGest, Authentification & MongoDB opérationnelles' })
})

// Helper : Envoi d'email de bienvenue avec token d'activation (durée 2 heures)
const sendWelcomeEmail = async (user, token) => {
  try {
    const config = await EmailConfig.findOne()
    if (!config || !config.isConfigured || !config.host || !config.user || !config.pass) {
      console.log(`[Email] Configuration SMTP non définie ou incomplète. Email de bienvenue non envoyé à ${user.email}`)
      return { success: false, reason: 'SMTP_NOT_CONFIGURED' }
    }

    const baseServerUrl = (config.serverUrl || 'http://localhost:5173').replace(/\/+$/, '')
    const setPasswordUrl = `${baseServerUrl}/set-password?token=${token}`

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    const mailOptions = {
      from: `"${config.fromName || 'FamilyGest'}" <${config.fromEmail || config.user}>`,
      to: user.email,
      subject: '✨ Bienvenue sur FamilyGest - Définissez votre mot de passe',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bienvenue sur FamilyGest</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
            <tr>
              <td style="padding: 32px 28px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 14px; background-color: #6366f1; background: linear-gradient(135deg, #6366f1, #818cf8); font-size: 28px; text-align: center; color: #ffffff;">
                    ✨
                  </div>
                  <h1 style="color: #4338ca; margin: 12px 0 4px 0; font-size: 24px; font-weight: 800;">Bienvenue sur FamilyGest</h1>
                  <p style="color: #64748b; margin: 0; font-size: 14px;">Votre espace familial partagé</p>
                </div>

                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 12px; color: #1e293b;">Bonjour <strong>${user.firstName || user.name || 'Membre'}</strong>,</p>
                <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
                  Un compte d'accès à <strong>FamilyGest</strong> vient d'être créé pour vous avec l'adresse email : <strong style="color: #4f46e5;">${user.email}</strong>.
                </p>

                <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
                  Pour activer votre compte et vous connecter pour la première fois, veuillez cliquer sur le bouton ci-dessous pour choisir votre mot de passe personnel :
                </p>

                <!-- Bulletproof cross-client button -->
                <div style="text-align: center; margin: 32px 0;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${setPasswordUrl}" style="height:50px;v-text-anchor:middle;width:300px;" arcsize="16%" stroke="f" fillcolor="#4f46e5">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:'Segoe UI',sans-serif;font-size:16px;font-weight:bold;">🔐 Définir mon mot de passe</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                    <tr>
                      <td align="center" bgcolor="#4f46e5" style="border-radius: 8px; background-color: #4f46e5; vertical-align: middle;">
                        <a href="${setPasswordUrl}" target="_blank" style="background-color: #4f46e5; border: 14px solid #4f46e5; border-left: 28px solid #4f46e5; border-right: 28px solid #4f46e5; color: #ffffff !important; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; display: inline-block; border-radius: 8px; line-height: 1.2;">
                          🔐 Définir mon mot de passe
                        </a>
                      </td>
                    </tr>
                  </table>
                  <!--<![endif]-->
                </div>

                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;">
                  <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
                    ⏱️ <strong>Important :</strong> Ce lien sécurisé est valable pendant <strong>2 heures</strong>. Passé ce délai, demandez à un administrateur de votre famille de vous renvoyer un email d'invitation.
                  </p>
                </div>

                <p style="font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 24px; line-height: 1.5;">
                  Si le bouton ci-dessus ne s'affiche pas correctement, vous pouvez copier et coller ce lien dans votre navigateur :<br/>
                  <a href="${setPasswordUrl}" style="color: #6366f1; text-decoration: underline;">${setPasswordUrl}</a>
                </p>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
                  FamilyGest • Application d'organisation familiale sécurisée
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    }

    await transporter.sendMail(mailOptions)
    console.log(`[Email] Email de bienvenue envoyé avec succès à ${user.email}`)
    return { success: true }
  } catch (err) {
    console.error(`[Email] Erreur lors de l'envoi de l'email de bienvenue à ${user.email} :`, err.message)
    return { success: false, error: err.message }
  }
}

// Helper : Validation de sécurité renforcée du mot de passe
// Règle : 10 caractères minimum, au moins 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial.
const validatePasswordSecurity = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Le mot de passe est obligatoire.' }
  }
  if (password.length < 10) {
    return { valid: false, error: 'Le mot de passe doit comporter au moins 10 caractères.' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins une lettre majuscule (A-Z).' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins une lettre minuscule (a-z).' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins un chiffre (0-9).' }
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins un caractère spécial (ex: ! @ # $ % * _ -).' }
  }
  return { valid: true }
}

// === NOTIFICATIONS WEB PUSH (VAPID & SERVICE WORKER) ===
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || ''
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''

const initVapid = async () => {
  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      let config = await PushConfig.findOne()
      if (!config) {
        const generatedKeys = webpush.generateVAPIDKeys()
        config = await PushConfig.create({
          publicKey: generatedKeys.publicKey,
          privateKey: generatedKeys.privateKey
        })
        console.log('[WebPush] Nouvelles clés VAPID générées et persistées en base MongoDB')
      }
      vapidPublicKey = config.publicKey
      vapidPrivateKey = config.privateKey
    }

    webpush.setVapidDetails(
      'mailto:contact@familygest.local',
      vapidPublicKey,
      vapidPrivateKey
    )
    console.log('[WebPush] Service de notifications Web Push initialisé avec succès')
  } catch (err) {
    console.error('[WebPush] Erreur configuration VAPID:', err.message)
  }
}

// Helper pour diffuser une notification push aux membres éligibles
const sendPushNotification = async ({ title, body, url = '/', excludeUserId = null }) => {
  try {
    if (!vapidPublicKey || !vapidPrivateKey) return

    // Sélectionne les utilisateurs ayant activé les notifications push
    const userQuery = { pushNotificationsEnabled: { $ne: false } }
    if (excludeUserId) {
      userQuery.id = { $ne: Number(excludeUserId) }
    }

    const eligibleUsers = await User.find(userQuery).select('id')
    const userIds = eligibleUsers.map(u => u.id)
    if (userIds.length === 0) return

    const subscriptions = await PushSubscription.find({ userId: { $in: userIds } })
    if (subscriptions.length === 0) return

    const payload = JSON.stringify({
      title,
      body,
      url,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `familygest-${Date.now()}`
    })

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        }, payload)
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[WebPush] Nettoyage souscription obsolète : ${sub.endpoint.substring(0, 45)}...`)
          await PushSubscription.deleteOne({ _id: sub._id })
        } else {
          console.error(`[WebPush] Erreur envoi push:`, err.message)
        }
      }
    })

    await Promise.allSettled(sendPromises)
  } catch (err) {
    console.error('[WebPush] Erreur sendPushNotification:', err.message)
  }
}

// GET /api/push/vapid-public-key (Obtenir la clé publique pour le client web)
app.get('/api/push/vapid-public-key', (req, res) => {
  if (!vapidPublicKey) {
    return res.status(503).json({ error: 'Service Web Push non initialisé' })
  }
  res.json({ publicKey: vapidPublicKey })
})

// POST /api/push/subscribe (Enregistrer une souscription push)
app.post('/api/push/subscribe', requireAuth, async (req, res) => {
  try {
    const { subscription, userAgent } = req.body
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Données de souscription invalides' })
    }

    const { endpoint, keys } = subscription
    const userId = req.user.id

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth
        },
        userAgent: userAgent || ''
      },
      { upsert: true, new: true }
    )

    await User.updateOne({ id: userId }, { pushNotificationsEnabled: true })

    res.json({ success: true, message: 'Souscription push enregistrée avec succès' })
  } catch (err) {
    console.error('[WebPush] Erreur enregistrement souscription:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/push/unsubscribe (Désabonner des notifications push)
app.post('/api/push/unsubscribe', requireAuth, async (req, res) => {
  try {
    const { endpoint } = req.body
    const userId = req.user.id

    if (endpoint) {
      await PushSubscription.deleteOne({ endpoint })
    } else {
      await PushSubscription.deleteMany({ userId })
    }

    await User.updateOne({ id: userId }, { pushNotificationsEnabled: false })

    res.json({ success: true, message: 'Désabonnement push effectué' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === AUTHENTICATION ROUTES ===

// POST /api/auth/login (Connexion par email & mot de passe)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Veuillez saisir une adresse email et un mot de passe' })
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return res.status(401).json({ error: 'Adresse email ou mot de passe incorrect' })
    }

    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Adresse email ou mot de passe incorrect' })
    }

    await User.updateOne({ id: user.id }, { $set: { lastLogin: new Date() } })
    const token = generateToken(user.id, user.email, user.isAdmin)

    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isAdmin: user.isAdmin,
        role: user.role,
        avatar: user.avatar,
        color: user.color,
        points: user.points,
        pushNotificationsEnabled: user.pushNotificationsEnabled !== false
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/auth/me (Vérifie la session courante et renvoie un token prolongé de 30 jours à partir de cet instant)
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = req.user
    await User.updateOne({ id: user.id }, { $set: { lastLogin: new Date() } })
    const token = generateToken(user.id, user.email, user.isAdmin)

    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isAdmin: user.isAdmin,
        role: user.role,
        avatar: user.avatar,
        color: user.color,
        points: user.points,
        pushNotificationsEnabled: user.pushNotificationsEnabled !== false
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/register (Création d'un membre/utilisateur - Réservé aux Administrateurs)
app.post('/api/auth/register', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, avatar, color, isAdmin } = req.body

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'Champs nom, prénom, email et mot de passe requis' })
    }

    const pwdCheck = validatePasswordSecurity(password)
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.error })
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
    if (existingUser) {
      return res.status(400).json({ error: 'Un utilisateur avec cette adresse email existe déjà' })
    }

    const welcomeToken = crypto.randomBytes(32).toString('hex')
    const welcomeTokenExpires = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 heures

    const newUser = new User({
      id: Date.now(),
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      password,
      isAdmin: Boolean(isAdmin),
      role: role || 'Membre',
      avatar: avatar || '👤',
      color: color || '#6366f1',
      points: 0,
      welcomeToken,
      welcomeTokenExpires
    })

    await newUser.save()

    // Envoi de l'email de bienvenue en arrière-plan
    sendWelcomeEmail(newUser, welcomeToken)

    res.status(201).json({
      id: newUser.id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      name: `${newUser.firstName} ${newUser.lastName}`,
      email: newUser.email,
      isAdmin: newUser.isAdmin,
      role: newUser.role,
      avatar: newUser.avatar,
      color: newUser.color,
      points: newUser.points
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// GET /api/auth/verify-token (Vérification de la validité d'un token de bienvenue/activation)
app.get('/api/auth/verify-token', async (req, res) => {
  try {
    const { token } = req.query
    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token manquant' })
    }

    const user = await User.findOne({
      welcomeToken: token,
      welcomeTokenExpires: { $gt: new Date() }
    })

    if (!user) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Ce lien de bienvenue est invalide ou a expiré (durée de validité : 2 heures). Veuillez contacter un administrateur pour en recevoir un nouveau.' 
      })
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar
      }
    })
  } catch (err) {
    res.status(500).json({ valid: false, error: err.message })
  }
})

// POST /api/auth/set-password (Définition du mot de passe avec token d'activation)
app.post('/api/auth/set-password', async (req, res) => {
  try {
    const { token, password, pushNotificationsEnabled } = req.body
    if (!token || !password) {
      return res.status(400).json({ error: 'Token et mot de passe requis' })
    }

    const pwdCheck = validatePasswordSecurity(password)
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.error })
    }

    const user = await User.findOne({
      welcomeToken: token,
      welcomeTokenExpires: { $gt: new Date() }
    })

    if (!user) {
      return res.status(400).json({ 
        error: 'Ce lien de bienvenue est invalide ou a expiré (durée de validité : 2 heures). Veuillez demander à un administrateur de vous renvoyer un email.' 
      })
    }

    // Le hook pre('save') de Mongoose hashera automatiquement le mot de passe
    user.password = password
    user.welcomeToken = null
    user.welcomeTokenExpires = null
    if (pushNotificationsEnabled !== undefined) {
      user.pushNotificationsEnabled = Boolean(pushNotificationsEnabled)
    }
    await user.save()

    const jwtToken = generateToken(user.id, user.email, user.isAdmin)

    res.json({
      success: true,
      message: 'Votre mot de passe a été enregistré avec succès !',
      token: jwtToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isAdmin: user.isAdmin,
        role: user.role,
        avatar: user.avatar,
        color: user.color,
        points: user.points,
        pushNotificationsEnabled: user.pushNotificationsEnabled !== false
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/auth/profile (Modification de ses propres informations par l'utilisateur)
app.put('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id })
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' })

    const { firstName, lastName, email, password, role, avatar, color, pushNotificationsEnabled } = req.body

    if (firstName) user.firstName = firstName.trim()
    if (lastName) user.lastName = lastName.trim()
    if (role) user.role = role
    if (avatar) user.avatar = avatar
    if (color) user.color = color

    if (pushNotificationsEnabled !== undefined) {
      user.pushNotificationsEnabled = Boolean(pushNotificationsEnabled)
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() })
      if (existing && existing.id !== user.id) {
        return res.status(400).json({ error: 'Cette adresse email est déjà utilisée par un autre compte' })
      }
      user.email = email.toLowerCase().trim()
    }

    if (password && password.trim().length > 0) {
      const pwdCheck = validatePasswordSecurity(password.trim())
      if (!pwdCheck.valid) {
        return res.status(400).json({ error: pwdCheck.error })
      }
      user.password = password.trim()
    }

    await user.save()

    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      isAdmin: user.isAdmin,
      role: user.role,
      avatar: user.avatar,
      color: user.color,
      points: user.points,
      pushNotificationsEnabled: user.pushNotificationsEnabled !== false
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === MEMBERS ROUTES ===
app.get('/api/members', requireAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ points: -1 })
    const members = users.map(u => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      isAdmin: u.isAdmin,
      role: u.role,
      avatar: u.avatar,
      color: u.color,
      points: u.points,
      pushNotificationsEnabled: u.pushNotificationsEnabled !== false
    }))
    res.json(members)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Ajouter un membre : Réservé à l'Administrateur
app.post('/api/members', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, firstName, lastName, email, password, role, avatar, color, points, isAdmin } = req.body

    const fName = firstName || (name ? name.split(' ')[0] : 'Membre')
    const lName = lastName || (name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : 'Famille')
    const userEmail = email ? email.toLowerCase().trim() : `membre.${Date.now()}@family-gest.org`
    const userPassword = password || 'Family2026!*'

    if (password && password.trim()) {
      const pwdCheck = validatePasswordSecurity(password.trim())
      if (!pwdCheck.valid) {
        return res.status(400).json({ error: pwdCheck.error })
      }
    }

    const existingUser = await User.findOne({ email: userEmail })
    if (existingUser) {
      return res.status(400).json({ error: 'Un membre avec cet email existe déjà' })
    }

    const welcomeToken = crypto.randomBytes(32).toString('hex')
    const welcomeTokenExpires = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 heures

    const newUser = new User({
      id: Date.now(),
      firstName: fName,
      lastName: lName,
      email: userEmail,
      password: userPassword,
      isAdmin: Boolean(isAdmin),
      role: role || (isAdmin ? 'Administrateur' : 'Membre'),
      avatar: avatar || '👤',
      color: color || '#6366f1',
      points: Number(points) || 0,
      welcomeToken,
      welcomeTokenExpires
    })

    await newUser.save()

    // Envoi de l'email de bienvenue en arrière-plan
    sendWelcomeEmail(newUser, welcomeToken)

    res.status(201).json({
      id: newUser.id,
      name: `${newUser.firstName} ${newUser.lastName}`,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      isAdmin: newUser.isAdmin,
      role: newUser.role,
      avatar: newUser.avatar,
      color: newUser.color,
      points: newUser.points
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Modifier un membre : Réservé à l'Administrateur
app.put('/api/members/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const memberId = Number(req.params.id)
    const user = await User.findOne({ id: memberId })
    if (!user) return res.status(404).json({ error: 'Membre non trouvé' })

    const { name, firstName, lastName, email, password, role, avatar, color, points, isAdmin, pushNotificationsEnabled } = req.body

    if (firstName) user.firstName = firstName.trim()
    if (lastName) user.lastName = lastName.trim()
    if (name && !firstName && !lastName) {
      user.firstName = name.split(' ')[0]
      user.lastName = name.split(' ').slice(1).join(' ') || user.lastName
    }

    if (role) user.role = role
    if (avatar) user.avatar = avatar
    if (color) user.color = color
    if (points !== undefined && points !== null) user.points = Number(points)
    if (pushNotificationsEnabled !== undefined) user.pushNotificationsEnabled = Boolean(pushNotificationsEnabled)

    if (isAdmin !== undefined && isAdmin !== null) {
      const newAdminState = Boolean(isAdmin)
      if (user.id === req.user.id && !newAdminState && user.isAdmin) {
        return res.status(400).json({ error: 'Vous ne pouvez pas retirer vos propres privilèges d\'administrateur' })
      }
      if (user.isAdmin && !newAdminState) {
        const adminCount = await User.countDocuments({ isAdmin: true })
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Impossible de retirer le statut administrateur car il s\'agit du dernier administrateur du système.' })
        }
      }
      user.isAdmin = newAdminState
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() })
      if (existing && existing.id !== user.id) {
        return res.status(400).json({ error: 'Un membre avec cette adresse email existe déjà' })
      }
      user.email = email.toLowerCase().trim()
    }

    if (password && password.trim().length > 0) {
      const pwdCheck = validatePasswordSecurity(password.trim())
      if (!pwdCheck.valid) {
        return res.status(400).json({ error: pwdCheck.error })
      }
      user.password = password.trim()
    }

    await user.save()

    res.json({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isAdmin: user.isAdmin,
      role: user.role,
      avatar: user.avatar,
      color: user.color,
      points: user.points,
      pushNotificationsEnabled: user.pushNotificationsEnabled !== false
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Modifier le statut Administrateur d'un membre : Réservé à l'Administrateur
app.put('/api/members/:id/toggle-admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const memberId = Number(req.params.id)
    const user = await User.findOne({ id: memberId })
    if (!user) return res.status(404).json({ error: 'Membre non trouvé' })

    if (user.id === req.user.id && user.isAdmin) {
      return res.status(400).json({ error: 'Vous ne pouvez pas retirer vos propres privilèges d\'administrateur' })
    }

    if (user.isAdmin) {
      const adminCount = await User.countDocuments({ isAdmin: true })
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Impossible de retirer le statut administrateur car il s\'agit du dernier administrateur du système.' })
      }
    }

    user.isAdmin = !user.isAdmin
    await user.save()

    res.json({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isAdmin: user.isAdmin,
      role: user.role,
      avatar: user.avatar,
      color: user.color,
      points: user.points
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Supprimer un membre : Réservé à l'Administrateur
app.delete('/api/members/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const memberId = Number(req.params.id)
    if (req.user.id === memberId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte administrateur' })
    }
    const member = await User.findOne({ id: memberId })
    if (!member) return res.status(404).json({ error: 'Membre non trouvé' })

    if (member.isAdmin) {
      const adminCount = await User.countDocuments({ isAdmin: true })
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Impossible de supprimer cet administrateur car il s\'agit du dernier administrateur du système.' })
      }
    }

    await User.deleteOne({ id: memberId })
    res.json({ message: 'Membre supprimé par l\'administrateur' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Renvoyer manuellement un email de bienvenue avec un nouveau token de 2h : Réservé à l'Administrateur
app.post('/api/members/:id/resend-welcome', requireAuth, requireAdmin, async (req, res) => {
  try {
    const memberId = Number(req.params.id)
    const user = await User.findOne({ id: memberId })
    if (!user) return res.status(404).json({ error: 'Membre non trouvé' })

    const config = await EmailConfig.findOne()
    if (!config || !config.isConfigured || !config.host || !config.user || !config.pass) {
      return res.status(400).json({ 
        error: 'Le serveur email SMTP n\'est pas encore configuré. Rendez-vous dans Administration pour le paramétrer.' 
      })
    }

    const welcomeToken = crypto.randomBytes(32).toString('hex')
    user.welcomeToken = welcomeToken
    user.welcomeTokenExpires = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 heures
    await user.save()

    const emailResult = await sendWelcomeEmail(user, welcomeToken)
    if (emailResult.success) {
      res.json({ 
        success: true, 
        message: `Email de bienvenue renvoyé avec succès à ${user.email} (lien valable 2 heures)` 
      })
    } else {
      res.status(500).json({ 
        error: `Erreur lors de l'envoi SMTP : ${emailResult.error || 'Vérifiez la configuration email'}` 
      })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === TASKS ROUTES ===
app.get('/api/tasks', requireAuth, async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 })
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/tasks', requireAuth, async (req, res) => {
  try {
    const newTask = new Task({
      id: Date.now(),
      title: req.body.title,
      category: req.body.category || 'Maison',
      assignedTo: Number(req.body.assignedTo),
      priority: req.body.priority || 'Moyenne',
      points: Number(req.body.points) || 10,
      completed: false,
      dueDate: req.body.dueDate
    })
    await newTask.save()
    res.status(201).json(newTask)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/tasks/:id/toggle', requireAuth, async (req, res) => {
  try {
    const task = await Task.findOne({ id: Number(req.params.id) })
    if (!task) return res.status(404).json({ error: 'Tâche non trouvée' })

    task.completed = !task.completed
    await task.save()

    const user = await User.findOne({ id: task.assignedTo })
    if (user) {
      if (task.completed) {
        user.points += task.points
      } else {
        user.points = Math.max(0, user.points - task.points)
      }
      await user.save()
    }

    res.json(task)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/tasks/:id', requireAuth, async (req, res) => {
  try {
    await Task.deleteOne({ id: Number(req.params.id) })
    res.json({ message: 'Tâche supprimée' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === EVENTS ROUTES ===
app.get('/api/events', requireAuth, async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 })
    res.json(events)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/events', requireAuth, async (req, res) => {
  try {
    const newEvent = new Event({
      id: Date.now(),
      title: req.body.title,
      date: req.body.date,
      time: req.body.time,
      category: req.body.category || 'Famille',
      location: req.body.location,
      color: req.body.color || '#8b5cf6',
      assignedTo: req.body.assignedTo
    })
    await newEvent.save()

    // Notification push pour le nouvel événement agenda
    const authorName = req.user ? req.user.firstName : 'Un membre'
    const timeStr = newEvent.time ? ` à ${newEvent.time}` : ''
    const locStr = newEvent.location ? ` (${newEvent.location})` : ''
    sendPushNotification({
      title: `📅 Nouvel événement : ${newEvent.title}`,
      body: `${newEvent.date}${timeStr}${locStr} • Ajouté par ${authorName}`,
      url: '/calendar',
      excludeUserId: req.user ? req.user.id : null
    })

    res.status(201).json(newEvent)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/api/events/:id', requireAuth, async (req, res) => {
  try {
    await Event.deleteOne({ id: Number(req.params.id) })
    res.json({ message: 'Événement supprimé' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// === SHOPPING ROUTES ===
app.get('/api/shopping', requireAuth, async (req, res) => {
  try {
    const items = await ShoppingItem.find().sort({ createdAt: -1 })
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/shopping', requireAuth, async (req, res) => {
  try {
    const newItem = new ShoppingItem({
      id: Date.now(),
      name: req.body.name,
      category: req.body.category || 'Frais',
      quantity: Number(req.body.quantity) || 1,
      urgent: Boolean(req.body.urgent),
      checked: false
    })
    await newItem.save()
    res.status(201).json(newItem)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/shopping/:id/toggle', requireAuth, async (req, res) => {
  try {
    const item = await ShoppingItem.findOne({ id: Number(req.params.id) })
    if (!item) return res.status(404).json({ error: 'Article non trouvé' })

    item.checked = !item.checked
    await item.save()
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/shopping/:id', requireAuth, async (req, res) => {
  try {
    await ShoppingItem.deleteOne({ id: Number(req.params.id) })
    res.json({ message: 'Article supprimé' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === ABSENCES & MEALS ROUTES ===
app.get('/api/absences', requireAuth, async (req, res) => {
  try {
    const absences = await Absence.find().sort({ date: 1 })
    res.json(absences)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/absences', requireAuth, async (req, res) => {
  try {
    const { memberId, date, lunch, dinner, night, note } = req.body

    if (!memberId || !date) {
      return res.status(400).json({ error: 'Membre et date requis' })
    }

    if (!lunch && !dinner && !night) {
      return res.status(400).json({ error: 'Veuillez sélectionner au moins un créneau (Déjeuner, Dîner ou Nuit)' })
    }

    const notifyAbsence = async (mId, dStr, l, din, n, nt) => {
      try {
        const absentMember = await User.findOne({ id: Number(mId) })
        const mName = absentMember ? absentMember.firstName : 'Un membre'
        const slots = []
        if (l) slots.push('Midi')
        if (din) slots.push('Soir')
        if (n) slots.push('Nuit')
        const slotsStr = slots.length > 0 ? slots.join(', ') : 'Journée'
        const noteStr = nt ? ` • ${nt.trim()}` : ''

        sendPushNotification({
          title: `🚫 Nouvelle absence : ${mName}`,
          body: `${mName} sera absent(e) le ${dStr.trim()} (${slotsStr})${noteStr}`,
          url: '/absences',
          excludeUserId: req.user ? req.user.id : null
        })
      } catch (e) {
        console.error('[WebPush] Erreur push absence:', e.message)
      }
    }

    let existing = await Absence.findOne({ memberId: Number(memberId), date: date.trim() })
    if (existing) {
      existing.lunch = Boolean(lunch)
      existing.dinner = Boolean(dinner)
      existing.night = Boolean(night)
      if (note !== undefined) existing.note = note.trim()
      await existing.save()
      notifyAbsence(memberId, date, lunch, dinner, night, note)
      return res.json(existing)
    }

    const newAbsence = new Absence({
      id: Date.now(),
      memberId: Number(memberId),
      date: date.trim(),
      lunch: Boolean(lunch),
      dinner: Boolean(dinner),
      night: Boolean(night),
      note: (note || '').trim()
    })

    await newAbsence.save()
    notifyAbsence(memberId, date, lunch, dinner, night, note)
    res.status(201).json(newAbsence)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/absences/:id', requireAuth, async (req, res) => {
  try {
    const absence = await Absence.findOne({ id: Number(req.params.id) })
    if (!absence) return res.status(404).json({ error: 'Absence non trouvée' })

    if (absence.memberId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres absences' })
    }

    const { memberId, date, lunch, dinner, night, note } = req.body
    if (memberId !== undefined && req.user.isAdmin) absence.memberId = Number(memberId)
    if (date) absence.date = date.trim()
    if (lunch !== undefined) absence.lunch = Boolean(lunch)
    if (dinner !== undefined) absence.dinner = Boolean(dinner)
    if (night !== undefined) absence.night = Boolean(night)
    if (note !== undefined) absence.note = note.trim()

    if (!absence.lunch && !absence.dinner && !absence.night) {
      await Absence.deleteOne({ id: absence.id })
      return res.json({ message: 'Absence supprimée car aucun créneau n\'est sélectionné' })
    }

    await absence.save()
    res.json(absence)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/absences/:id', requireAuth, async (req, res) => {
  try {
    const absence = await Absence.findOne({ id: Number(req.params.id) })
    if (!absence) return res.status(404).json({ error: 'Absence non trouvée' })

    if (absence.memberId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres absences' })
    }

    await Absence.deleteOne({ id: Number(req.params.id) })
    res.json({ message: 'Absence supprimée' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === MEAL GUESTS ROUTES (INVITÉS AUX REPAS) ===
app.get('/api/meal-guests', requireAuth, async (req, res) => {
  try {
    const guests = await MealGuest.find().sort({ date: 1, createdAt: 1 })
    res.json(guests)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/meal-guests', requireAuth, async (req, res) => {
  try {
    const { name, names, date, lunch, dinner, night, invitedBy, note } = req.body

    if (!date) {
      return res.status(400).json({ error: 'La date est requise' })
    }

    if (!lunch && !dinner && !night) {
      return res.status(400).json({ error: 'Veuillez sélectionner au moins un créneau (Déjeuner, Dîner ou Nuit)' })
    }

    // Support single name or list of names (separated by commas or array)
    let guestNames = []
    if (Array.isArray(names) && names.length > 0) {
      guestNames = names.map(n => String(n).trim()).filter(Boolean)
    } else if (name && typeof name === 'string') {
      // Split by comma if user typed multiple names separated by comma
      guestNames = name.split(',').map(n => n.trim()).filter(Boolean)
    }

    if (guestNames.length === 0) {
      return res.status(400).json({ error: 'Veuillez renseigner le nom de l\'invité' })
    }

    const createdGuests = []
    const hostId = invitedBy ? Number(invitedBy) : req.user.id

    for (let i = 0; i < guestNames.length; i++) {
      const gName = guestNames[i]
      const newGuest = new MealGuest({
        id: Date.now() + i + Math.floor(Math.random() * 100),
        name: gName,
        date: date.trim(),
        lunch: Boolean(lunch),
        dinner: Boolean(dinner),
        night: Boolean(night),
        invitedBy: hostId,
        note: (note || '').trim()
      })
      await newGuest.save()
      createdGuests.push(newGuest)
    }

    // Déclenchement notification push pour nouvel invité
    try {
      const host = await User.findOne({ id: hostId })
      const hostName = host ? host.firstName : (req.user ? req.user.firstName : 'Un membre')
      const slots = []
      if (lunch) slots.push('Midi')
      if (dinner) slots.push('Soir')
      if (night) slots.push('Nuit')
      const slotsStr = slots.length > 0 ? slots.join(', ') : 'Repas'
      const namesStr = guestNames.join(', ')
      const noteStr = note ? ` • ${note.trim()}` : ''

      sendPushNotification({
        title: `🍽️ Nouvel invité : ${namesStr}`,
        body: `${namesStr} invité(s) par ${hostName} le ${date.trim()} (${slotsStr})${noteStr}`,
        url: '/absences',
        excludeUserId: req.user ? req.user.id : null
      })
    } catch (e) {
      console.error('[WebPush] Erreur push invité:', e.message)
    }

    // Return the created guest or array of guests
    if (createdGuests.length === 1) {
      res.status(201).json(createdGuests[0])
    } else {
      res.status(201).json(createdGuests)
    }
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/meal-guests/:id', requireAuth, async (req, res) => {
  try {
    const guest = await MealGuest.findOne({ id: Number(req.params.id) })
    if (!guest) return res.status(404).json({ error: 'Invité non trouvé' })

    const { name, date, lunch, dinner, night, invitedBy, note } = req.body
    if (name) guest.name = name.trim()
    if (date) guest.date = date.trim()
    if (lunch !== undefined) guest.lunch = Boolean(lunch)
    if (dinner !== undefined) guest.dinner = Boolean(dinner)
    if (night !== undefined) guest.night = Boolean(night)
    if (invitedBy !== undefined) guest.invitedBy = invitedBy ? Number(invitedBy) : null
    if (note !== undefined) guest.note = note.trim()

    if (!guest.lunch && !guest.dinner && !guest.night) {
      await MealGuest.deleteOne({ id: guest.id })
      return res.json({ message: 'Invité supprimé car aucun créneau n\'est sélectionné' })
    }

    await guest.save()
    res.json(guest)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/meal-guests/:id', requireAuth, async (req, res) => {
  try {
    const guest = await MealGuest.findOne({ id: Number(req.params.id) })
    if (!guest) return res.status(404).json({ error: 'Invité non trouvé' })

    await MealGuest.deleteOne({ id: Number(req.params.id) })
    res.json({ message: 'Invité supprimé' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === EMAIL & APP SETTINGS ROUTES (ADMIN ONLY) ===
app.get('/api/settings/email', requireAuth, requireAdmin, async (req, res) => {
  try {
    let config = await EmailConfig.findOne()
    if (!config) {
      config = new EmailConfig()
      await config.save()
    }
    res.json({
      serverUrl: config.serverUrl || 'http://localhost:5173',
      providerPreset: config.providerPreset || 'gmail',
      host: config.host || 'smtp.gmail.com',
      port: config.port || 587,
      secure: Boolean(config.secure),
      user: config.user || '',
      hasPassword: Boolean(config.pass && config.pass.length > 0),
      fromEmail: config.fromEmail || config.user || '',
      fromName: config.fromName || 'FamilyGest',
      isConfigured: Boolean(config.isConfigured)
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/settings/email', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { serverUrl, providerPreset, host, port, secure, user, pass, fromEmail, fromName } = req.body

    let config = await EmailConfig.findOne()
    if (!config) {
      config = new EmailConfig()
    }

    if (serverUrl !== undefined) config.serverUrl = serverUrl.trim()
    if (providerPreset) config.providerPreset = providerPreset
    if (host !== undefined) config.host = host.trim()
    if (port !== undefined) config.port = Number(port)
    if (secure !== undefined) config.secure = Boolean(secure)
    if (user !== undefined) config.user = user.trim()
    if (pass !== undefined && pass !== '') config.pass = pass.trim()
    if (fromEmail !== undefined) config.fromEmail = fromEmail.trim()
    if (fromName !== undefined) config.fromName = fromName.trim()

    config.isConfigured = Boolean(config.host && config.user && config.pass)
    await config.save()

    res.json({
      message: 'Paramètres enregistrés avec succès',
      serverUrl: config.serverUrl,
      providerPreset: config.providerPreset,
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      hasPassword: Boolean(config.pass && config.pass.length > 0),
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      isConfigured: config.isConfigured
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/settings/email/test', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { recipientEmail } = req.body
    if (!recipientEmail || !recipientEmail.trim()) {
      return res.status(400).json({ error: 'Veuillez renseigner une adresse email destinataire' })
    }

    const config = await EmailConfig.findOne()
    if (!config || !config.host || !config.user || !config.pass) {
      return res.status(400).json({ error: 'Le serveur email n\'est pas encore configuré' })
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    const mailOptions = {
      from: `"${config.fromName || 'FamilyGest'}" <${config.fromEmail || config.user}>`,
      to: recipientEmail.trim(),
      subject: '✨ Test de configuration Email - FamilyGest',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 12px; border: 1px solid #e0e7ff; background-color: #f8fafc;">
          <h2 style="color: #4f46e5; margin-top: 0;">🎉 Connexion Email Réussie !</h2>
          <p>Bonjour,</p>
          <p>Ceci est un message de test envoyé depuis votre application <strong>FamilyGest</strong>.</p>
          <p>Vos paramètres de serveur d'envoi Email (SMTP / IMAP) sont enregistrés et opérationnels :</p>
          <ul>
            <li><strong>Serveur :</strong> ${config.host}:${config.port}</li>
            <li><strong>Compte :</strong> ${config.user}</li>
            <li><strong>Expéditeur :</strong> ${config.fromName || 'FamilyGest'}</li>
          </ul>
          <p style="color: #64748b; font-size: 0.9em; margin-top: 30px;">Envoyé automatiquement par FamilyGest • Espace Familial</p>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)
    res.json({ message: `Email de test envoyé avec succès à ${recipientEmail}` })
  } catch (err) {
    console.error('Erreur lors de l\'envoi de l\'email de test:', err)
    res.status(500).json({ error: `Échec de l'envoi de l'email : ${err.message}` })
  }
})

// === SHORTCUTS / APPS ROUTES ===
app.get('/api/shortcuts', requireAuth, async (req, res) => {
  try {
    const shortcuts = await Shortcut.find().sort({ order: 1, createdAt: 1 })
    res.json(shortcuts)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/shortcuts', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, url, icon, order } = req.body
    if (!title || !url) {
      return res.status(400).json({ error: 'Le titre et l\'adresse URL sont requis' })
    }

    let validUrl = url.trim()
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = `https://${validUrl}`
    }

    const newShortcut = new Shortcut({
      id: Date.now(),
      title: title.trim(),
      url: validUrl,
      icon: icon ? icon.trim() : '🌐',
      order: Number(order) || 0
    })

    await newShortcut.save()
    res.status(201).json(newShortcut)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/shortcuts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const shortcut = await Shortcut.findOne({ id: Number(req.params.id) })
    if (!shortcut) return res.status(404).json({ error: 'Raccourci non trouvé' })

    const { title, url, icon, order } = req.body
    if (title) shortcut.title = title.trim()
    if (url) {
      let validUrl = url.trim()
      if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
        validUrl = `https://${validUrl}`
      }
      shortcut.url = validUrl
    }
    if (icon !== undefined) shortcut.icon = icon.trim() || '🌐'
    if (order !== undefined) shortcut.order = Number(order) || 0

    await shortcut.save()
    res.json(shortcut)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/shortcuts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Shortcut.deleteOne({ id: Number(req.params.id) })
    res.json({ message: 'Raccourci supprimé' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// === STATIC FILES & SPA FALLBACK (Production / Docker) ===
const distPath = path.resolve(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  console.log(`📦 Fichiers frontend détectés (${distPath}) : activation du service statique`)
  app.use(express.static(distPath))

  // Redirection SPA vers index.html pour les pages client (hors /api)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next()
    }
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Start server
const startServer = async () => {
  await connectDB()
  await seedDatabaseIfEmpty()
  await initVapid()

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur API Express Sécurisé démarré sur http://localhost:${PORT}`)
  })
}

startServer()
