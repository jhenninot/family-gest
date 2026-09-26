import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import mongoSanitize from 'express-mongo-sanitize'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { connectDB } from './config/db.js'
import { seedDatabaseIfEmpty } from './seed.js'
import { requireAuth, requireAdmin, requireSuperAdmin, generateToken } from './middleware/auth.js'
import Family from './models/Family.js'
import FamilyMember from './models/FamilyMember.js'
import GlobalConfig from './models/GlobalConfig.js'
import FamilyInvitation from './models/FamilyInvitation.js'
import { migrateToMultiFamily } from './scripts/migrate-to-multi-family.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import nodemailer from 'nodemailer'
import crypto from 'crypto'

import User from './models/User.js'
import Task from './models/Task.js'
import Event from './models/Event.js'
import ShoppingItem from './models/ShoppingItem.js'
import ShoppingCategory from './models/ShoppingCategory.js'
import Shortcut from './models/Shortcut.js'
import Absence from './models/Absence.js'
import LongAbsence from './models/LongAbsence.js'
import MealGuest from './models/MealGuest.js'
import Meal from './models/Meal.js'
import PushConfig from './models/PushConfig.js'
import PushSubscription from './models/PushSubscription.js'
import AlertLog from './models/AlertLog.js'
import McpConnector from './models/McpConnector.js'
import MealieConfig from './models/MealieConfig.js'
import { ALERT_ACTIONS, ALERT_ACTIONS_LIST, ACTION_CATEGORY_BY_CODE } from './constants/alertActions.js'
import webpush from 'web-push'
import { mountMcpServer } from './mcp/index.js'
import { mountAlexaSkill } from './alexa/index.js'
import { buildInteractionModel } from './alexa/interactionModel.js'
import { getFamilyMembersList } from './mcp/resolveMember.js'
import AlexaConnector from './models/AlexaConnector.js'
import { migrateNotificationPreferences } from './scripts/migrate-notification-preferences.js'
import { migrateUsualPresenceGrid } from './scripts/migrate-usual-presence-grid.js'
import { startDigestScheduler, mountDigestAdminRoutes } from './digest/index.js'
import { escapeHtml } from './digest/templates.js'
import { t, normalizeLanguage, languageMiddleware, TranslatableError, localizeError, translator, localize, DEFAULT_LANGUAGE, formatDateOnly, readableDate, translateValue } from './i18n/index.js'
import { normalizeUsualPresenceConfig, summarizeUsualPresence, mondayOf, DEFAULT_WEEK_ANCHOR } from '../shared/presence.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Nombre de reverse proxies de confiance placés devant ce serveur (Traefik/Nginx/Caddy — voir
// DOCKGE.md). Désactivé par défaut (0) : sans proxy devant l'app, faire confiance à un
// X-Forwarded-For arbitraire permettrait à un client de falsifier son IP et de contourner les
// limiteurs de débit ci-dessous. À définir via TRUST_PROXY=1 (un seul saut) uniquement quand un
// reverse proxy est effectivement en place.
const trustProxyHops = Number(process.env.TRUST_PROXY || 0)
if (trustProxyHops > 0) app.set('trust proxy', trustProxyHops)

// En-têtes de sécurité HTTP standards (X-Content-Type-Options, X-Frame-Options, HSTS...).
// CSP et Cross-Origin-Embedder-Policy désactivés : leurs valeurs par défaut sont trop strictes
// pour cette SPA (PWA/service worker, polices Google Fonts en cache Workbox — voir
// vite.config.js) et casseraient l'app sans un audit dédié de chaque ressource chargée.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}))

// CORS : par défaut ouvert (le frontend est servi par ce même serveur en production, donc
// aucune requête cross-origin n'est nécessaire). Si des origines sont explicitement listées
// via CORS_ORIGIN (ex: déploiement frontend/backend séparés), on restreint à cette liste.
const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean)
app.use(cors(corsOrigins.length > 0 ? { origin: corsOrigins } : undefined))
// Le corps brut des requêtes Alexa est conservé : leur signature porte sur ces octets exacts
// (voir server/alexa/index.js).
app.use(express.json({
  verify: (req, _res, buf) => {
    if (req.originalUrl.startsWith('/api/alexa/')) req.rawBody = buf.toString('utf8')
  }
}))

// Langue des réponses (req.t) : voir server/i18n/index.js
app.use(languageMiddleware)

// Neutralise l'injection d'opérateurs Mongo ($ne, $gt...) glissés dans le corps, la query ou les
// paramètres d'URL d'une requête — défense en profondeur en complément du casting explicite déjà
// fait par chaque route (String(...), .trim(), Number(...)).
app.use(mongoSanitize())

// Limitation de débit sur les endpoints d'authentification / jetons sensibles (anti brute-force)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: (req) => ({ error: req.t('errors.tooManyAttempts') })
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API FamilyGest, Authentification & MongoDB opérationnelles' })
})

// Helper : Détermine si une configuration email est exploitable, selon son mode d'envoi.
// Le mode 'brevo-api' n'a besoin que d'une clé API + d'une adresse d'expédition (pas d'hôte/login SMTP).
const isEmailConfigUsable = (config) => {
  if (!config) return false
  if (config.providerPreset === 'brevo-api') {
    return Boolean(config.pass && (config.fromEmail || config.user))
  }
  return Boolean(config.host && config.user && config.pass)
}

// Helper : Envoie un email via la configuration fournie — relais SMTP générique (Nodemailer),
// ou appel direct à l'API REST Brevo (https://api.brevo.com/v3/smtp/email) si providerPreset === 'brevo-api'.
const sendEmailWithConfig = async (config, { to, subject, html, attachments = [] }) => {
  const fromName = config.fromName || 'FamilyGest'
  const fromEmail = config.fromEmail || config.user

  if (config.providerPreset === 'brevo-api') {
    const payload = {
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html
    }
    if (attachments.length > 0) {
      payload.attachment = attachments.map(a => ({
        name: a.filename,
        content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : Buffer.from(a.content).toString('base64')
      }))
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': config.pass,
        'content-type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody.message || `Erreur API Brevo (HTTP ${res.status})`)
    }
    return
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

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
    attachments
  })
}

// Helper : Obtenir la configuration SMTP globale de la plateforme (configuration unique, gérée par le Super Admin)
const getSmtpConfig = async () => {
  try {
    const globalConfig = await GlobalConfig.findOne()
    if (globalConfig && globalConfig.isConfigured && isEmailConfigUsable(globalConfig)) {
      return globalConfig.toObject({ getters: true })
    }
    return null
  } catch (err) {
    console.error('Erreur getSmtpConfig:', err.message)
    return null
  }
}

// Middleware : Résolution et attachement de la famille courante (Multi-tenancy)
const attachFamilyContext = async (req, res, next) => {
  try {
    const slug = req.params.familySlug || req.query.familySlug || req.headers['x-family-slug']
    const familyIdHeader = req.headers['x-family-id']

    let family = null
    if (slug) {
      family = await Family.findOne({ slug: String(slug).toLowerCase().trim() })
    } else if (familyIdHeader) {
      family = await Family.findById(familyIdHeader)
    }

    // Si aucune famille n'est explicitement demandée, fallback vers la première famille active de l'utilisateur
    if (!family && req.user) {
      if (req.user.isSuperAdmin) {
        family = await Family.findOne({ isActive: true }).sort('createdAt')
      } else {
        const memberships = await FamilyMember.find({ userId: req.user.id })
        const familyIds = memberships.map(m => m.familyId)
        family = await Family.findOne({ _id: { $in: familyIds }, isActive: true }).sort('createdAt')
      }
    }

    if (!family) {
      return res.status(404).json({ error: req.t('errors.noActiveFamily') })
    }

    // Vérifier si la famille est désactivée
    if (!family.isActive && !req.user?.isSuperAdmin) {
      return res.status(403).json({ error: req.t('errors.familyDisabled') })
    }

    req.family = family

    // Vérification de l'appartenance
    let membership = await FamilyMember.findOne({ familyId: family._id, userId: req.user.id })

    // Si pas encore membre, vérifier si cet utilisateur a une invitation en attente pour cette famille
    if (!membership && req.user?.email) {
      const pendingInv = await FamilyInvitation.findOne({
        familyId: family._id,
        email: req.user.email.toLowerCase().trim(),
        status: 'pending'
      })
      if (pendingInv) {
        membership = new FamilyMember({
          familyId: family._id,
          userId: req.user.id,
          userRef: req.user._id,
          role: pendingInv.role || 'Administrateur',
          isAdmin: Boolean(pendingInv.isAdmin),
          usualPresence: req.user.usualPresence || 'present'
        })
        await membership.save()
        pendingInv.status = 'accepted'
        await pendingInv.save()
      }
    }

    if (req.user.isSuperAdmin) {
      req.membership = membership || {
        role: 'Super Administrateur',
        isAdmin: true,
        points: 0,
        usualPresence: 'present'
      }
      return next()
    }

    if (!membership) {
      return res.status(403).json({ error: req.t('errors.notInFamily') })
    }

    req.membership = membership
    next()
  } catch (err) {
    console.error('attachFamilyContext error:', err.message)
    res.status(500).json({ error: req.t('errors.familyContext') })
  }
}

const requireFamilyAdmin = (req, res, next) => {
  if (req.user?.isSuperAdmin || req.membership?.isAdmin) {
    return next()
  }
  return res.status(403).json({ error: req.t('errors.familyAdminOnly') })
}

// Helper : Envoi d'email de bienvenue avec token d'activation (durée 2 heures)
const sendWelcomeEmail = async (user, token, lang = user.language) => {
  try {
    const config = await getSmtpConfig()
    if (!config || !config.isConfigured || !isEmailConfigUsable(config)) {
      console.log(`[Email] Configuration SMTP non définie ou incomplète. Email de bienvenue non envoyé à ${user.email}`)
      return { success: false, reason: 'SMTP_NOT_CONFIGURED' }
    }

    const t = translator(lang)
    const baseServerUrl = (config.serverUrl || 'http://localhost:5173').replace(/\/+$/, '')
    const setPasswordUrl = `${baseServerUrl}/set-password?token=${token}`

    const emailHtml = `
        <!DOCTYPE html>
        <html lang="${t.lang}">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${t('email.welcome.title')}</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
            <tr>
              <td style="padding: 32px 28px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 14px; background-color: #6366f1; background: linear-gradient(135deg, #6366f1, #818cf8); font-size: 28px; text-align: center; color: #ffffff;">
                    ✨
                  </div>
                  <h1 style="color: #4338ca; margin: 12px 0 4px 0; font-size: 24px; font-weight: 800;">${t('email.welcome.title')}</h1>
                  <p style="color: #64748b; margin: 0; font-size: 14px;">${t('email.welcome.tagline')}</p>
                </div>

                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 12px; color: #1e293b;">${t('email.greeting', { name: `<strong>${escapeHtml(user.firstName || user.name || t('email.member'))}</strong>` })}</p>
                <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
                  ${t('email.welcome.intro', { email: `<strong style="color: #4f46e5;">${escapeHtml(user.email)}</strong>` })}
                </p>

                <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
                  ${t('email.welcome.instructions')}
                </p>

                <!-- Bulletproof cross-client button -->
                <div style="text-align: center; margin: 32px 0;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${setPasswordUrl}" style="height:50px;v-text-anchor:middle;width:300px;" arcsize="16%" stroke="f" fillcolor="#4f46e5">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:'Segoe UI',sans-serif;font-size:16px;font-weight:bold;">🔐 ${t('email.welcome.button')}</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                    <tr>
                      <td align="center" bgcolor="#4f46e5" style="border-radius: 8px; background-color: #4f46e5; vertical-align: middle;">
                        <a href="${setPasswordUrl}" target="_blank" style="background-color: #4f46e5; border: 14px solid #4f46e5; border-left: 28px solid #4f46e5; border-right: 28px solid #4f46e5; color: #ffffff !important; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; display: inline-block; border-radius: 8px; line-height: 1.2;">
                          🔐 ${t('email.welcome.button')}
                        </a>
                      </td>
                    </tr>
                  </table>
                  <!--<![endif]-->
                </div>

                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;">
                  <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
                    ⏱️ ${t('email.welcome.expiry')}
                  </p>
                </div>

                <p style="font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 24px; line-height: 1.5;">
                  ${t('email.welcome.linkFallback')}<br/>
                  <a href="${setPasswordUrl}" style="color: #6366f1; text-decoration: underline;">${setPasswordUrl}</a>
                </p>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
                  ${t('email.welcome.footer')}
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `

    await sendEmailWithConfig(config, {
      to: user.email,
      subject: `✨ ${t('email.welcome.subject')}`,
      html: emailHtml
    })
    console.log(`[Email] Email de bienvenue envoyé avec succès à ${user.email}`)
    return { success: true, recipients: [{ userId: user.id, name: `${user.firstName || ''} ${user.lastName || ''}`.trim(), email: user.email }] }
  } catch (err) {
    console.error(`[Email] Erreur lors de l'envoi de l'email de bienvenue à ${user.email} :`, err.message)
    return { success: false, error: err.message, recipients: [{ userId: user.id, name: `${user.firstName || ''} ${user.lastName || ''}`.trim(), email: user.email }] }
  }
}

// Helper : Envoi d'email d'invitation à une famille, dans la langue du compte invité s'il existe,
// sinon dans celle de la personne qui invite.
const sendFamilyInvitationEmail = async ({ email, family, invitationToken, isExistingUser, invitedByName, isAdmin = false, lang = null }) => {
  try {
    const config = await getSmtpConfig()
    if (!config || !config.isConfigured || !isEmailConfigUsable(config)) {
      console.log(`[Email] Configuration SMTP non définie ou incomplète. Invitation non envoyée à ${email}`)
      return { success: false, reason: 'SMTP_NOT_CONFIGURED' }
    }

    const t = translator(lang)
    const baseServerUrl = (config.serverUrl || 'http://localhost:5173').replace(/\/+$/, '')
    const invitationUrl = `${baseServerUrl}/invitation/${invitationToken}`

    // Variante du texte : compte existant ou nouveau, invité comme administrateur ou comme membre
    const variant = `${isExistingUser ? 'existing' : 'new'}${isAdmin ? 'Admin' : 'Member'}`
    const familyName = escapeHtml(family.name)
    const inviter = `<strong>${escapeHtml(invitedByName || (isAdmin ? t('email.invitation.defaultSuperAdmin') : t('email.invitation.defaultAdmin')))}</strong>`

    const title = t(`email.invitation.${variant}.title`, { family: family.name })
    const introText = t(`email.invitation.${variant}.intro`, { family: `<strong>${familyName}</strong>`, inviter })
    const buttonText = t(`email.invitation.${variant}.button`, { family: familyName })

    const invitationHtml = `
        <!DOCTYPE html>
        <html lang="${t.lang}">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${escapeHtml(title)}</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
            <tr>
              <td style="padding: 32px 28px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 14px; background-color: #6366f1; background: linear-gradient(135deg, #6366f1, #818cf8); font-size: 28px; text-align: center; color: #ffffff;">
                    🏡
                  </div>
                  <h1 style="color: #4338ca; margin: 12px 0 4px 0; font-size: 22px; font-weight: 800;">${familyName}</h1>
                  <p style="color: #64748b; margin: 0; font-size: 14px;">${t('email.invitation.tagline')}</p>
                </div>

                <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
                  ${t('email.hello')}
                </p>
                <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
                  ${introText}
                </p>

                <div style="text-align: center; margin: 32px 0;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                    <tr>
                      <td align="center" bgcolor="#4f46e5" style="border-radius: 8px; background-color: #4f46e5; vertical-align: middle;">
                        <a href="${invitationUrl}" target="_blank" style="background-color: #4f46e5; border: 14px solid #4f46e5; border-left: 28px solid #4f46e5; border-right: 28px solid #4f46e5; color: #ffffff !important; font-family: 'Segoe UI', sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; display: inline-block; border-radius: 8px; line-height: 1.2;">
                          ${isExistingUser ? '✨' : '🚀'} ${buttonText}
                        </a>
                      </td>
                    </tr>
                  </table>
                </div>

                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;">
                  <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
                    ⏱️ ${t('email.invitation.expiry')}
                  </p>
                </div>

                <p style="font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 24px; line-height: 1.5;">
                  ${t('email.invitation.directLink')}<br/>
                  <a href="${invitationUrl}" style="color: #6366f1; text-decoration: underline;">${invitationUrl}</a>
                </p>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
                  ${t('email.invitation.footer')}
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `

    await sendEmailWithConfig(config, {
      to: email,
      subject: `✨ ${title}`,
      html: invitationHtml
    })
    console.log(`[Email] Invitation envoyée avec succès à ${email} pour la famille ${family.name}`)
    return { success: true, recipients: [{ userId: null, name: email, email }] }
  } catch (err) {
    console.error(`[Email] Erreur lors de l'envoi de l'invitation à ${email} :`, err.message)
    return { success: false, error: err.message, recipients: [{ userId: null, name: email, email }] }
  }
}

// Helpers pour le formatage iCalendar (.ics) et Google Agenda côté serveur
const formatServerEventDates = (dateStr, timeStr, endTimeStr) => {
  if (!dateStr) return { start: '', end: '', isAllDay: true }
  const [year, month, day] = dateStr.split('-').map(Number)
  const pad = (n) => String(n).padStart(2, '0')

  if (timeStr && timeStr.includes(':')) {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const startDate = new Date(year, month - 1, day, hours, minutes, 0)

    let endDate
    if (endTimeStr && endTimeStr.includes(':')) {
      const [endHours, endMinutes] = endTimeStr.split(':').map(Number)
      endDate = new Date(year, month - 1, day, endHours, endMinutes, 0)
      if (endDate <= startDate) endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
    } else {
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
    }

    const formatCompact = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`

    return {
      start: formatCompact(startDate),
      end: formatCompact(endDate),
      isAllDay: false
    }
  } else {
    const start = `${year}${pad(month)}${pad(day)}`
    const nextDay = new Date(year, month - 1, day + 1)
    const end = `${nextDay.getFullYear()}${pad(nextDay.getMonth() + 1)}${pad(nextDay.getDate())}`
    return { start, end, isAllDay: true }
  }
}

const generateServerGoogleCalendarUrl = (event, lang = null) => {
  const t = translator(lang)
  const { start, end } = formatServerEventDates(event.date, event.time, event.endTime)
  const title = encodeURIComponent(event.title || t('calendar.eventFallback'))
  const location = encodeURIComponent(event.location || '')
  let detailsText = t('calendar.eventFallback')
  if (event.category) detailsText += ` (${event.category})`
  const details = encodeURIComponent(detailsText)

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`
}

const generateServerIcsContent = (event, lang = null) => {
  const t = translator(lang)
  const { start, end, isAllDay } = formatServerEventDates(event.date, event.time, event.endTime)
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`

  const uid = `familygest-${event.id || Date.now()}@familygest.local`
  const summary = (event.title || t('calendar.eventFallback')).replace(/[,;\\]/g, ' ')
  const location = (event.location || '').replace(/[,;\\]/g, ' ')
  const description = `${t('calendar.eventFallback')}${event.category ? ' - ' + event.category : ''}`

  let dateLines = isAllDay
    ? `DTSTART;VALUE=DATE:${start}\r\nDTEND;VALUE=DATE:${end}`
    : `DTSTART:${start}\r\nDTEND:${end}`

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FamilyGest//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    dateLines,
    `SUMMARY:${summary}`,
    location ? `LOCATION:${location}` : '',
    `DESCRIPTION:${description}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n')
}

const RECURRENCE_MAX_OCCURRENCES = 200

// Génère la liste des dates (YYYY-MM-DD) d'une série récurrente, en s'arrêtant à endDateStr inclus
// ou dès que maxCount occurrences sont atteintes (truncated=true dans ce dernier cas)
const getRecurrenceDates = (startDateStr, frequency, interval, endDateStr, maxCount = RECURRENCE_MAX_OCCURRENCES) => {
  const [sy, sm, sd] = startDateStr.split('-').map(Number)
  const [ey, em, ed] = endDateStr.split('-').map(Number)
  const end = new Date(Date.UTC(ey, em - 1, ed))
  const step = Math.max(1, Number(interval) || 1)

  const dates = []
  let curr = new Date(Date.UTC(sy, sm - 1, sd))
  let truncated = false

  while (curr <= end) {
    if (dates.length >= maxCount) {
      truncated = true
      break
    }
    const y = curr.getUTCFullYear()
    const m = String(curr.getUTCMonth() + 1).padStart(2, '0')
    const d = String(curr.getUTCDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)

    if (frequency === 'weekly') {
      curr = new Date(Date.UTC(curr.getUTCFullYear(), curr.getUTCMonth(), curr.getUTCDate() + 7 * step))
    } else if (frequency === 'monthly') {
      // Cale sur le même jour du mois de départ, en se calant sur le dernier jour du mois si celui-ci n'existe pas (ex: 31 janvier -> 28/29 février)
      const targetMonthIndex = curr.getUTCMonth() + step
      const daysInTargetMonth = new Date(Date.UTC(curr.getUTCFullYear(), targetMonthIndex + 1, 0)).getUTCDate()
      const targetDay = Math.min(sd, daysInTargetMonth)
      curr = new Date(Date.UTC(curr.getUTCFullYear(), targetMonthIndex, targetDay))
    } else {
      curr = new Date(Date.UTC(curr.getUTCFullYear(), curr.getUTCMonth(), curr.getUTCDate() + step))
    }
  }

  return { dates, truncated }
}

// Helper : Diffusion d'une notification par email aux membres ayant activé cette option
// Les 4 catégories d'alerte pilotées par un simple choix "notifications on/off" à l'onboarding
// (le récapitulatif quotidien n'en fait pas partie : il garde son propre défaut de schéma).
const ONBOARDING_NOTIFICATION_CATEGORIES = ['presence', 'meals', 'tasks', 'taskReminders', 'events']

// Applique uniformément une paire push/email aux 4 catégories d'alerte (utilisé à l'onboarding,
// où l'on ne propose que 2 cases à cocher simples plutôt que la grille complète du profil).
const applyUniformNotificationPreference = (user, push, email) => {
  for (const category of ONBOARDING_NOTIFICATION_CATEGORIES) {
    user.notificationPreferences[category] = { push: Boolean(push), email: Boolean(email) }
  }
}

// Les textes d'une notification (titre, corps, détails…) peuvent être une chaîne ou une fonction
// (t) => chaîne : ils sont alors rédigés pour chaque destinataire, dans la langue de son compte.
// Le libellé de la catégorie d'abonnement (pied de chaque email) est email.categories.<catégorie>.

// Catégories d'abonnement granulaire (User.notificationPreferences)
const NOTIFICATION_CATEGORIES = ['presence', 'meals', 'tasks', 'taskReminders', 'events', 'digest']

const sendNotificationEmail = async ({
  subject: subjectText,
  title: titleText,
  badge = '🔔',
  detailsHtml: detailsText,
  actionUrl = '/',
  actionText: actionLabel = (t) => t('email.layout.defaultAction'),
  excludeUserId = null,
  calendarData: calendarInfo = null,
  familyId = null,
  action = null,
  // Restreint l'envoi à ces comptes (ex : rappel destiné à la seule personne assignée).
  recipientUserIds = null
}) => {
  try {
    const config = await getSmtpConfig()
    if (!config || !config.isConfigured || !isEmailConfigUsable(config)) {
      return { success: false, reason: 'SMTP_NOT_CONFIGURED', count: 0, recipients: [] }
    }

    // Catégorie d'abonnement gouvernant cette alerte (présences/repas/tâches/événements) —
    // résolue depuis le code d'action. `null` pour les envois hors catégorie (ne devrait pas
    // arriver via dispatchFamilyAlert, mais on tombe alors dans un envoi "à tous" par sécurité).
    const category = ACTION_CATEGORY_BY_CODE[action] || null
    const emailPrefField = category ? `notificationPreferences.${category}.email` : 'emailNotificationsEnabled'

    let recipientUsers = []
    let familyName = ''
    if (familyId) {
      const familyDoc = await Family.findById(familyId).select('name slug')
      if (familyDoc) familyName = familyDoc.name

      const memberQuery = { familyId }
      if (excludeUserId) {
        memberQuery.userId = { $ne: Number(excludeUserId) }
      }
      if (recipientUserIds) {
        memberQuery.userId = { ...memberQuery.userId, $in: recipientUserIds.map(Number) }
      }
      const members = await FamilyMember.find(memberQuery)
      const memberUserIds = members.map(m => m.userId)

      // La préférence de notification est désormais uniquement au niveau du compte (User) —
      // FamilyMember ne sert plus qu'à résoudre l'appartenance à la famille.
      recipientUsers = await User.find({
        id: { $in: memberUserIds },
        [emailPrefField]: true
      }).select('email firstName lastName id language')
    } else {
      const userQuery = { [emailPrefField]: true }
      if (excludeUserId) {
        userQuery.id = { $ne: Number(excludeUserId) }
      }
      recipientUsers = await User.find(userQuery).select('email firstName lastName id language')
    }

    if (!recipientUsers || recipientUsers.length === 0) return { success: true, count: 0, recipients: [] }

    const baseServerUrl = (config.serverUrl || 'http://localhost:5173').replace(/\/+$/, '')
    const fullActionUrl = actionUrl.startsWith('http') ? actionUrl : `${baseServerUrl}${actionUrl}`

    const emailPromises = recipientUsers.map(async (recipient) => {
      const t = translator(recipient.language)
      const title = localize(titleText, t)
      const subject = localize(subjectText, t)
      const detailsHtml = localize(detailsText, t)
      const actionText = localize(actionLabel, t)
      const calendarData = localize(calendarInfo, t)
      const finalSubject = familyName ? `[${familyName}] ${subject || title}` : (subject || `✨ FamilyGest - ${title}`)

      const notificationAttachments = (calendarData && calendarData.icsContent) ? [
        {
          filename: `${(calendarData.eventTitle || 'evenement').replace(/[^a-zA-Z0-9]/g, '_')}.ics`,
          content: calendarData.icsContent,
          contentType: 'text/calendar; charset=utf-8; method=REQUEST'
        }
      ] : []

      const notificationHtml = `
          <!DOCTYPE html>
          <html lang="${t.lang}">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
          </head>
          <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              <tr>
                <td style="padding: 32px 28px;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; width: 54px; height: 54px; line-height: 54px; border-radius: 14px; background-color: #6366f1; background: linear-gradient(135deg, #6366f1, #8b5cf6); font-size: 26px; text-align: center; color: #ffffff;">
                      ${badge}
                    </div>
                    <h1 style="color: #312e81; margin: 14px 0 4px 0; font-size: 22px; font-weight: 800;">${title}</h1>
                    <p style="color: #64748b; margin: 0; font-size: 13px;">${t('email.layout.notificationFrom', { family: escapeHtml(familyName || t('email.layout.familySpace')) })}</p>
                  </div>

                  <p style="font-size: 15px; line-height: 1.5; color: #1e293b; margin-bottom: 16px;">
                    ${t('email.greeting', { name: `<strong>${escapeHtml(recipient.firstName || t('email.member'))}</strong>` })}
                  </p>

                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">
                    ${detailsHtml}
                  </div>

                  <!-- Boutons d'export vers agenda personnel si disponible -->
                  ${calendarData ? `
                    <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px 18px; margin: 20px 0; text-align: center;">
                      <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #334155;">
                        📅 ${t('email.layout.addToCalendar')}
                      </p>
                      <div>
                        <a href="${calendarData.googleUrl}" target="_blank" style="display: inline-block; background-color: #4285f4; color: #ffffff !important; padding: 9px 16px; border-radius: 6px; font-size: 13px; font-weight: 700; text-decoration: none; margin: 4px 6px;">
                          🌐 Google Agenda
                        </a>
                        <a href="${calendarData.icsUrl}" target="_blank" style="display: inline-block; background-color: #8b5cf6; color: #ffffff !important; padding: 9px 16px; border-radius: 6px; font-size: 13px; font-weight: 700; text-decoration: none; margin: 4px 6px;">
                          🍏 Apple / Outlook (.ics)
                        </a>
                      </div>
                    </div>
                  ` : ''}

                  <!-- Bouton d'action principal -->
                  <div style="text-align: center; margin: 24px 0;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                      <tr>
                        <td align="center" bgcolor="#4f46e5" style="border-radius: 8px; background-color: #4f46e5; vertical-align: middle;">
                          <a href="${fullActionUrl}" target="_blank" style="background-color: #4f46e5; border: 12px solid #4f46e5; border-left: 24px solid #4f46e5; border-right: 24px solid #4f46e5; color: #ffffff !important; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 15px; font-weight: bold; text-decoration: none; display: inline-block; border-radius: 8px; line-height: 1.2;">
                            ${actionText}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                  <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.4;">
                    ${t('email.layout.whyReceived', { category: category ? t(`email.categories.${category}`) : 'FamilyGest' })}<br/>
                    ${t('email.layout.managePreferences')}
                  </p>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `

      return sendEmailWithConfig(config, {
        to: recipient.email,
        subject: finalSubject,
        html: notificationHtml,
        attachments: notificationAttachments
      })
    })

    await Promise.allSettled(emailPromises)
    console.log(`[Email] Notification email envoyée à ${recipientUsers.length} membre(s) : "${localize(titleText, translator(DEFAULT_LANGUAGE))}"`)
    return {
      success: true,
      count: recipientUsers.length,
      recipients: recipientUsers.map(u => ({ userId: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim(), email: u.email }))
    }
  } catch (err) {
    console.error('[Email] Erreur sendNotificationEmail:', err.message)
    return { success: false, error: err.message, count: 0, recipients: [] }
  }
}

// Helper : Validation de sécurité renforcée du mot de passe
// Règle : 10 caractères minimum, au moins 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial.
const validatePasswordSecurity = (password, t) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: t('errors.password.required') }
  }
  if (password.length < 10) {
    return { valid: false, error: t('errors.password.length') }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: t('errors.password.uppercase') }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: t('errors.password.lowercase') }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: t('errors.password.digit') }
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: t('errors.password.special') }
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
const sendPushNotification = async ({
  title: titleText,
  body: bodyText,
  url = '/',
  excludeUserId = null,
  actions: actionsSpec = [],
  googleCalendarUrl: googleCalendarSpec = null,
  familyId = null,
  action = null,
  // Restreint l'envoi à ces comptes (ex : rappel destiné à la seule personne assignée).
  recipientUserIds = null
}) => {
  try {
    if (!vapidPublicKey || !vapidPrivateKey) return { success: false, reason: 'PUSH_NOT_CONFIGURED', count: 0, recipients: [] }

    const category = ACTION_CATEGORY_BY_CODE[action] || null
    const pushPrefField = category ? `notificationPreferences.${category}.push` : 'pushNotificationsEnabled'

    let userIds = []
    let familyName = ''
    if (familyId) {
      const familyDoc = await Family.findById(familyId).select('name slug')
      if (familyDoc) familyName = familyDoc.name

      // FamilyMember ne sert plus qu'à résoudre l'appartenance à la famille — la préférence de
      // notification est désormais uniquement au niveau du compte (User), vérifiée ci-dessous.
      const memberQuery = { familyId }
      if (excludeUserId) {
        memberQuery.userId = { $ne: Number(excludeUserId) }
      }
      if (recipientUserIds) {
        memberQuery.userId = { ...memberQuery.userId, $in: recipientUserIds.map(Number) }
      }
      const eligibleMembers = await FamilyMember.find(memberQuery).select('userId')
      userIds = eligibleMembers.map(m => m.userId)
    } else {
      const userQuery = {}
      if (excludeUserId) {
        userQuery.id = { $ne: Number(excludeUserId) }
      }
      const eligibleUsers = await User.find(userQuery).select('id')
      userIds = eligibleUsers.map(u => u.id)
    }

    if (userIds.length === 0) return { success: false, reason: 'NO_ELIGIBLE_MEMBERS', count: 0, recipients: [] }

    const activeUsers = await User.find({ id: { $in: userIds }, [pushPrefField]: true }).select('id firstName lastName language')
    const finalUserIds = activeUsers.map(u => u.id)
    if (finalUserIds.length === 0) return { success: false, reason: 'NO_ELIGIBLE_MEMBERS', count: 0, recipients: [] }

    const subscriptions = await PushSubscription.find({ userId: { $in: finalUserIds } })
    if (subscriptions.length === 0) return { success: false, reason: 'NO_SUBSCRIPTIONS', count: 0, recipients: [] }

    // Contenu rédigé une fois par langue, puis envoyé à chaque appareil selon la langue de son compte
    const tag = `familygest-${Date.now()}`
    const payloads = new Map()
    const payloadFor = (language) => {
      const t = translator(language)
      if (!payloads.has(t.lang)) {
        const title = localize(titleText, t)
        payloads.set(t.lang, JSON.stringify({
          title: familyName ? `[${familyName}] ${title}` : title,
          body: localize(bodyText, t),
          url,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag,
          actions: localize(actionsSpec, t),
          googleCalendarUrl: localize(googleCalendarSpec, t)
        }))
      }
      return payloads.get(t.lang)
    }
    const languageByUserId = new Map(activeUsers.map(u => [u.id, u.language]))

    const deliveredUserIds = new Set()

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        }, payloadFor(languageByUserId.get(sub.userId)))
        deliveredUserIds.add(sub.userId)
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

    const recipients = activeUsers
      .filter(u => deliveredUserIds.has(u.id))
      .map(u => ({ userId: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim(), email: '' }))

    return { success: recipients.length > 0, count: recipients.length, recipients }
  } catch (err) {
    console.error('[WebPush] Erreur sendPushNotification:', err.message)
    return { success: false, error: err.message, count: 0, recipients: [] }
  }
}

// === JOURNAL DES ALERTES (push, email) — consulté depuis la console Super Admin ===

// Normalise le résultat d'un helper d'envoi (push ou email) en une entrée de canal journalisée
const toAlertChannelLog = (type, result) => {
  if (!result) return null
  const recipients = Array.isArray(result.recipients) ? result.recipients : []
  const status = recipients.length > 0 ? 'sent' : (result.reason ? 'skipped' : (result.success === false ? 'error' : 'skipped'))
  return {
    type,
    status,
    recipientCount: recipients.length,
    recipients,
    reason: result.reason || result.error || null
  }
}

// Écrit une entrée dans le journal des alertes. Ne doit jamais faire échouer l'appelant.
const logAlertEntry = async ({ family = null, actor = null, action, actionLabel, title = '', targetType = null, targetId = null, channels = [] }) => {
  try {
    await AlertLog.create({
      familyId: family?._id || null,
      familyName: family?.name || null,
      actorUserId: actor?.id ?? null,
      actorName: actor ? `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || 'Membre' : 'Système',
      action,
      actionLabel,
      title,
      targetType,
      targetId: targetId != null ? String(targetId) : null,
      channels: channels.filter(Boolean)
    })
  } catch (err) {
    console.error('[AlertLog] Erreur journalisation alerte:', err.message)
  }
}

// Diffuse une alerte push + email à une famille et journalise le résultat des deux canaux.
// Appelé en tâche de fond (sans await côté route) pour ne pas retarder la réponse HTTP.
const dispatchFamilyAlert = async ({ family, actor = null, action, actionLabel, title = '', targetType = null, targetId = null, push = null, email = null }) => {
  // Le titre journalisé (console Super Admin) reste en français, comme le reste du journal.
  const logTitle = localize(title, translator(DEFAULT_LANGUAGE))
  const [pushResult, emailResult] = await Promise.all([
    push ? sendPushNotification({ ...push, action, familyId: family._id, excludeUserId: actor?.id ?? null }) : Promise.resolve(null),
    email ? sendNotificationEmail({ ...email, action, familyId: family._id, excludeUserId: actor?.id ?? null }) : Promise.resolve(null)
  ])

  await logAlertEntry({
    family,
    actor,
    action,
    actionLabel,
    title: logTitle,
    targetType,
    targetId,
    channels: [toAlertChannelLog('push', pushResult), toAlertChannelLog('email', emailResult)]
  })
}

// GET /api/push/vapid-public-key (Obtenir la clé publique pour le client web)
app.get('/api/push/vapid-public-key', (req, res) => {
  if (!vapidPublicKey) {
    return res.status(503).json({ error: req.t('errors.pushNotInitialized') })
  }
  res.json({ publicKey: vapidPublicKey })
})

// POST /api/push/subscribe (Enregistrer une souscription push)
app.post('/api/push/subscribe', requireAuth, async (req, res) => {
  try {
    const { subscription, userAgent } = req.body
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: req.t('errors.invalidSubscription') })
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

    res.json({ success: true, message: req.t('messages.pushSubscribed') })
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
      await PushSubscription.deleteOne({ endpoint, userId })
    } else {
      await PushSubscription.deleteMany({ userId })
    }

    res.json({ success: true, message: req.t('messages.pushUnsubscribed') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === AUTHENTICATION ROUTES ===

// POST /api/auth/login (Connexion par email & mot de passe)
app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: req.t('errors.emailPasswordRequired') })
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return res.status(401).json({ error: req.t('errors.invalidCredentials') })
    }

    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({ error: req.t('errors.invalidCredentials') })
    }

    await User.updateOne({ id: user.id }, { $set: { lastLogin: new Date() } })
    const token = generateToken(user.id, user.email, user.isAdmin, user.isSuperAdmin)

    // Auto-rattachement des invitations en attente pour cet utilisateur
    const pendingInvs = await FamilyInvitation.find({ email: user.email.toLowerCase().trim(), status: 'pending' })
    for (const inv of pendingInvs) {
      const already = await FamilyMember.findOne({ familyId: inv.familyId, userId: user.id })
      if (!already) {
        const m = new FamilyMember({
          familyId: inv.familyId,
          userId: user.id,
          userRef: user._id,
          role: inv.role || 'Membre',
          isAdmin: Boolean(inv.isAdmin),
          usualPresence: user.usualPresence || 'present'
        })
        await m.save()
      }
      inv.status = 'accepted'
      await inv.save()
    }

    // Récupérer les familles de l'utilisateur
    const memberships = await FamilyMember.find({ userId: user.id })
    const familyIds = memberships.map(m => m.familyId)
    const families = await Family.find({ _id: { $in: familyIds }, isActive: true })

    const familiesData = families.map(f => {
      const mem = memberships.find(m => m.familyId.toString() === f._id.toString())
      return {
        _id: f._id,
        name: f.name,
        slug: f.slug,
        maxMembers: f.maxMembers,
        role: mem ? mem.role : 'Membre',
        isAdmin: mem ? mem.isAdmin : false
      }
    })

    if (user.isSuperAdmin) {
      const allActive = await Family.find({ isActive: true })
      for (const f of allActive) {
        if (!familiesData.some(fd => fd._id.toString() === f._id.toString())) {
          familiesData.push({
            _id: f._id,
            name: f.name,
            slug: f.slug,
            maxMembers: f.maxMembers,
            role: 'Super Admin',
            isAdmin: true
          })
        }
      }
    }

    res.json({
      token,
      families: familiesData,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isAdmin: user.isAdmin,
        isSuperAdmin: Boolean(user.isSuperAdmin),
        role: user.role,
        avatar: user.avatar,
        color: user.color,
        points: user.points,
        notificationPreferences: user.notificationPreferences,
        language: user.language || null,
        usualPresence: user.usualPresence || 'present',
        families: familiesData
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
    const token = generateToken(user.id, user.email, user.isAdmin, user.isSuperAdmin)

    // Récupérer les familles de l'utilisateur
    const memberships = await FamilyMember.find({ userId: user.id })
    const familyIds = memberships.map(m => m.familyId)
    const families = await Family.find({ _id: { $in: familyIds }, isActive: true })

    const familiesData = families.map(f => {
      const mem = memberships.find(m => m.familyId.toString() === f._id.toString())
      return {
        _id: f._id,
        name: f.name,
        slug: f.slug,
        maxMembers: f.maxMembers,
        role: mem ? mem.role : 'Membre',
        isAdmin: mem ? mem.isAdmin : false
      }
    })

    if (user.isSuperAdmin) {
      const allActive = await Family.find({ isActive: true })
      for (const f of allActive) {
        if (!familiesData.some(fd => fd._id.toString() === f._id.toString())) {
          familiesData.push({
            _id: f._id,
            name: f.name,
            slug: f.slug,
            maxMembers: f.maxMembers,
            role: 'Super Admin',
            isAdmin: true
          })
        }
      }
    }

    res.json({
      token,
      families: familiesData,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isAdmin: user.isAdmin,
        isSuperAdmin: Boolean(user.isSuperAdmin),
        role: user.role,
        avatar: user.avatar,
        color: user.color,
        points: user.points,
        notificationPreferences: user.notificationPreferences,
        language: user.language || null,
        usualPresence: user.usualPresence || 'present',
        families: familiesData
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/register (Création d'un membre/utilisateur - Réservé au Super Administrateur)
app.post('/api/auth/register', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, avatar, color, isAdmin } = req.body

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: req.t('errors.registerFieldsRequired') })
    }

    const pwdCheck = validatePasswordSecurity(password, req.t)
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.error })
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
    if (existingUser) {
      return res.status(400).json({ error: req.t('errors.userEmailExists') })
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
    sendWelcomeEmail(newUser, welcomeToken, newUser.language || req.lang)
      .then(result => logAlertEntry({
        family: null,
        actor: req.user,
        action: ALERT_ACTIONS.MEMBER_WELCOME.code,
        actionLabel: ALERT_ACTIONS.MEMBER_WELCOME.label,
        title: `Email de bienvenue : ${newUser.firstName} ${newUser.lastName}`,
        targetType: 'user',
        targetId: newUser.id,
        channels: [toAlertChannelLog('email', result)]
      }))
      .catch(err => console.error('[AlertLog] sendWelcomeEmail (register):', err.message))

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
      return res.status(400).json({ valid: false, error: req.t('errors.tokenMissing') })
    }

    const user = await User.findOne({
      welcomeToken: token,
      welcomeTokenExpires: { $gt: new Date() }
    })

    if (!user) {
      return res.status(400).json({ 
        valid: false, 
        error: req.t('errors.welcomeLinkExpiredContact') 
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
app.post('/api/auth/set-password', authRateLimiter, async (req, res) => {
  try {
    const { token, password, notificationPreferences, language } = req.body
    if (!token || !password) {
      return res.status(400).json({ error: req.t('errors.tokenPasswordRequired') })
    }

    const pwdCheck = validatePasswordSecurity(password, req.t)
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.error })
    }

    const user = await User.findOne({
      welcomeToken: token,
      welcomeTokenExpires: { $gt: new Date() }
    })

    if (!user) {
      return res.status(400).json({ 
        error: req.t('errors.welcomeLinkExpired') 
      })
    }

    // Le hook pre('save') de Mongoose hashera automatiquement le mot de passe
    user.password = password
    user.welcomeToken = null
    user.welcomeTokenExpires = null
    // Choix d'onboarding simplifié (2 cases à cocher) appliqué uniformément aux 4 catégories
    // d'alerte ; le récapitulatif quotidien garde son propre défaut de schéma.
    if (notificationPreferences && typeof notificationPreferences === 'object') {
      applyUniformNotificationPreference(user, notificationPreferences.push, notificationPreferences.email)
    }
    // Langue affichée pendant l'activation du compte, si l'utilisateur n'en a pas encore choisi
    const signupLanguage = normalizeLanguage(language)
    if (signupLanguage && !user.language) user.language = signupLanguage
    await user.save()

    const jwtToken = generateToken(user.id, user.email, user.isAdmin)

    res.json({
      success: true,
      message: req.t('messages.passwordSaved'),
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
        notificationPreferences: user.notificationPreferences,
        language: user.language || null,
        usualPresence: user.usualPresence || 'present'
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
    if (!user) return res.status(404).json({ error: req.t('errors.userNotFound') })

    const { firstName, lastName, email, password, role, avatar, color, notificationPreferences, language } = req.body

    if (firstName) user.firstName = firstName.trim()
    if (lastName) user.lastName = lastName.trim()
    if (role) user.role = role
    if (avatar) user.avatar = avatar
    if (color) user.color = color
    if (language !== undefined) {
      const normalized = normalizeLanguage(language)
      if (!normalized) return res.status(400).json({ error: req.t('errors.unsupportedLanguage') })
      user.language = normalized
    }

    // La présence habituelle n'est volontairement PAS modifiable ici. User.usualPresence n'est
    // qu'une GRAINE, recopiée dans FamilyMember à la création d'une adhésion ; la source de
    // vérité fonctionnelle est FamilyMember.usualPresence / usualPresenceConfig, qui est propre
    // à chaque famille. Cette route écrivait autrefois User.usualPresence seul, si bien que le
    // réglage depuis le profil n'avait aucun effet sur les repas. Pour régler sa présence, voir
    // PUT /api/members/:id/usual-presence, qui est accessible à chaque membre pour lui-même.

    // Préférences de notification granulaires (6 catégories × push/email), gérées uniquement
    // par l'utilisateur pour son propre compte — valables sur toutes ses familles.
    if (notificationPreferences && typeof notificationPreferences === 'object') {
      for (const category of NOTIFICATION_CATEGORIES) {
        const incoming = notificationPreferences[category]
        if (incoming && typeof incoming === 'object') {
          if (incoming.push !== undefined) user.notificationPreferences[category].push = Boolean(incoming.push)
          if (incoming.email !== undefined) user.notificationPreferences[category].email = Boolean(incoming.email)
        }
      }
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() })
      if (existing && existing.id !== user.id) {
        return res.status(400).json({ error: req.t('errors.emailTaken') })
      }
      user.email = email.toLowerCase().trim()
    }

    if (password && password.trim().length > 0) {
      const pwdCheck = validatePasswordSecurity(password.trim(), req.t)
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
      notificationPreferences: user.notificationPreferences,
      language: user.language || null,
      usualPresence: user.usualPresence || 'present'
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/auth/export (Export RGPD des données personnelles du compte connecté — droit à la portabilité)
app.get('/api/auth/export', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select('-password').lean()
    if (!user) return res.status(404).json({ error: req.t('errors.userNotFound') })

    const memberships = await FamilyMember.find({ userId: user.id }).lean()
    const families = await Family.find({ _id: { $in: memberships.map(m => m.familyId) } }).lean()
    const familyById = Object.fromEntries(families.map(f => [String(f._id), f]))

    const [tasks, events, absences, mealGuests] = await Promise.all([
      Task.find({ assignedTo: user.id }).lean(),
      Event.find({ $or: [{ assignedTo: user.id }, { memberIds: user.id }] }).lean(),
      Absence.find({ $or: [{ memberId: user.id }, { declaredBy: user.id }] }).lean(),
      MealGuest.find({ invitedBy: user.id }).lean()
    ])

    res.json({
      version: '1.0',
      exportDate: new Date().toISOString(),
      source: 'familygest-mono',
      profile: user,
      memberships: memberships.map(m => ({
        familyName: familyById[String(m.familyId)]?.name || null,
        familySlug: familyById[String(m.familyId)]?.slug || null,
        role: m.role,
        isAdmin: m.isAdmin,
        usualPresence: m.usualPresence,
        usualPresenceConfig: normalizeUsualPresenceConfig(m.usualPresenceConfig, m.usualPresence),
        points: m.points,
        createdAt: m.createdAt
      })),
      tasks,
      events,
      absences,
      mealGuests
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/auth/account (Suppression définitive du compte connecté — droit à l'effacement)
app.delete('/api/auth/account', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id })
    if (!user) return res.status(404).json({ error: req.t('errors.userNotFound') })

    if (user.isSuperAdmin) {
      return res.status(400).json({ error: req.t('errors.superAdminSelfDelete') })
    }

    const { password } = req.body
    if (!password || !(await user.matchPassword(password))) {
      return res.status(401).json({ error: req.t('errors.wrongPassword') })
    }

    await FamilyMember.deleteMany({ userId: user.id })
    await FamilyInvitation.deleteMany({ email: user.email })
    await PushSubscription.deleteMany({ userId: user.id })
    await User.deleteOne({ id: user.id })

    res.json({ message: req.t('messages.accountDeleted') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === CONTENU LÉGAL (mentions légales, politique de confidentialité) ===

// GET /api/legal (Public, sans authentification : affiché sur /mentions-legales et /confidentialite)
app.get('/api/legal', async (req, res) => {
  try {
    const config = await GlobalConfig.findOne()
    res.json({
      legalNotice: config?.legalNotice || GlobalConfig.schema.path('legalNotice').defaultValue,
      privacyPolicy: config?.privacyPolicy || GlobalConfig.schema.path('privacyPolicy').defaultValue
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === SUPER ADMIN ROUTES ===

// GET /api/super-admin/diagnostics/ip (Vérification de la config TRUST_PROXY derrière un reverse
// proxy : compare l'IP résolue par Express à l'en-tête X-Forwarded-For brut reçu du proxy)
app.get('/api/super-admin/diagnostics/ip', requireAuth, requireSuperAdmin, (req, res) => {
  res.json({
    trustProxySetting: app.get('trust proxy'),
    resolvedIp: req.ip,
    resolvedIpChain: req.ips,
    rawXForwardedFor: req.headers['x-forwarded-for'] || null,
    rawXForwardedProto: req.headers['x-forwarded-proto'] || null,
    socketRemoteAddress: req.socket.remoteAddress
  })
})

// GET /api/super-admin/families (Liste de toutes les familles et quotas)
app.get('/api/super-admin/families', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const families = await Family.find().sort({ createdAt: -1 })
    const familiesWithStats = await Promise.all(families.map(async (f) => {
      const memberCount = await FamilyMember.countDocuments({ familyId: f._id })
      return {
        _id: f._id,
        name: f.name,
        slug: f.slug,
        maxMembers: f.maxMembers,
        isActive: f.isActive,
        createdAt: f.createdAt,
        memberCount
      }
    }))
    res.json(familiesWithStats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/super-admin/check-slug/:slug (Vérifie en temps réel si un slug est disponible)
app.get('/api/super-admin/check-slug/:slug', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const slug = String(req.params.slug).toLowerCase().trim()
    const reservedSlugs = ['admin', 'superadmin', 'super-admin', 'api', 'login', 'set-password', 'invitation', 'settings', 'dashboard', 'tasks', 'calendar', 'absences', 'shopping', 'meals', 'select-family']
    if (reservedSlugs.includes(slug)) {
      return res.json({ available: false, reason: req.t('errors.slugReserved') })
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.json({ available: false, reason: req.t('errors.slugFormat') })
    }
    const filter = { slug }
    if (req.query.excludeId) {
      filter._id = { $ne: req.query.excludeId }
    }
    const existing = await Family.findOne(filter)
    res.json({ available: !existing, reason: existing ? req.t('errors.slugTakenOther') : null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/super-admin/check-email (Vérifie si un email existe déjà dans l'application)
app.get('/api/super-admin/check-email', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const email = String(req.query.email || '').toLowerCase().trim()
    if (!email) return res.status(400).json({ error: req.t('errors.emailRequired') })
    const user = await User.findOne({ email }).select('id firstName lastName email avatar color')
    if (user) {
      return res.json({ exists: true, user })
    }
    res.json({ exists: false })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/super-admin/families (Création d'une famille par le Super Admin)
app.post('/api/super-admin/families', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { name, slug, maxMembers, adminEmail, adminFirstName, adminLastName } = req.body

    if (!name || !slug || !adminEmail) {
      return res.status(400).json({ error: req.t('errors.createFamilyFieldsRequired') })
    }

    const cleanSlug = String(slug).toLowerCase().trim()
    if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
      return res.status(400).json({ error: req.t('errors.slugFormat') })
    }

    const reservedSlugs = ['admin', 'superadmin', 'super-admin', 'api', 'login', 'set-password', 'invitation', 'settings', 'select-family']
    if (reservedSlugs.includes(cleanSlug)) {
      return res.status(400).json({ error: req.t('errors.slugReserved') })
    }

    const slugExists = await Family.findOne({ slug: cleanSlug })
    if (slugExists) {
      return res.status(400).json({ error: req.t('errors.slugTaken') })
    }

    const family = new Family({
      name: name.trim(),
      slug: cleanSlug,
      maxMembers: Number(maxMembers) || 10,
      isActive: true
    })
    await family.save()

    const cleanEmail = adminEmail.toLowerCase().trim()
    const existingUser = await User.findOne({ email: cleanEmail })

    if (existingUser) {
      // Compte existant : rattacher directement l'utilisateur comme administrateur de la famille
      const newMember = new FamilyMember({
        familyId: family._id,
        userId: existingUser.id,
        userRef: existingUser._id,
        role: 'Administrateur',
        isAdmin: true,
        usualPresence: existingUser.usualPresence || 'present'
      })
      await newMember.save()
    }

    // Initialiser les catégories de courses par défaut
    const catDocs = DEFAULT_CATEGORIES.map((c, i) => ({ ...c, familyId: family._id, id: Date.now() + i }))
    await ShoppingCategory.insertMany(catDocs)

    // Initialiser 2 tâches d'accueil pour la nouvelle famille, dans la langue de son administrateur
    const seedT = translator(existingUser?.language || req.lang)
    await Task.insertMany([
      {
        id: Date.now(),
        familyId: family._id,
        title: seedT('seed.inviteMembers.title'),
        description: seedT('seed.inviteMembers.description'),
        category: 'Organisation',
        assignedTo: existingUser ? existingUser.id : null,
        priority: 'Haute',
        points: 10,
        completed: false,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        id: Date.now() + 1,
        familyId: family._id,
        title: seedT('seed.discover.title'),
        description: seedT('seed.discover.description'),
        category: 'Maison',
        assignedTo: existingUser ? existingUser.id : null,
        priority: 'Moyenne',
        points: 5,
        completed: false,
        dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    ])

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours

    const invitation = new FamilyInvitation({
      token,
      familyId: family._id,
      email: cleanEmail,
      role: 'Administrateur',
      isAdmin: true,
      invitedBy: req.user.id,
      firstName: (existingUser ? existingUser.firstName : adminFirstName) || '',
      lastName: (existingUser ? existingUser.lastName : adminLastName) || '',
      status: existingUser ? 'accepted' : 'pending',
      expiresAt
    })
    await invitation.save()

    // Envoi de l'email via SMTP Global
    const inviteResult = await sendFamilyInvitationEmail({
      email: cleanEmail,
      family,
      invitationToken: token,
      isExistingUser: Boolean(existingUser),
      invitedByName: `${req.user.firstName} ${req.user.lastName}`,
      isAdmin: true,
      lang: existingUser?.language || req.lang
    })
    logAlertEntry({
      family,
      actor: req.user,
      action: ALERT_ACTIONS.FAMILY_ADMIN_INVITED.code,
      actionLabel: ALERT_ACTIONS.FAMILY_ADMIN_INVITED.label,
      title: `Invitation administrateur : ${cleanEmail}`,
      targetType: 'invitation',
      targetId: invitation.token,
      channels: [toAlertChannelLog('email', inviteResult)]
    }).catch(err => console.error('[AlertLog] sendFamilyInvitationEmail (create family):', err.message))

    res.status(201).json({
      family,
      invitation: {
        token,
        email: cleanEmail,
        isExistingUser: Boolean(existingUser)
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/super-admin/families/:id/invite-admin (Inviter un nouvel administrateur familial pour une famille)
app.post('/api/super-admin/families/:id/invite-admin', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const family = await Family.findById(req.params.id)
    if (!family) {
      return res.status(404).json({ error: req.t('errors.familyNotFound') })
    }

    const { email, firstName, lastName } = req.body
    if (!email) {
      return res.status(400).json({ error: req.t('errors.emailRequired') })
    }

    const cleanEmail = String(email).toLowerCase().trim()
    const existingUser = await User.findOne({ email: cleanEmail })

    if (existingUser) {
      let existingMember = await FamilyMember.findOne({ familyId: family._id, userId: existingUser.id })
      if (existingMember && existingMember.isAdmin) {
        return res.status(400).json({
          error: req.t('errors.alreadyAdmin', { name: `${existingUser.firstName || ''} ${existingUser.lastName || ''}`.trim(), email: cleanEmail, family: family.name })
        })
      }
      if (!existingMember) {
        existingMember = new FamilyMember({
          familyId: family._id,
          userId: existingUser.id,
          userRef: existingUser._id,
          role: 'Administrateur',
          isAdmin: true,
          usualPresence: existingUser.usualPresence || 'present'
        })
        await existingMember.save()
      } else {
        existingMember.isAdmin = true
        existingMember.role = 'Administrateur'
        await existingMember.save()
      }
    } else {
      if (!firstName || !firstName.trim()) {
        return res.status(400).json({ error: req.t('errors.firstNameRequired') })
      }
    }

    // Supprimer les invitations en attente précédentes pour cet email dans cette famille
    await FamilyInvitation.deleteMany({ familyId: family._id, email: cleanEmail, status: 'pending' })

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours

    const invitation = new FamilyInvitation({
      token,
      familyId: family._id,
      email: cleanEmail,
      role: 'Administrateur',
      isAdmin: true,
      invitedBy: req.user.id,
      firstName: (existingUser ? existingUser.firstName : firstName) || '',
      lastName: (existingUser ? existingUser.lastName : lastName) || '',
      status: existingUser ? 'accepted' : 'pending',
      expiresAt
    })
    await invitation.save()

    // Envoi de l'email via SMTP
    const emailResult = await sendFamilyInvitationEmail({
      email: cleanEmail,
      family,
      invitationToken: token,
      isExistingUser: Boolean(existingUser),
      invitedByName: `${req.user.firstName} ${req.user.lastName}`,
      isAdmin: true,
      lang: existingUser?.language || req.lang
    })
    logAlertEntry({
      family,
      actor: req.user,
      action: ALERT_ACTIONS.FAMILY_ADMIN_INVITED.code,
      actionLabel: ALERT_ACTIONS.FAMILY_ADMIN_INVITED.label,
      title: `Invitation administrateur : ${cleanEmail}`,
      targetType: 'invitation',
      targetId: invitation.token,
      channels: [toAlertChannelLog('email', emailResult)]
    }).catch(err => console.error('[AlertLog] sendFamilyInvitationEmail (invite-admin):', err.message))

    res.status(201).json({
      message: req.t('messages.adminInvitationSent', { email: cleanEmail }),
      emailSent: Boolean(emailResult?.success),
      invitation: {
        token,
        email: cleanEmail,
        isExistingUser: Boolean(existingUser)
      }
    })
  } catch (err) {
    console.error('Erreur invite-admin:', err)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/super-admin/families/:id (Modification d'une famille / nom / slug / quota)
app.put('/api/super-admin/families/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const family = await Family.findById(req.params.id)
    if (!family) return res.status(404).json({ error: req.t('errors.familyNotFound') })

    const { name, slug, maxMembers, isActive } = req.body

    if (name !== undefined) {
      const cleanName = String(name).trim()
      if (!cleanName) return res.status(400).json({ error: req.t('errors.familyNameEmpty') })
      family.name = cleanName
    }

    if (slug !== undefined) {
      const cleanSlug = String(slug).toLowerCase().trim()
      if (!cleanSlug) return res.status(400).json({ error: req.t('errors.slugEmpty') })
      if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
        return res.status(400).json({ error: req.t('errors.slugFormat') })
      }
      const reservedSlugs = ['admin', 'superadmin', 'super-admin', 'api', 'login', 'set-password', 'invitation', 'settings', 'dashboard', 'tasks', 'calendar', 'absences', 'shopping', 'meals', 'select-family']
      if (reservedSlugs.includes(cleanSlug)) {
        return res.status(400).json({ error: req.t('errors.slugReserved') })
      }
      const existing = await Family.findOne({ slug: cleanSlug, _id: { $ne: family._id } })
      if (existing) {
        return res.status(400).json({ error: req.t('errors.slugTakenOther') })
      }
      family.slug = cleanSlug
    }

    if (maxMembers !== undefined) family.maxMembers = Number(maxMembers)
    if (isActive !== undefined) family.isActive = Boolean(isActive)

    await family.save()
    res.json(family)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/super-admin/families/:id/import (Importer des données JSON dans une famille)
app.post('/api/super-admin/families/:id/import', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const family = await Family.findById(req.params.id)
    if (!family) return res.status(404).json({ error: req.t('errors.familyNotFound') })

    const payload = req.body.data || req.body
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: req.t('errors.invalidImport') })
    }

    const {
      users = [],
      tasks = [],
      shoppingItems = [],
      shoppingCategories = [],
      absences = [],
      mealGuests = [],
      shortcuts = [],
      events = [],
      meals = []
    } = payload

    // 1. Traitement des utilisateurs : mapping oldId -> targetUser.id & targetUser._id
    const idMap = {}
    const userRefMap = {}

    for (const u of users) {
      if (!u.email) continue
      const cleanEmail = u.email.toLowerCase().trim()
      let user = await User.findOne({ email: cleanEmail })

      if (!user) {
        // Obtenir le prochain ID utilisateur
        const maxUser = await User.findOne().sort({ id: -1 })
        const nextId = (maxUser?.id || 0) + 1

        user = new User({
          id: nextId,
          firstName: u.firstName || 'Membre',
          lastName: u.lastName || '',
          email: cleanEmail,
          password: u.password, // le hash bcrypt ne sera pas ré-encodé
          isAdmin: false,
          isSuperAdmin: false,
          role: u.role || 'Membre',
          avatar: u.avatar || '👤',
          color: u.color || '#6366f1',
          points: u.points || 0,
          usualPresence: u.usualPresence || 'present',
          ...(u.notificationPreferences ? { notificationPreferences: u.notificationPreferences } : {})
        })
        await user.save()
      }

      if (u.id !== undefined) {
        idMap[u.id] = user.id
        userRefMap[u.id] = user._id
      }
    }

    // 2. Écraser les données existantes de la famille cible
    await Promise.all([
      FamilyMember.deleteMany({ familyId: family._id }),
      Task.deleteMany({ familyId: family._id }),
      ShoppingItem.deleteMany({ familyId: family._id }),
      ShoppingCategory.deleteMany({ familyId: family._id }),
      Absence.deleteMany({ familyId: family._id }),
      MealGuest.deleteMany({ familyId: family._id }),
      Meal.deleteMany({ familyId: family._id }),
      Shortcut.deleteMany({ familyId: family._id }),
      Event.deleteMany({ familyId: family._id })
    ])

    // 3. Insérer les membres de la famille
    const createdMembers = []
    for (const u of users) {
      const targetUserId = idMap[u.id]
      const targetUserRef = userRefMap[u.id]
      if (!targetUserId) continue

      // Éviter les doublons si l'utilisateur apparaît deux fois dans la liste
      const alreadyAdded = createdMembers.some(m => m.userId === targetUserId)
      if (!alreadyAdded) {
        const fm = new FamilyMember({
          familyId: family._id,
          userId: targetUserId,
          userRef: targetUserRef,
          role: u.role || 'Membre',
          isAdmin: Boolean(u.isAdmin),
          usualPresence: u.usualPresence || 'present',
          points: u.points || 0
        })
        await fm.save()
        createdMembers.push(fm)
      }
    }

    // 4. Insérer les catégories de courses
    for (const cat of shoppingCategories) {
      await ShoppingCategory.create({
        familyId: family._id,
        id: cat.id,
        name: cat.name,
        icon: cat.icon || '🛒',
        rank: cat.rank ?? 0
      })
    }

    // 5. Insérer les articles de courses
    for (const item of shoppingItems) {
      await ShoppingItem.create({
        familyId: family._id,
        id: item.id,
        name: item.name,
        category: item.category || 'Frais',
        quantity: item.quantity ?? 1,
        urgent: Boolean(item.urgent),
        checked: Boolean(item.checked),
        mealId: item.mealId ? Number(item.mealId) : null
      })
    }

    // 6. Insérer les tâches (en re-mappant assignedTo si nécessaire)
    for (const task of tasks) {
      const assignedTo = task.assignedTo !== undefined && task.assignedTo !== null 
        ? (idMap[task.assignedTo] || task.assignedTo) 
        : null

      await Task.create({
        familyId: family._id,
        id: task.id,
        title: task.title,
        category: task.category || 'Maison',
        assignedTo,
        priority: task.priority || 'Moyenne',
        points: task.points ?? 10,
        completed: Boolean(task.completed),
        dueDate: task.dueDate
      })
    }

    // 7. Insérer les absences
    for (const abs of absences) {
      const memberId = idMap[abs.memberId] || abs.memberId
      const declaredBy = abs.declaredBy ? (idMap[abs.declaredBy] || abs.declaredBy) : null

      await Absence.create({
        familyId: family._id,
        id: abs.id,
        memberId,
        date: abs.date,
        type: abs.type || 'absence',
        lunch: Boolean(abs.lunch),
        dinner: Boolean(abs.dinner),
        night: Boolean(abs.night),
        note: abs.note || '',
        declaredBy
      })
    }

    // 8. Insérer les invités
    for (const guest of mealGuests) {
      const invitedBy = guest.invitedBy ? (idMap[guest.invitedBy] || guest.invitedBy) : null

      await MealGuest.create({
        familyId: family._id,
        id: guest.id,
        name: guest.name,
        date: guest.date,
        lunch: Boolean(guest.lunch),
        dinner: Boolean(guest.dinner),
        night: Boolean(guest.night),
        invitedBy,
        note: guest.note || ''
      })
    }

    // 9. Insérer les raccourcis
    for (const sc of shortcuts) {
      await Shortcut.create({
        familyId: family._id,
        id: sc.id,
        title: sc.title,
        url: sc.url,
        icon: sc.icon || '🌐',
        order: sc.order ?? 0
      })
    }

    // 10. Insérer les événements
    for (const evt of events) {
      const assignedTo = evt.assignedTo !== undefined && evt.assignedTo !== null
        ? (idMap[evt.assignedTo] || evt.assignedTo)
        : null

      await Event.create({
        familyId: family._id,
        id: evt.id,
        title: evt.title,
        date: evt.date,
        time: evt.time,
        endTime: evt.endTime,
        category: evt.category || 'Famille',
        location: evt.location,
        color: evt.color || '#8b5cf6',
        assignedTo,
        memberIds: Array.isArray(evt.memberIds) ? evt.memberIds.map(mId => idMap[mId] || mId) : [],
        recurrenceId: evt.recurrenceId ?? null,
        recurrence: evt.recurrence
      })
    }

    // 11. Insérer les repas de la semaine
    for (const m of meals) {
      await Meal.create({
        familyId: family._id,
        id: m.id || Date.now(),
        date: m.date,
        slot: m.slot === 'dinner' ? 'dinner' : 'lunch',
        dish: m.dish,
        suggestedBy: m.suggestedBy !== undefined && m.suggestedBy !== null
          ? (idMap[m.suggestedBy] || m.suggestedBy)
          : null,
        notes: m.notes || ''
      })
    }

    res.json({
      success: true,
      message: req.t('messages.imported', { family: family.name }),
      summary: {
        family: family.name,
        slug: family.slug,
        membersCount: createdMembers.length,
        tasksCount: tasks.length,
        shoppingItemsCount: shoppingItems.length,
        categoriesCount: shoppingCategories.length,
        absencesCount: absences.length,
        guestsCount: mealGuests.length,
        shortcutsCount: shortcuts.length,
        eventsCount: events.length,
        mealsCount: meals.length
      }
    })
  } catch (err) {
    console.error('Erreur import-family:', err)
    res.status(500).json({ error: req.t('errors.importFailed', { message: err.message }) })
  }
})

// GET /api/super-admin/users (Vue de tous les utilisateurs et de leurs familles)
app.get('/api/super-admin/users', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 })
    const usersWithFamilies = await Promise.all(users.map(async (u) => {
      const memberships = await FamilyMember.find({ userId: u.id })
      const familyIds = memberships.map(m => m.familyId)
      const families = await Family.find({ _id: { $in: familyIds } }).select('name slug')

      const mappedFamilies = memberships.map(m => {
        const fam = families.find(f => f._id.toString() === m.familyId.toString())
        return {
          familyId: m.familyId,
          id: m.familyId,
          name: fam ? fam.name : 'Inconnue',
          slug: fam ? fam.slug : '',
          role: m.isAdmin ? 'Administrateur' : (m.role || 'Membre'),
          isAdmin: Boolean(m.isAdmin)
        }
      })

      return {
        ...u.toObject(),
        isAdmin: Boolean(u.isSuperAdmin),
        isSuperAdmin: Boolean(u.isSuperAdmin),
        families: mappedFamilies,
        memberships: mappedFamilies
      }
    }))
    res.json(usersWithFamilies)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/super-admin/users/:userId/set-family-admin (Modifier les droits administrateur familial d'un utilisateur pour une famille spécifique)
app.put('/api/super-admin/users/:userId/set-family-admin', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.userId)
    const { familyId, isAdmin } = req.body

    const member = await FamilyMember.findOne({ userId, familyId })
    if (!member) {
      return res.status(404).json({ error: req.t('errors.membershipNotFound') })
    }

    member.isAdmin = Boolean(isAdmin)
    if (member.isAdmin && member.role === 'Membre') {
      member.role = 'Administrateur'
    } else if (!member.isAdmin && member.role === 'Administrateur') {
      member.role = 'Membre'
    }
    await member.save()

    res.json({ success: true, member })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/super-admin/users/:userId (Modifier les informations globales d'un utilisateur)
app.put('/api/super-admin/users/:userId', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.userId)
    const user = await User.findOne({ id: userId })
    if (!user) return res.status(404).json({ error: req.t('errors.userNotFound') })

    const { firstName, lastName, email, isSuperAdmin } = req.body

    if (email) {
      const cleanEmail = String(email).toLowerCase().trim()
      const existing = await User.findOne({ email: cleanEmail, id: { $ne: userId } })
      if (existing) {
        return res.status(400).json({ error: req.t('errors.emailTaken') })
      }
      user.email = cleanEmail
    }

    if (firstName) user.firstName = firstName.trim()
    if (lastName) user.lastName = lastName.trim()

    if (isSuperAdmin !== undefined) {
      if (!isSuperAdmin && user.isSuperAdmin) {
        const superAdminCount = await User.countDocuments({ isSuperAdmin: true })
        if (superAdminCount <= 1) {
          return res.status(400).json({ error: req.t('errors.lastSuperAdminDemote') })
        }
      }
      user.isSuperAdmin = Boolean(isSuperAdmin)
    }

    await user.save()
    res.json({
      message: req.t('messages.userUpdated'),
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isSuperAdmin: Boolean(user.isSuperAdmin)
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/super-admin/users/:userId/families (Rattacher un utilisateur à une famille existante)
app.post('/api/super-admin/users/:userId/families', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.userId)
    const { familyId, role, isAdmin } = req.body

    if (!familyId) {
      return res.status(400).json({ error: req.t('errors.familyIdRequired') })
    }

    const user = await User.findOne({ id: userId })
    if (!user) return res.status(404).json({ error: req.t('errors.userNotFound') })

    const family = await Family.findById(familyId)
    if (!family) return res.status(404).json({ error: req.t('errors.familyNotFound') })

    const existingMember = await FamilyMember.findOne({ userId, familyId })
    if (existingMember) {
      return res.status(400).json({ error: req.t('errors.alreadyInNamedFamily', { family: family.name }) })
    }

    // Contrôle quota
    const currentMemberCount = await FamilyMember.countDocuments({ familyId: family._id })
    if (currentMemberCount >= family.maxMembers) {
      return res.status(400).json({ error: req.t('errors.quotaReached', { max: family.maxMembers }) })
    }

    const isMemberAdmin = Boolean(isAdmin)
    const assignedRole = role && role.trim() ? role.trim() : (isMemberAdmin ? 'Administrateur' : 'Membre')

    const newMember = new FamilyMember({
      familyId: family._id,
      userId: user.id,
      userRef: user._id,
      role: assignedRole,
      isAdmin: isMemberAdmin,
      usualPresence: 'present'
    })
    await newMember.save()

    res.status(201).json({
      message: req.t('messages.attachedToFamily', { family: family.name }),
      member: {
        familyId: family._id,
        familyName: family.name,
        familySlug: family.slug,
        role: newMember.role,
        isAdmin: newMember.isAdmin
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/super-admin/users/:userId/families/:familyId (Modifier le rôle et statut admin dans une famille)
app.put('/api/super-admin/users/:userId/families/:familyId', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.userId)
    const { familyId } = req.params
    const { role, isAdmin } = req.body

    const member = await FamilyMember.findOne({ userId, familyId })
    if (!member) {
      return res.status(404).json({ error: req.t('errors.membershipNotFound') })
    }

    if (isAdmin !== undefined) {
      member.isAdmin = Boolean(isAdmin)
    }

    if (role !== undefined && role.trim()) {
      member.role = role.trim()
    } else if (isAdmin !== undefined) {
      if (member.isAdmin && member.role === 'Membre') {
        member.role = 'Administrateur'
      } else if (!member.isAdmin && member.role === 'Administrateur') {
        member.role = 'Membre'
      }
    }

    await member.save()
    res.json({ message: req.t('messages.familyRoleSaved'), member })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/super-admin/users/:userId/families/:familyId (Retirer un utilisateur d'une famille)
app.delete('/api/super-admin/users/:userId/families/:familyId', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.userId)
    const { familyId } = req.params

    const member = await FamilyMember.findOne({ userId, familyId })
    if (!member) {
      return res.status(404).json({ error: req.t('errors.membershipNotFound') })
    }

    await FamilyMember.deleteOne({ _id: member._id })
    res.json({ message: req.t('messages.userRemovedFromFamily') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/super-admin/users/:userId (Supprimer définitivement un compte utilisateur)
app.delete('/api/super-admin/users/:userId', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.userId)

    if (req.user.id === userId) {
      return res.status(400).json({ error: req.t('errors.cannotDeleteOwnSuperAdmin') })
    }

    const user = await User.findOne({ id: userId })
    if (!user) {
      return res.status(404).json({ error: req.t('errors.userNotFound') })
    }

    if (user.isSuperAdmin) {
      const superAdminCount = await User.countDocuments({ isSuperAdmin: true })
      if (superAdminCount <= 1) {
        return res.status(400).json({ error: req.t('errors.lastSuperAdminDelete') })
      }
    }

    // Suppression en cascade : memberships, invitations et abonnements push
    await FamilyMember.deleteMany({ userId: user.id })
    await FamilyInvitation.deleteMany({ email: user.email })
    await PushSubscription.deleteMany({ userId: user.id })
    await User.deleteOne({ id: user.id })

    res.json({ message: req.t('messages.accountDeletedNamed', { name: `${user.firstName} ${user.lastName}`.trim(), email: user.email }) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/super-admin/smtp (Récupération des paramètres SMTP plateforme)
app.get('/api/super-admin/smtp', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    let config = await GlobalConfig.findOne()
    if (!config) {
      config = new GlobalConfig()
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
      fromName: config.fromName || 'FamilyGest Platform',
      isConfigured: Boolean(config.isConfigured)
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT & POST /api/super-admin/smtp (Sauvegarde des paramètres SMTP plateforme)
const handleSaveGlobalSmtp = async (req, res) => {
  try {
    const { serverUrl, providerPreset, host, port, secure, user, pass, password, from, fromEmail, fromName } = req.body

    let config = await GlobalConfig.findOne()
    if (!config) config = new GlobalConfig()

    if (serverUrl !== undefined) config.serverUrl = serverUrl.trim()
    if (providerPreset) config.providerPreset = providerPreset
    if (host !== undefined) config.host = host.trim()
    if (port !== undefined) config.port = Number(port)
    if (secure !== undefined) config.secure = Boolean(secure)
    if (user !== undefined) config.user = user.trim()
    
    const newPass = password !== undefined ? password : pass
    if (newPass !== undefined && newPass !== '') config.pass = newPass.trim()

    const newFromEmail = from !== undefined ? from : fromEmail
    if (newFromEmail !== undefined) config.fromEmail = newFromEmail.trim()
    if (fromName !== undefined) config.fromName = fromName.trim()

    config.isConfigured = isEmailConfigUsable(config)
    await config.save()

    res.json({
      message: req.t('messages.smtpSaved'),
      serverUrl: config.serverUrl,
      providerPreset: config.providerPreset,
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      from: config.fromEmail,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      hasPassword: Boolean(config.pass && config.pass.length > 0),
      isConfigured: config.isConfigured
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

app.post('/api/super-admin/smtp', requireAuth, requireSuperAdmin, handleSaveGlobalSmtp)
app.put('/api/super-admin/smtp', requireAuth, requireSuperAdmin, handleSaveGlobalSmtp)

// GET /api/super-admin/digest-schedule (Heure d'envoi du récapitulatif quotidien)
app.get('/api/super-admin/digest-schedule', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    let config = await GlobalConfig.findOne()
    if (!config) {
      config = new GlobalConfig()
      await config.save()
    }
    res.json({
      digestHour: config.digestHour ?? 8,
      digestMinute: config.digestMinute ?? 0
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/super-admin/digest-schedule (Modification de l'heure d'envoi du récapitulatif quotidien)
app.put('/api/super-admin/digest-schedule', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { digestHour, digestMinute } = req.body
    const hour = Number(digestHour)
    const minute = Number(digestMinute)

    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      return res.status(400).json({ error: req.t('errors.hourRange') })
    }
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
      return res.status(400).json({ error: req.t('errors.minuteRange') })
    }

    let config = await GlobalConfig.findOne()
    if (!config) config = new GlobalConfig()

    config.digestHour = hour
    config.digestMinute = minute
    await config.save()

    res.json({ message: req.t('messages.digestScheduleSaved'), digestHour: config.digestHour, digestMinute: config.digestMinute })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/super-admin/legal (Modification des mentions légales & de la politique de confidentialité)
app.put('/api/super-admin/legal', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { legalNotice, privacyPolicy } = req.body

    let config = await GlobalConfig.findOne()
    if (!config) config = new GlobalConfig()

    if (legalNotice !== undefined) config.legalNotice = legalNotice
    if (privacyPolicy !== undefined) config.privacyPolicy = privacyPolicy
    await config.save()

    res.json({ message: req.t('messages.legalSaved'), legalNotice: config.legalNotice, privacyPolicy: config.privacyPolicy })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/super-admin/smtp/test (Test d'envoi SMTP plateforme)
app.post('/api/super-admin/smtp/test', authRateLimiter, requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const recipientEmail = req.body.recipientEmail || req.user?.email
    if (!recipientEmail || !recipientEmail.trim()) {
      return res.status(400).json({ error: req.t('errors.recipientRequired') })
    }

    const stored = await GlobalConfig.findOne()
    const providerPreset = req.body.providerPreset || stored?.providerPreset || 'gmail'
    const user = (req.body.user || stored?.user || '').trim()
    const testConfig = {
      providerPreset,
      host: (req.body.host || stored?.host || '').trim(),
      port: Number(req.body.port || stored?.port || 587),
      secure: req.body.secure !== undefined ? Boolean(req.body.secure) : Boolean(stored?.secure),
      user,
      pass: req.body.password || req.body.pass || stored?.pass,
      fromName: req.body.fromName || stored?.fromName || 'FamilyGest Platform',
      fromEmail: (req.body.from || req.body.fromEmail || stored?.fromEmail || user).trim()
    }

    if (!isEmailConfigUsable(testConfig)) {
      return res.status(400).json({
        error: providerPreset === 'brevo-api'
          ? req.t('errors.brevoFieldsRequired')
          : req.t('errors.smtpFieldsRequired')
      })
    }

    await sendEmailWithConfig(testConfig, {
      to: recipientEmail.trim(),
      subject: `✨ ${req.t('email.smtpTest.subject')}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0;">
          <h2 style="color: #4f46e5;">${req.t('email.smtpTest.title')}</h2>
          <p>${req.t('email.smtpTest.body')}</p>
          <p style="color: #64748b; font-size: 13px;">${req.t('email.smtpTest.sentFrom', { email: escapeHtml(testConfig.fromEmail) })}</p>
        </div>
      `
    })

    res.json({ success: true, message: req.t('messages.smtpTestSent', { email: recipientEmail.trim() }) })
  } catch (err) {
    res.status(500).json({ error: req.t('errors.sendFailed', { message: err.message }) })
  }
})

// === JOURNAL DES ALERTES (console Super Admin) ===

// GET /api/super-admin/alert-logs/meta (catalogue des types d'alertes + familles pour peupler les filtres)
app.get('/api/super-admin/alert-logs/meta', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const families = await Family.find().select('name slug').sort({ name: 1 })
    res.json({ actions: ALERT_ACTIONS_LIST, families })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/super-admin/alert-logs (journal paginé et filtrable des alertes envoyées)
app.get('/api/super-admin/alert-logs', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { familyId, actorUserId, action, from, to } = req.query
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25))

    const filter = {}
    if (familyId) filter.familyId = String(familyId)
    if (actorUserId) filter.actorUserId = Number(actorUserId)
    if (action) filter.action = String(action)
    if (from || to) {
      filter.createdAt = {}
      if (from) filter.createdAt.$gte = new Date(from)
      if (to) filter.createdAt.$lte = new Date(to)
    }

    const [total, logs] = await Promise.all([
      AlertLog.countDocuments(filter),
      AlertLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
    ])

    res.json({
      logs,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === USER FAMILIES & FAMILY CONTEXT ROUTES ===

// GET /api/user/families (Liste des familles accessibles pour l'utilisateur connecté)
app.get('/api/user/families', requireAuth, async (req, res) => {
  try {
    const memberships = await FamilyMember.find({ userId: req.user.id })
    const familyIds = memberships.map(m => m.familyId)
    const families = await Family.find({ _id: { $in: familyIds }, isActive: true })

    const result = families.map(f => {
      const mem = memberships.find(m => m.familyId.toString() === f._id.toString())
      return {
        _id: f._id,
        name: f.name,
        slug: f.slug,
        maxMembers: f.maxMembers,
        role: mem ? mem.role : 'Membre',
        isAdmin: mem ? mem.isAdmin : false
      }
    })

    if (req.user.isSuperAdmin) {
      const allFamilies = await Family.find({ isActive: true })
      for (const f of allFamilies) {
        if (!result.some(r => r._id.toString() === f._id.toString())) {
          result.push({
            _id: f._id,
            name: f.name,
            slug: f.slug,
            maxMembers: f.maxMembers,
            role: 'Super Admin',
            isAdmin: true
          })
        }
      }
    }

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/families/:familySlug (Détails de la famille demandée et membership du profil)
app.get('/api/families/:familySlug', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const [memberCount, mealieConfigured] = await Promise.all([
      FamilyMember.countDocuments({ familyId: req.family._id }),
      MealieConfig.exists({ familyId: req.family._id })
    ])
    const isFamilyAdmin = Boolean(req.user?.isSuperAdmin || req.membership?.isAdmin)
    res.json({
      family: {
        _id: req.family._id,
        name: req.family.name,
        slug: req.family.slug,
        maxMembers: req.family.maxMembers,
        memberCount,
        // Référence de l'alternance semaine A / semaine B des présences habituelles.
        presenceWeekAnchor: req.family.presenceWeekAnchor || DEFAULT_WEEK_ANCHOR,
        // Active la recherche de recettes Mealie dans la modale d'ajout de repas.
        mealieEnabled: Boolean(mealieConfigured)
      },
      membership: req.membership,
      role: req.membership?.role || (isFamilyAdmin ? 'Administrateur' : 'Membre'),
      isAdmin: isFamilyAdmin
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/families/:familySlug/presence-anchor (Déclare quel lundi sert de « semaine A »)
//
// L'ancrage est commun à toute la famille pour que « semaine A » désigne la même semaine civile
// pour tout le monde. Deux membres en phases opposées inversent leurs grilles, pas leur ancrage.
app.put('/api/families/:familySlug/presence-anchor', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const raw = String(req.body.presenceWeekAnchor || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return res.status(400).json({ error: req.t('errors.invalidDate') })
    }

    // Toujours stocker un lundi : la parité se calcule de lundi à lundi, un ancrage en milieu
    // de semaine donnerait un résultat correct mais illisible en base.
    const anchor = mondayOf(raw)
    await Family.updateOne({ _id: req.family._id }, { $set: { presenceWeekAnchor: anchor } })

    res.json({ presenceWeekAnchor: anchor })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/families/:familySlug/check-email (Vérification si un email existe avant invitation par l'admin familial)
app.post('/api/families/:familySlug/check-email', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim()
    if (!email) return res.status(400).json({ error: req.t('errors.emailRequired') })

    const existingUser = await User.findOne({ email }).select('id firstName lastName email avatar color')
    if (existingUser) {
      const alreadyMember = await FamilyMember.findOne({ familyId: req.family._id, userId: existingUser.id })
      return res.json({
        exists: true,
        alreadyMember: Boolean(alreadyMember),
        user: {
          id: existingUser.id,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          email: existingUser.email
        }
      })
    }

    res.json({ exists: false, alreadyMember: false })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/families/:familySlug/invite (Invitation d'un utilisateur par l'admin familial)
app.post('/api/families/:familySlug/invite', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const { email, firstName, lastName, role, isAdmin } = req.body
    if (!email) return res.status(400).json({ error: req.t('errors.emailRequired') })

    const cleanEmail = email.toLowerCase().trim()

    // Vérifier le quota
    const currentMemberCount = await FamilyMember.countDocuments({ familyId: req.family._id })
    if (currentMemberCount >= req.family.maxMembers) {
      return res.status(400).json({ error: req.t('errors.quotaReached', { max: req.family.maxMembers }) })
    }

    const existingUser = await User.findOne({ email: cleanEmail })
    if (existingUser) {
      const alreadyMember = await FamilyMember.findOne({ familyId: req.family._id, userId: existingUser.id })
      if (alreadyMember) {
        return res.status(400).json({ error: req.t('errors.alreadyInFamily') })
      }
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const invitation = new FamilyInvitation({
      token,
      familyId: req.family._id,
      email: cleanEmail,
      role: role || 'Membre',
      isAdmin: Boolean(isAdmin),
      invitedBy: req.user.id,
      firstName: (existingUser ? existingUser.firstName : firstName) || '',
      lastName: (existingUser ? existingUser.lastName : lastName) || '',
      status: 'pending',
      expiresAt
    })
    await invitation.save()

    // Envoi email invitation
    const inviteResult = await sendFamilyInvitationEmail({
      email: cleanEmail,
      family: req.family,
      invitationToken: token,
      isExistingUser: Boolean(existingUser),
      invitedByName: `${req.user.firstName} ${req.user.lastName}`,
      lang: existingUser?.language || req.lang
    })
    logAlertEntry({
      family: req.family,
      actor: req.user,
      action: ALERT_ACTIONS.FAMILY_MEMBER_INVITED.code,
      actionLabel: ALERT_ACTIONS.FAMILY_MEMBER_INVITED.label,
      title: `Invitation membre : ${cleanEmail}`,
      targetType: 'invitation',
      targetId: invitation.token,
      channels: [toAlertChannelLog('email', inviteResult)]
    }).catch(err => console.error('[AlertLog] sendFamilyInvitationEmail (invite member):', err.message))

    res.json({
      success: true,
      message: req.t('messages.invitationSent', { email: cleanEmail }),
      token
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === INVITATION ACCEPTANCE ROUTES ===

// GET /api/invitations/:token (Détails d'une invitation)
app.get('/api/invitations/:token', async (req, res) => {
  try {
    const invitation = await FamilyInvitation.findOne({ token: req.params.token })
    if (!invitation) return res.status(404).json({ error: req.t('errors.invitationNotFound') })

    if (invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: req.t('errors.invitationExpired') })
    }

    const family = await Family.findById(invitation.familyId)
    if (!family) return res.status(404).json({ error: req.t('errors.familyNotFound') })

    const existingUser = await User.findOne({ email: invitation.email })

    res.json({
      token: invitation.token,
      email: invitation.email,
      family: {
        name: family.name,
        slug: family.slug
      },
      role: invitation.role,
      isAdmin: Boolean(invitation.isAdmin),
      userExists: Boolean(existingUser),
      isExistingUser: Boolean(existingUser),
      invitation: {
        token: invitation.token,
        email: invitation.email,
        role: invitation.role,
        isAdmin: Boolean(invitation.isAdmin),
        firstName: invitation.firstName,
        lastName: invitation.lastName
      },
      existingUser: existingUser ? {
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        avatar: existingUser.avatar
      } : {
        firstName: invitation.firstName,
        lastName: invitation.lastName
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/invitations/:token/accept (Finalisation d'inscription ou acceptation de rejoindre)
app.post('/api/invitations/:token/accept', authRateLimiter, async (req, res) => {
  try {
    const invitation = await FamilyInvitation.findOne({ token: req.params.token })
    if (!invitation) return res.status(404).json({ error: req.t('errors.invitationNotFound') })

    if (invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: req.t('errors.invitationExpired') })
    }

    const family = await Family.findById(invitation.familyId)
    if (!family) return res.status(404).json({ error: req.t('errors.familyNotFound') })

    let user = await User.findOne({ email: invitation.email })
    let alreadyMember = false
    if (user) {
      alreadyMember = await FamilyMember.findOne({ familyId: family._id, userId: user.id })
    }

    // Contrôle quota uniquement pour les nouveaux membres arrivants
    if (!alreadyMember) {
      const currentMemberCount = await FamilyMember.countDocuments({ familyId: family._id })
      if (currentMemberCount >= family.maxMembers) {
        return res.status(400).json({ error: req.t('errors.quotaReachedFamily', { family: family.name }) })
      }
    }

    if (user) {
      // Utilisateur existant : vérification s'il est déjà membre
      if (alreadyMember) {
        // Mise à niveau du rôle (ex: promu administrateur de cette famille)
        if (invitation.isAdmin) {
          alreadyMember.isAdmin = true
          alreadyMember.role = invitation.role || 'Administrateur'
          await alreadyMember.save()
        }
      } else {
        const isInvitedAdmin = Boolean(invitation.isAdmin)
        const assignedRole = isInvitedAdmin ? 'Administrateur' : (req.body.role || invitation.role || 'Membre')
        const newMember = new FamilyMember({
          familyId: family._id,
          userId: user.id,
          userRef: user._id,
          role: assignedRole,
          isAdmin: isInvitedAdmin,
          usualPresence: req.body.usualPresence || 'present'
        })
        await newMember.save()
      }
    } else {
      // Nouvel utilisateur : création complète
      const { password, firstName, lastName, avatar, color, usualPresence, role, language } = req.body
      if (!password) {
        return res.status(400).json({ error: req.t('errors.passwordRequired') })
      }

      const pwdCheck = validatePasswordSecurity(password, req.t)
      if (!pwdCheck.valid) {
        return res.status(400).json({ error: pwdCheck.error })
      }

      const highestUser = await User.findOne().sort('-id')
      const nextId = (highestUser && typeof highestUser.id === 'number') ? highestUser.id + 1 : 1

      const isInvitedAdmin = Boolean(invitation.isAdmin)
      const assignedRole = isInvitedAdmin ? 'Administrateur' : (role || invitation.role || 'Membre')

      user = new User({
        id: nextId,
        firstName: (firstName || invitation.firstName || 'Membre').trim(),
        lastName: (lastName || invitation.lastName || '').trim(),
        email: invitation.email,
        password,
        avatar: avatar || '👤',
        color: color || '#6366f1',
        isAdmin: false, // Les droits admin sont purement familiaux (sur FamilyMember)
        isSuperAdmin: false,
        role: assignedRole,
        usualPresence: usualPresence || 'present',
        // Langue choisie sur l'écran d'invitation (absente tant que le multilingue n'est pas activé)
        language: normalizeLanguage(language)
      })
      await user.save()

      const newMember = new FamilyMember({
        familyId: family._id,
        userId: user.id,
        userRef: user._id,
        role: assignedRole,
        isAdmin: isInvitedAdmin, // Le rôle d'administrateur familial réside ici
        usualPresence: usualPresence || 'present'
      })
      await newMember.save()
    }

    invitation.status = 'accepted'
    await invitation.save()

    const token = generateToken(user.id, user.email, false, user.isSuperAdmin)

    res.json({
      success: true,
      token,
      familySlug: family.slug,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        avatar: user.avatar,
        color: user.color,
        isSuperAdmin: Boolean(user.isSuperAdmin),
        isAdmin: Boolean(user.isSuperAdmin),
        role: user.role,
        language: user.language || null
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === MEMBERS ROUTES (SCOPED TO FAMILY) ===

// Forme canonique d'un membre renvoyée au frontend (liste, création, modification). Normalise
// systématiquement la présence habituelle détaillée : les adhésions créées avant cette
// fonctionnalité n'ont pas de usualPresenceConfig et retombent sur leur usualPresence.
const serializeMember = (user, membership) => ({
  id: user.id,
  name: `${user.firstName} ${user.lastName}`,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  isAdmin: membership.isAdmin,
  role: membership.role || 'Membre',
  avatar: user.avatar,
  color: user.color,
  points: membership.points || 0,
  usualPresence: membership.usualPresence || 'present',
  usualPresenceConfig: normalizeUsualPresenceConfig(membership.usualPresenceConfig, membership.usualPresence)
})

app.get('/api/members', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const memberships = await FamilyMember.find({ familyId: req.family._id })
    const userIds = memberships.map(m => m.userId)
    const users = await User.find({ id: { $in: userIds } }).select('-password')

    const members = memberships.map(mem => {
      const u = users.find(user => user.id === mem.userId)
      if (!u) return null
      return { ...serializeMember(u, mem), isSuperAdmin: Boolean(u.isSuperAdmin) }
    }).filter(Boolean)

    // Inclure les invitations en attente pour cette famille
    const pendingInvs = await FamilyInvitation.find({ familyId: req.family._id, status: 'pending' })
    for (const inv of pendingInvs) {
      members.push({
        id: `inv-${inv._id}`,
        name: `${inv.firstName || ''} ${inv.lastName || ''}`.trim() || inv.email,
        firstName: inv.firstName || 'Invité',
        lastName: inv.lastName || '',
        email: inv.email,
        isAdmin: Boolean(inv.isAdmin),
        role: inv.role || (inv.isAdmin ? 'Administrateur' : 'Membre'),
        avatar: '✉️',
        color: '#94a3b8',
        points: 0,
        usualPresence: 'present',
        usualPresenceConfig: normalizeUsualPresenceConfig(null, 'present'),
        isPending: true,
        invitationToken: inv.token
      })
    }

    // Si aucun membre actif et que c'est le Super Admin qui consulte, inclure le Super Admin
    if (memberships.length === 0 && req.user.isSuperAdmin) {
      members.unshift({
        id: req.user.id,
        name: `${req.user.firstName} ${req.user.lastName}`,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        isAdmin: true,
        role: 'Super Administrateur',
        avatar: req.user.avatar || '👑',
        color: '#f59e0b',
        points: 0,
        usualPresence: 'present',
        usualPresenceConfig: normalizeUsualPresenceConfig(null, 'present'),
        isSuperAdmin: true
      })
    }

    res.json(members)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Ajouter un membre : Réservé à l'Administrateur
app.post('/api/members', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const { name, firstName, lastName, email, password, role, avatar, color, points, isAdmin, usualPresence } = req.body

    // Vérification du quota
    const currentMemberCount = await FamilyMember.countDocuments({ familyId: req.family._id })
    if (currentMemberCount >= req.family.maxMembers) {
      return res.status(400).json({ error: req.t('errors.quotaReached', { max: req.family.maxMembers }) })
    }

    const fName = firstName || (name ? name.split(' ')[0] : 'Membre')
    const lName = lastName || (name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : 'Famille')
    const userEmail = email ? email.toLowerCase().trim() : `membre.${Date.now()}@family-gest.org`
    const userPassword = password || 'Family2026!*'

    if (password && password.trim()) {
      const pwdCheck = validatePasswordSecurity(password.trim(), req.t)
      if (!pwdCheck.valid) {
        return res.status(400).json({ error: pwdCheck.error })
      }
    }

    let user = await User.findOne({ email: userEmail })
    if (user) {
      const already = await FamilyMember.findOne({ familyId: req.family._id, userId: user.id })
      if (already) {
        return res.status(400).json({ error: req.t('errors.memberAlreadyInFamily') })
      }
    } else {
      const highestUser = await User.findOne().sort('-id')
      const nextId = (highestUser && typeof highestUser.id === 'number') ? highestUser.id + 1 : Date.now()

      const welcomeToken = crypto.randomBytes(32).toString('hex')
      const welcomeTokenExpires = new Date(Date.now() + 2 * 60 * 60 * 1000)

      user = new User({
        id: nextId,
        firstName: fName,
        lastName: lName,
        email: userEmail,
        password: userPassword,
        isAdmin: false,
        role: role || 'Membre',
        avatar: avatar || '👤',
        color: color || '#6366f1',
        points: 0,
        welcomeToken,
        welcomeTokenExpires,
        usualPresence: usualPresence || 'present'
      })
      await user.save()

      // Envoi de l'email de bienvenue
      sendWelcomeEmail(user, welcomeToken, user.language || req.lang)
        .then(result => logAlertEntry({
          family: req.family,
          actor: req.user,
          action: ALERT_ACTIONS.MEMBER_WELCOME.code,
          actionLabel: ALERT_ACTIONS.MEMBER_WELCOME.label,
          title: `Email de bienvenue : ${user.firstName} ${user.lastName}`,
          targetType: 'user',
          targetId: user.id,
          channels: [toAlertChannelLog('email', result)]
        }))
        .catch(err => console.error('[AlertLog] sendWelcomeEmail (members):', err.message))
    }

    const newMembership = new FamilyMember({
      familyId: req.family._id,
      userId: user.id,
      userRef: user._id,
      role: role || (isAdmin ? 'Administrateur' : 'Membre'),
      isAdmin: Boolean(isAdmin),
      usualPresence: usualPresence || 'present',
      points: Number(points) || 0
    })
    await newMembership.save()

    res.status(201).json(serializeMember(user, newMembership))
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Modifier un membre : Réservé à l'Administrateur
app.put('/api/members/:id', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const memberId = Number(req.params.id)
    const user = await User.findOne({ id: memberId })
    if (!user) return res.status(404).json({ error: req.t('errors.memberNotFound') })

    const membership = await FamilyMember.findOne({ familyId: req.family._id, userId: memberId })
    if (!membership) return res.status(404).json({ error: req.t('errors.memberNotInFamily') })

    const { name, firstName, lastName, email, password, role, avatar, color, points, isAdmin, usualPresence, usualPresenceConfig } = req.body

    if (firstName) user.firstName = firstName.trim()
    if (lastName) user.lastName = lastName.trim()
    if (name && !firstName && !lastName) {
      user.firstName = name.split(' ')[0]
      user.lastName = name.split(' ').slice(1).join(' ') || user.lastName
    }

    if (avatar) user.avatar = avatar
    if (color) user.color = color

    if (role) membership.role = role
    if (points !== undefined && points !== null) membership.points = Number(points)
    // Les préférences de notification ne sont plus pilotables par un admin de famille pour un
    // autre membre — elles sont désormais gérées par chacun dans son propre profil.
    // Présence habituelle : la grille détaillée prime si elle est fournie, sinon on retombe sur
    // l'enum simple (formulaires plus anciens, ou modification qui ne touche pas à la présence).
    if (usualPresenceConfig) {
      const cfg = normalizeUsualPresenceConfig(usualPresenceConfig, usualPresence || membership.usualPresence)
      membership.usualPresenceConfig = cfg
      membership.usualPresence = summarizeUsualPresence(cfg)
    } else if (usualPresence && ['present', 'absent'].includes(usualPresence)) {
      membership.usualPresence = usualPresence
      // Régler l'enum simple repasse explicitement en mode simple, sinon une grille réglée
      // auparavant continuerait de s'appliquer et le changement semblerait sans effet.
      membership.usualPresenceConfig = normalizeUsualPresenceConfig(
        { ...(membership.usualPresenceConfig?.toObject?.() ?? membership.usualPresenceConfig), mode: 'simple' },
        usualPresence
      )
    }

    if (isAdmin !== undefined && isAdmin !== null) {
      const newAdminState = Boolean(isAdmin)
      if (user.id === req.user.id && !newAdminState && membership.isAdmin) {
        return res.status(400).json({ error: req.t('errors.cannotRemoveOwnAdmin') })
      }
      if (membership.isAdmin && !newAdminState) {
        const adminCount = await FamilyMember.countDocuments({ familyId: req.family._id, isAdmin: true })
        if (adminCount <= 1) {
          return res.status(400).json({ error: req.t('errors.lastAdminDemote') })
        }
      }
      membership.isAdmin = newAdminState
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() })
      if (existing && existing.id !== user.id) {
        return res.status(400).json({ error: req.t('errors.memberEmailExists') })
      }
      user.email = email.toLowerCase().trim()
    }

    if (password && password.trim().length > 0) {
      const pwdCheck = validatePasswordSecurity(password.trim(), req.t)
      if (!pwdCheck.valid) {
        return res.status(400).json({ error: pwdCheck.error })
      }
      user.password = password.trim()
    }

    await user.save()
    await membership.save()

    res.json(serializeMember(user, membership))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Régler la présence habituelle détaillée (grille hebdomadaire par créneau, alternance A/B).
//
// Route distincte de PUT /api/members/:id, qui est réservée aux administrateurs de la famille :
// ici, chaque membre doit pouvoir régler la SIENNE. Le contrôle est donc fait dans le handler
// et non via requireFamilyAdmin, sur le modèle de PUT /api/absences/:id.
app.put('/api/members/:id/usual-presence', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const memberId = Number(req.params.id)
    const isSelf = memberId === req.user.id
    if (!isSelf && !req.membership?.isAdmin && !req.user?.isSuperAdmin) {
      return res.status(403).json({ error: req.t('errors.ownUsualPresenceOnly') })
    }

    const user = await User.findOne({ id: memberId })
    if (!user) return res.status(404).json({ error: req.t('errors.memberNotFound') })

    const membership = await FamilyMember.findOne({ familyId: req.family._id, userId: memberId })
    if (!membership) return res.status(404).json({ error: req.t('errors.memberNotInFamily') })

    // On fusionne avec la config stockée avant de normaliser, pour accepter un patch partiel
    // (par exemple n'envoyer que weekB). La normalisation élimine au passage les clés inconnues
    // et force les booléens : ne jamais écrire req.body tel quel dans le document.
    const stored = membership.usualPresenceConfig?.toObject?.() ?? membership.usualPresenceConfig ?? {}
    const merged = {
      mode: req.body.mode ?? stored.mode,
      alternating: req.body.alternating ?? stored.alternating,
      weekA: req.body.weekA ?? stored.weekA,
      weekB: req.body.weekB ?? stored.weekB
    }
    const simple = ['present', 'absent'].includes(req.body.simple)
      ? req.body.simple
      : membership.usualPresence

    const cfg = normalizeUsualPresenceConfig(merged, simple)
    membership.usualPresenceConfig = cfg
    // Dénormalisation obligatoire : usualPresence reste exposé par une vingtaine de routes,
    // l'export RGPD et l'outil MCP list_members.
    membership.usualPresence = summarizeUsualPresence(cfg)
    await membership.save()

    res.json(serializeMember(user, membership))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Modifier le statut Administrateur d'un membre : Réservé à l'Administrateur
app.put('/api/members/:id/toggle-admin', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const memberId = Number(req.params.id)
    const membership = await FamilyMember.findOne({ familyId: req.family._id, userId: memberId })
    if (!membership) return res.status(404).json({ error: req.t('errors.memberNotInFamily') })

    const user = await User.findOne({ id: memberId })
    if (!user) return res.status(404).json({ error: req.t('errors.userNotFound') })

    if (user.id === req.user.id && membership.isAdmin) {
      return res.status(400).json({ error: req.t('errors.cannotRemoveOwnAdmin') })
    }

    if (membership.isAdmin) {
      const adminCount = await FamilyMember.countDocuments({ familyId: req.family._id, isAdmin: true })
      if (adminCount <= 1) {
        return res.status(400).json({ error: req.t('errors.lastAdminDemote') })
      }
    }

    membership.isAdmin = !membership.isAdmin
    await membership.save()

    res.json({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isAdmin: membership.isAdmin,
      role: membership.role,
      avatar: user.avatar,
      color: user.color,
      points: membership.points
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Supprimer un membre de la famille : Réservé à l'Administrateur
app.delete('/api/members/:id', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const memberId = Number(req.params.id)
    if (req.user.id === memberId) {
      return res.status(400).json({ error: req.t('errors.cannotRemoveSelf') })
    }
    const membership = await FamilyMember.findOne({ familyId: req.family._id, userId: memberId })
    if (!membership) return res.status(404).json({ error: req.t('errors.memberNotInFamily') })

    if (membership.isAdmin) {
      const adminCount = await FamilyMember.countDocuments({ familyId: req.family._id, isAdmin: true })
      if (adminCount <= 1) {
        return res.status(400).json({ error: req.t('errors.lastAdminDelete') })
      }
    }

    await FamilyMember.deleteOne({ familyId: req.family._id, userId: memberId })
    res.json({ message: req.t('messages.memberRemoved') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Renvoyer manuellement un email de bienvenue avec un nouveau token de 2h : Réservé à l'Administrateur
app.post('/api/members/:id/resend-welcome', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const memberId = Number(req.params.id)
    const user = await User.findOne({ id: memberId })
    if (!user) return res.status(404).json({ error: req.t('errors.memberNotFound') })

    const config = await getSmtpConfig()
    if (!config || !config.isConfigured || !config.host || !config.user || !config.pass) {
      return res.status(400).json({ 
        error: req.t('errors.smtpNotConfigured') 
      })
    }

    const welcomeToken = crypto.randomBytes(32).toString('hex')
    user.welcomeToken = welcomeToken
    user.welcomeTokenExpires = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 heures
    await user.save()

    const emailResult = await sendWelcomeEmail(user, welcomeToken, user.language || req.lang)
    logAlertEntry({
      family: req.family,
      actor: req.user,
      action: ALERT_ACTIONS.MEMBER_WELCOME_RESENT.code,
      actionLabel: ALERT_ACTIONS.MEMBER_WELCOME_RESENT.label,
      title: `Email de bienvenue renvoyé : ${user.firstName} ${user.lastName}`,
      targetType: 'user',
      targetId: user.id,
      channels: [toAlertChannelLog('email', emailResult)]
    }).catch(err => console.error('[AlertLog] sendWelcomeEmail (resend):', err.message))

    if (emailResult.success) {
      res.json({ 
        success: true, 
        message: req.t('messages.welcomeResent', { email: user.email }) 
      })
    } else {
      res.status(500).json({ 
        error: req.t('errors.smtpSend', { message: emailResult.error || req.t('errors.checkEmailConfig') }) 
      })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === TASKS ROUTES ===

// Bascule l'état "terminé" d'une tâche et répercute les points sur le membre (famille + compte global).
// Partagée par la route HTTP et l'outil MCP toggle_task pour éviter toute divergence de comptabilité.
const toggleTaskCompletion = async ({ familyId, taskId }) => {
  const task = await Task.findOne({ id: Number(taskId), familyId })
  if (!task) return null

  task.completed = !task.completed
  await task.save()

  const membership = await FamilyMember.findOne({ familyId, userId: task.assignedTo })
  if (membership) {
    membership.points = task.completed
      ? (membership.points || 0) + task.points
      : Math.max(0, (membership.points || 0) - task.points)
    await membership.save()
  }

  const user = await User.findOne({ id: task.assignedTo })
  if (user) {
    user.points = task.completed
      ? (user.points || 0) + task.points
      : Math.max(0, (user.points || 0) - task.points)
    await user.save()
  }

  return task
}

// Échéance d'une tâche : date « AAAA-MM-JJ » ou null (vide / invalide = pas d'échéance).
const normalizeTaskDueDate = (raw) => {
  const value = String(raw ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? value : null
}

// Champs d'une tâche suivis dans la notification de modification (libellés : notify.task.fields.*)
const TASK_TRACKED_FIELDS = ['title', 'assignedTo', 'dueDate', 'priority', 'category', 'points', 'notes']

// Noms des personnes assignées (avant/après), résolus une fois pour toutes les langues
const loadAssigneeNames = async (ids) => {
  const users = await User.find({ id: { $in: ids.filter(id => id != null) } }).select('id firstName lastName')
  return new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`.trim()]))
}

// Valeur lisible d'un champ de tâche, dans la langue du destinataire
const formatTaskFieldValue = (t, field, value, names) => {
  if (value === null || value === undefined || value === '') return t('notify.task.none')
  if (field === 'assignedTo') return names.get(value) || t('notify.task.unassigned')
  if (field === 'dueDate') return formatDateOnly(t.lang, value, { weekday: 'long', day: 'numeric', month: 'long' })
  if (field === 'points') return t('notify.task.points', { n: value })
  if (field === 'priority') return translateValue(t, 'taskPriority', value)
  if (field === 'category') return translateValue(t, 'taskCategory', value)
  return String(value)
}

// « Marie » ou « Marie via l'assistant » (écritures faites depuis le connecteur MCP)
const authorLabel = (t, actor, via) => {
  const name = actor ? actor.firstName : t('notify.aMember')
  return via === 'assistant' ? t('notify.viaAssistant', { name }) : name
}

// Prévient la personne assignée (et l'ancienne en cas de réassignation) qu'une tâche a été
// modifiée, par push et/ou email selon sa préférence « Tâches ». L'auteur de la modification
// n'est jamais notifié. Tâche de fond : ne doit pas faire échouer l'appelant.
const notifyTaskUpdated = async ({ family, actor, task, before, via = null }) => {
  const normalize = (v) => (v === undefined || v === '' ? null : v)
  const changedFields = TASK_TRACKED_FIELDS.filter(f => normalize(before[f]) !== normalize(task[f]))
  if (changedFields.length === 0) return

  const recipientUserIds = [...new Set([task.assignedTo, before.assignedTo])]
    .filter(id => id != null && id !== actor?.id)
  if (recipientUserIds.length === 0) return

  const names = await loadAssigneeNames([task.assignedTo, before.assignedTo])
  const changesFor = (t) => changedFields.map(field => ({
    field,
    label: t(`notify.task.fields.${field}`),
    from: formatTaskFieldValue(t, field, before[field], names),
    to: formatTaskFieldValue(t, field, task[field], names)
  }))
  const url = `/${family.slug}/tasks`

  await dispatchFamilyAlert({
    family,
    actor,
    action: ALERT_ACTIONS.TASK_UPDATED.code,
    actionLabel: ALERT_ACTIONS.TASK_UPDATED.label,
    title: (t) => t('notify.task.updatedTitle', { title: task.title }),
    targetType: 'task',
    targetId: task.id,
    push: {
      title: (t) => `✏️ ${t('notify.task.updatedTitle', { title: task.title })}`,
      // Les notes (texte long) ne sont que signalées dans le push ; leur contenu est dans l'email.
      body: (t) => [
        ...changesFor(t).map(c => c.field === 'notes' ? t('notify.task.notesChanged') : `${c.label} : ${c.to}`),
        t('notify.by', { name: authorLabel(t, actor, via) })
      ].join(' • '),
      url,
      recipientUserIds
    },
    email: {
      subject: (t) => `✏️ ${t('notify.task.updatedTitle', { title: task.title })}`,
      title: (t) => t('notify.task.updatedHeading'),
      badge: '✏️',
      detailsHtml: (t) => `
        <p style="margin: 0 0 10px 0; font-size: 15px; color: #1e293b;">
          ${t('notify.task.updatedIntro', { author: `<strong>${escapeHtml(authorLabel(t, actor, via))}</strong>`, title: `<strong>${escapeHtml(task.title)}</strong>` })}
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
          ${changesFor(t).map(c => `<li><strong>${t('notify.label', { label: c.label })}</strong> <span style="color:#94a3b8; text-decoration: line-through;">${escapeHtml(c.from)}</span> → <strong>${escapeHtml(c.to)}</strong></li>`).join('')}
        </ul>
      `,
      actionUrl: url,
      actionText: (t) => t('notify.task.viewTasks'),
      recipientUserIds
    }
  })
}

// Prévient la personne assignée d'une nouvelle tâche, par push et/ou email selon sa préférence
// « Tâches » — sauf si c'est elle qui l'a créée. Tâche de fond : ne doit pas faire échouer l'appelant.
const notifyTaskCreated = async ({ family, actor, task, via = null }) => {
  if (task.assignedTo == null || task.assignedTo === actor?.id) return
  const recipientUserIds = [task.assignedTo]

  const dueLabel = (t) => (task.dueDate ? formatTaskFieldValue(t, 'dueDate', task.dueDate) : null)
  const url = `/${family.slug}/tasks`

  await dispatchFamilyAlert({
    family,
    actor,
    action: ALERT_ACTIONS.TASK_CREATED.code,
    actionLabel: ALERT_ACTIONS.TASK_CREATED.label,
    title: (t) => t('notify.task.createdTitle', { title: task.title }),
    targetType: 'task',
    targetId: task.id,
    push: {
      title: (t) => `📋 ${t('notify.task.createdTitle', { title: task.title })}`,
      body: (t) => [
        t('notify.task.assignedToYou'),
        t('notify.task.points', { n: task.points }),
        dueLabel(t) ? t('notify.task.due', { date: dueLabel(t) }) : null,
        t('notify.task.addedBy', { name: authorLabel(t, actor, via) })
      ].filter(Boolean).join(' • '),
      url,
      recipientUserIds
    },
    email: {
      subject: (t) => `📋 ${t('notify.task.createdTitle', { title: task.title })}`,
      title: (t) => t('notify.task.createdHeading'),
      badge: '📋',
      detailsHtml: (t) => `
        <p style="margin: 0 0 10px 0; font-size: 15px; color: #1e293b;">
          ${t('notify.task.createdIntro', { author: `<strong>${escapeHtml(authorLabel(t, actor, via))}</strong>` })}
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
          <li><strong>${t('notify.label', { label: t('notify.task.fields.title') })}</strong> ${escapeHtml(task.title)}</li>
          <li><strong>${t('notify.label', { label: t('notify.task.fields.category') })}</strong> ${escapeHtml(translateValue(t, 'taskCategory', task.category || 'Maison'))}</li>
          <li><strong>${t('notify.label', { label: t('notify.task.fields.priority') })}</strong> ${escapeHtml(translateValue(t, 'taskPriority', task.priority || 'Moyenne'))}</li>
          <li><strong>${t('notify.label', { label: t('notify.task.fields.points') })}</strong> ${t('notify.task.points', { n: task.points })}</li>
          ${dueLabel(t) ? `<li><strong>${t('notify.label', { label: t('notify.task.fields.dueDate') })}</strong> ${escapeHtml(dueLabel(t))}</li>` : ''}
          ${task.notes ? `<li><strong>${t('notify.label', { label: t('notify.task.fields.notes') })}</strong> ${escapeHtml(task.notes).replace(/\n/g, '<br/>')}</li>` : ''}
        </ul>
      `,
      actionUrl: url,
      actionText: (t) => t('notify.task.viewMyTasks'),
      recipientUserIds
    }
  })
}

// Met à jour partiellement une tâche. Avec `family`, notifie la ou les personnes concernées
// (voir notifyTaskUpdated) en tâche de fond.
const updateTask = async ({ familyId, taskId, fields, family = null, actor = null, via = null }) => {
  const task = await Task.findOne({ id: Number(taskId), familyId })
  if (!task) return null

  const before = Object.fromEntries(TASK_TRACKED_FIELDS.map(f => [f, task[f]]))
  const { title, category, assignedTo, priority, points, dueDate, notes } = fields
  if (title !== undefined) task.title = String(title).trim()
  if (category !== undefined) task.category = category
  if (assignedTo !== undefined) task.assignedTo = Number(assignedTo)
  if (priority !== undefined) task.priority = priority
  if (points !== undefined) task.points = Number(points) || task.points
  if (dueDate !== undefined) task.dueDate = normalizeTaskDueDate(dueDate)
  if (notes !== undefined) task.notes = String(notes ?? '').trim()

  await task.save()

  if (family) {
    notifyTaskUpdated({ family, actor, task, before, via })
      .catch(err => console.error('[AlertLog] notifyTaskUpdated:', err.message))
  }
  return task
}

app.get('/api/tasks', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const tasks = await Task.find({ familyId: req.family._id }).sort({ createdAt: -1 })
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/tasks', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const newTask = new Task({
      familyId: req.family._id,
      id: Date.now(),
      title: req.body.title,
      category: req.body.category || 'Maison',
      assignedTo: Number(req.body.assignedTo),
      priority: req.body.priority || 'Moyenne',
      points: Number(req.body.points) || 10,
      completed: false,
      dueDate: normalizeTaskDueDate(req.body.dueDate),
      notes: String(req.body.notes ?? '').trim()
    })
    await newTask.save()

    notifyTaskCreated({ family: req.family, actor: req.user, task: newTask })
      .catch(err => console.error('[AlertLog] notifyTaskCreated:', err.message))

    res.status(201).json(newTask)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/tasks/:id/toggle', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const task = await toggleTaskCompletion({ familyId: req.family._id, taskId: req.params.id })
    if (!task) return res.status(404).json({ error: req.t('errors.taskNotFound') })
    res.json(task)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/tasks/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const task = await updateTask({ familyId: req.family._id, taskId: req.params.id, fields: req.body, family: req.family, actor: req.user })
    if (!task) return res.status(404).json({ error: req.t('errors.taskNotFound') })
    res.json(task)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/api/tasks/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    await Task.deleteOne({ id: Number(req.params.id), familyId: req.family._id })
    res.json({ message: req.t('messages.taskDeleted') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === EVENTS ROUTES ===
app.get('/api/events', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const events = await Event.find({ familyId: req.family._id }).sort({ date: 1 })
    res.json(events)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Crée un événement simple, ou une série récurrente (fan-out via getRecurrenceDates) avec génération
// optionnelle d'absences liées. Ne construit aucune notification — le contenu push/email diffère selon
// le contexte (route HTTP vs outil MCP) et reste à la charge de l'appelant. Partagée par la route HTTP
// et l'outil MCP create_event.
const createEventOrSeries = async ({ familyId, body, declaredBy, lang = null }) => {
  const { title, date, time, endTime, category, location, color, assignedTo, recurrence, generateAbsence, absenceSlots } = body
  const memberIdsInput = Array.isArray(body.memberIds) ? body.memberIds.map(Number) : []

  if (recurrence && recurrence.frequency) {
    const { frequency, endDate } = recurrence
    const interval = Math.max(1, Number(recurrence.interval) || 1)

    if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
      throw new TranslatableError('errors.recurrence.invalidFrequency')
    }
    if (!endDate || endDate < date) {
      throw new TranslatableError('errors.recurrence.endBeforeStart')
    }

    const { dates, truncated } = getRecurrenceDates(date, frequency, interval, endDate)
    if (dates.length === 0) {
      throw new TranslatableError('errors.recurrence.noOccurrence')
    }

    const recurrenceMeta = { frequency, interval, endDate }
    const baseId = Date.now()
    const createdEvents = []
    for (let i = 0; i < dates.length; i++) {
      const occurrence = new Event({
        familyId,
        id: baseId + i,
        title,
        date: dates[i],
        time,
        endTime,
        category: category || 'Famille',
        location,
        color: color || '#8b5cf6',
        assignedTo,
        memberIds: memberIdsInput,
        recurrenceId: baseId,
        recurrence: recurrenceMeta,
        icsToken: crypto.randomBytes(24).toString('hex')
      })
      await occurrence.save()
      createdEvents.push(occurrence)
    }

    const createdAbsences = []
    const hasSlot = absenceSlots && (absenceSlots.lunch || absenceSlots.dinner || absenceSlots.night)
    if (generateAbsence && hasSlot && memberIdsInput.length > 0) {
      let absId = baseId + dates.length
      for (const occurrence of createdEvents) {
        for (const memberId of memberIdsInput) {
          const abs = new Absence({
            familyId,
            id: absId++,
            memberId: Number(memberId),
            date: occurrence.date,
            type: 'absence',
            lunch: Boolean(absenceSlots.lunch),
            dinner: Boolean(absenceSlots.dinner),
            night: Boolean(absenceSlots.night),
            note: t(lang, 'notes.eventAbsence', { title }),
            declaredBy: declaredBy ?? null,
            eventId: occurrence.id,
            recurrenceId: baseId
          })
          await abs.save()
          createdAbsences.push(abs)
        }
      }
    }

    return {
      isRecurring: true,
      events: createdEvents,
      absences: createdAbsences,
      truncated,
      recurrenceId: baseId,
      frequency,
      interval,
      endDate,
      occurrenceCount: dates.length
    }
  }

  const newEvent = new Event({
    familyId,
    id: Date.now(),
    title,
    date,
    time,
    endTime,
    category: category || 'Famille',
    location,
    color: color || '#8b5cf6',
    assignedTo,
    memberIds: memberIdsInput,
    icsToken: crypto.randomBytes(24).toString('hex')
  })
  await newEvent.save()

  return { isRecurring: false, event: newEvent }
}

// « vendredi 25 septembre à 15:00 - 17:00 »
const eventWhen = (t, event) => {
  const date = readableDate(t, event.date)
  if (!event.time) return date
  return event.endTime
    ? t('notify.event.whenRange', { date, start: event.time, end: event.endTime })
    : t('notify.event.whenTime', { date, time: event.time })
}

// Notification (push + email avec liens d'agenda) d'un événement simple créé ou modifié
const notifyEventChanged = async ({ req, event, created }) => {
  const emailConfig = await getSmtpConfig()
  const baseServerUrl = (emailConfig?.serverUrl || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '')
  const icsDownloadUrl = (t) => `${baseServerUrl}/api/events/${event.id}/ics?token=${event.icsToken}&lang=${t.lang}`
  const author = (t) => authorLabel(t, req.user)
  const kind = created ? 'created' : 'updated'
  const badge = created ? '📅' : '✏️'
  const where = event.location ? ` (${event.location})` : ''

  await dispatchFamilyAlert({
    family: req.family,
    actor: req.user,
    action: created ? ALERT_ACTIONS.EVENT_CREATED.code : ALERT_ACTIONS.EVENT_UPDATED.code,
    actionLabel: created ? ALERT_ACTIONS.EVENT_CREATED.label : ALERT_ACTIONS.EVENT_UPDATED.label,
    title: (t) => t(`notify.event.${kind}Title`, { title: event.title }),
    targetType: 'event',
    targetId: event.id,
    push: {
      title: (t) => `${badge} ${t(`notify.event.${kind}Title`, { title: event.title })}`,
      body: (t) => `${eventWhen(t, event)}${where} • ${t(created ? 'notify.addedBy' : 'notify.updatedBy', { name: author(t) })}`,
      url: `/${req.family.slug}/calendar`,
      actions: (t) => [
        { action: 'open', title: t(created ? 'notify.event.pushView' : 'notify.event.pushViewCalendar') },
        { action: 'add-google', title: `📅 ${t(created ? 'notify.event.pushGoogle' : 'notify.event.pushUpdate')}` }
      ],
      googleCalendarUrl: (t) => generateServerGoogleCalendarUrl(event, t.lang)
    },
    email: {
      subject: (t) => `${badge} ${t(`notify.event.${kind}Subject`, { title: event.title })}`,
      title: (t) => t(`notify.event.${kind}Heading`),
      badge,
      detailsHtml: (t) => `
        <p style="margin: 0 0 10px 0; font-size: 15px; color: #1e293b;">
          ${t(`notify.event.${kind}Intro`, { author: `<strong>${escapeHtml(author(t))}</strong>` })}
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
          <li><strong>${t('notify.label', { label: t('notify.event.fields.title') })}</strong> ${escapeHtml(event.title)}</li>
          <li><strong>${t('notify.label', { label: t(created ? 'notify.event.fields.date' : 'notify.event.fields.newDate') })}</strong> ${escapeHtml(eventWhen(t, event))}</li>
          ${event.location ? `<li><strong>${t('notify.label', { label: t('notify.event.fields.location') })}</strong> ${escapeHtml(event.location)}</li>` : ''}
          <li><strong>${t('notify.label', { label: t('notify.event.fields.category') })}</strong> ${escapeHtml(translateValue(t, 'eventCategory', event.category || 'Famille'))}</li>
        </ul>
      `,
      actionUrl: `/${req.family.slug}/calendar`,
      actionText: (t) => t('notify.event.viewCalendar'),
      calendarData: (t) => ({
        googleUrl: generateServerGoogleCalendarUrl(event, t.lang),
        icsUrl: icsDownloadUrl(t),
        icsContent: generateServerIcsContent(event, t.lang),
        eventTitle: event.title
      })
    }
  })
}

app.post('/api/events', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    let result
    try {
      result = await createEventOrSeries({ familyId: req.family._id, body: req.body, declaredBy: req.user ? req.user.id : null, lang: req.lang })
    } catch (e) {
      return res.status(400).json({ error: localizeError(req, e) })
    }

    if (result.isRecurring) {
      const { events: createdEvents, absences: createdAbsences, truncated, recurrenceId, frequency, interval, endDate, occurrenceCount } = result

      // Une seule notification pour toute la série (pas une par occurrence)
      const author = (t) => authorLabel(t, req.user)
      const recurrenceLabel = (t) => t(`notify.event.every.${frequency}`, { n: interval })
      const title = escapeHtml(req.body.title)
      dispatchFamilyAlert({
        family: req.family,
        actor: req.user,
        action: ALERT_ACTIONS.EVENT_CREATED.code,
        actionLabel: ALERT_ACTIONS.EVENT_CREATED.label,
        title: (t) => t('notify.event.recurringCreatedTitle', { title: req.body.title }),
        targetType: 'event',
        targetId: recurrenceId,
        push: {
          title: (t) => `🔁 ${t('notify.event.recurringCreatedTitle', { title: req.body.title })}`,
          body: (t) => [
            t('notify.event.recurrenceUntil', { recurrence: recurrenceLabel(t), date: readableDate(t, endDate) }),
            t('notify.event.occurrences', { n: occurrenceCount }),
            t('notify.addedBy', { name: author(t) })
          ].join(' • '),
          url: `/${req.family.slug}/calendar`
        },
        email: {
          subject: (t) => `🔁 ${t('notify.event.recurringCreatedTitle', { title: req.body.title })}`,
          title: (t) => t('notify.event.recurringCreatedHeading'),
          badge: '🔁',
          detailsHtml: (t) => `
            <p style="margin: 0 0 10px 0; font-size: 15px; color: #1e293b;">
              ${t('notify.event.recurringCreatedIntro', { author: `<strong>${escapeHtml(author(t))}</strong>` })}
            </p>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
              <li><strong>${t('notify.label', { label: t('notify.event.fields.title') })}</strong> ${title}</li>
              <li><strong>${t('notify.label', { label: t('notify.event.fields.recurrence') })}</strong> ${t('notify.event.recurrenceUntil', { recurrence: recurrenceLabel(t), date: readableDate(t, endDate) })}</li>
              <li><strong>${t('notify.label', { label: t('notify.event.fields.occurrencesCreated') })}</strong> ${occurrenceCount}</li>
              ${req.body.location ? `<li><strong>${t('notify.label', { label: t('notify.event.fields.location') })}</strong> ${escapeHtml(req.body.location)}</li>` : ''}
            </ul>
          `,
          actionUrl: `/${req.family.slug}/calendar`,
          actionText: (t) => t('notify.event.viewCalendar')
        }
      }).catch(err => console.error('[AlertLog] dispatchFamilyAlert (event.created recurring):', err.message))

      return res.status(201).json({ events: createdEvents, absences: createdAbsences, truncated })
    }

    const newEvent = result.event
    notifyEventChanged({ req, event: newEvent, created: true })
      .catch(err => console.error('[AlertLog] dispatchFamilyAlert (event.created):', err.message))

    res.status(201).json(newEvent)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Modifie un événement simple, ou toute une série récurrente (scope: 'series') ; régénère les
// absences liées à la série si generateAbsence est explicitement fourni. Aucune notification ici
// (contenu push/email à charge de l'appelant). Partagée par la route HTTP et l'outil MCP update_event.
const updateEventOrSeries = async ({ familyId, eventId, body, declaredBy, lang = null }) => {
  const event = await Event.findOne({ id: Number(eventId), familyId })
  if (!event) return null

  const { title, date, time, endTime, category, location, color, assignedTo, memberIds, scope, generateAbsence, absenceSlots } = body

  if (scope === 'series' && event.recurrenceId) {
    const occurrences = await Event.find({ recurrenceId: event.recurrenceId, familyId })
    const finalMemberIds = memberIds !== undefined ? (Array.isArray(memberIds) ? memberIds.map(Number) : []) : null

    for (const occ of occurrences) {
      if (title) occ.title = title.trim()
      if (time !== undefined) occ.time = time
      if (endTime !== undefined) occ.endTime = endTime
      if (category) occ.category = category
      if (location !== undefined) occ.location = location
      if (color) occ.color = color
      if (assignedTo !== undefined) occ.assignedTo = assignedTo
      if (finalMemberIds !== null) occ.memberIds = finalMemberIds
      await occ.save()
    }

    let seriesAbsences
    if (generateAbsence !== undefined) {
      await Absence.deleteMany({ familyId, recurrenceId: event.recurrenceId })
      seriesAbsences = []
      const hasSlot = absenceSlots && (absenceSlots.lunch || absenceSlots.dinner || absenceSlots.night)
      const absenceMemberIds = finalMemberIds !== null ? finalMemberIds : event.memberIds
      if (generateAbsence && hasSlot && absenceMemberIds.length > 0) {
        let absId = Date.now()
        for (const occ of occurrences) {
          for (const memberId of absenceMemberIds) {
            const abs = await Absence.create({
              familyId,
              id: absId++,
              memberId: Number(memberId),
              date: occ.date,
              type: 'absence',
              lunch: Boolean(absenceSlots.lunch),
              dinner: Boolean(absenceSlots.dinner),
              night: Boolean(absenceSlots.night),
              note: t(lang, 'notes.eventAbsence', { title: occ.title }),
              declaredBy: declaredBy ?? null,
              eventId: occ.id,
              recurrenceId: event.recurrenceId
            })
            seriesAbsences.push(abs)
          }
        }
      }
    }

    return { isSeries: true, recurrenceId: event.recurrenceId, events: occurrences, absences: seriesAbsences }
  }

  if (title) event.title = title.trim()
  if (date) event.date = date
  if (time !== undefined) event.time = time
  if (endTime !== undefined) event.endTime = endTime
  if (category) event.category = category
  if (location !== undefined) event.location = location
  if (color) event.color = color
  if (assignedTo !== undefined) event.assignedTo = assignedTo
  if (memberIds !== undefined) event.memberIds = Array.isArray(memberIds) ? memberIds.map(Number) : []

  if (!event.icsToken) {
    event.icsToken = crypto.randomBytes(24).toString('hex')
  }
  await event.save()

  return { isSeries: false, event }
}

// Supprime un événement simple, ou toute une série récurrente (scope: 'series'), avec suppression
// en cascade des absences liées. Partagée par la route HTTP et l'outil MCP delete_event.
const deleteEventOrSeries = async ({ familyId, eventId, scope }) => {
  if (scope === 'series') {
    const event = await Event.findOne({ id: Number(eventId), familyId })
    if (event && event.recurrenceId) {
      const deleted = await Event.deleteMany({ recurrenceId: event.recurrenceId, familyId })
      await Absence.deleteMany({ recurrenceId: event.recurrenceId, familyId })
      return { deletedSeries: true, deletedCount: deleted.deletedCount }
    }
  }

  const deleted = await Event.deleteOne({ id: Number(eventId), familyId })
  await Absence.deleteMany({ eventId: Number(eventId), familyId })
  return { deletedSeries: false, deletedCount: deleted.deletedCount }
}

// PUT /api/events/:id (Modification d'un événement avec alertes push & email)
app.put('/api/events/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const eventId = Number(req.params.id)
    const result = await updateEventOrSeries({ familyId: req.family._id, eventId, body: req.body, declaredBy: req.user ? req.user.id : null, lang: req.lang })
    if (!result) return res.status(404).json({ error: req.t('errors.eventNotFound') })

    if (result.isSeries) {
      const { events: occurrences, absences: seriesAbsences, recurrenceId } = result
      const author = (t) => authorLabel(t, req.user)
      const seriesTitle = occurrences[0].title
      dispatchFamilyAlert({
        family: req.family,
        actor: req.user,
        action: ALERT_ACTIONS.EVENT_UPDATED.code,
        actionLabel: ALERT_ACTIONS.EVENT_UPDATED.label,
        title: (t) => t('notify.event.seriesUpdatedTitle', { title: seriesTitle }),
        targetType: 'event',
        targetId: recurrenceId,
        push: {
          title: (t) => `✏️ ${t('notify.event.seriesUpdatedShort', { title: seriesTitle })}`,
          body: (t) => `${t('notify.event.occurrencesUpdated', { n: occurrences.length })} • ${t('notify.updatedBy', { name: author(t) })}`,
          url: `/${req.family.slug}/calendar`
        },
        email: {
          subject: (t) => `✏️ ${t('notify.event.seriesUpdatedTitle', { title: seriesTitle })}`,
          title: (t) => t('notify.event.seriesUpdatedHeading'),
          badge: '✏️',
          detailsHtml: (t) => `
            <p style="margin: 0 0 10px 0; font-size: 15px; color: #1e293b;">
              ${t('notify.event.seriesUpdatedIntro', { author: `<strong>${escapeHtml(author(t))}</strong>` })}
            </p>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
              <li><strong>${t('notify.label', { label: t('notify.event.fields.title') })}</strong> ${escapeHtml(seriesTitle)}</li>
              <li><strong>${t('notify.label', { label: t('notify.event.fields.occurrencesConcerned') })}</strong> ${occurrences.length}</li>
            </ul>
          `,
          actionUrl: `/${req.family.slug}/calendar`,
          actionText: (t) => t('notify.event.viewCalendar')
        }
      }).catch(err => console.error('[AlertLog] dispatchFamilyAlert (event.updated series):', err.message))

      return res.json({ events: occurrences, ...(seriesAbsences !== undefined ? { absences: seriesAbsences } : {}) })
    }

    const event = result.event
    notifyEventChanged({ req, event, created: false })
      .catch(err => console.error('[AlertLog] dispatchFamilyAlert (event.updated):', err.message))

    res.json(event)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/events/:id/ics (Téléchargement direct du fichier iCalendar pour ajout à Apple / Outlook)
// Accès via jeton opaque (?token=) plutôt que par session : ce lien est destiné à être ouvert
// directement par une application calendrier externe, incapable d'envoyer un header Authorization.
app.get('/api/events/:id/ics', async (req, res) => {
  try {
    const token = req.query.token
    if (!token) return res.status(404).send(req.t('errors.eventNotFound'))

    const event = await Event.findOne({ id: Number(req.params.id), icsToken: token })
    if (!event) return res.status(404).send(req.t('errors.eventNotFound'))

    const icsContent = generateServerIcsContent(event, req.query.lang)
    const sanitizedTitle = (event.title || 'evenement').toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedTitle || 'evenement'}.ics"`)
    res.send(icsContent)
  } catch (err) {
    res.status(500).send(req.t('errors.icsFailed'))
  }
})

app.delete('/api/events/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const eventId = Number(req.params.id)
    const scope = req.query.scope || req.body?.scope

    const result = await deleteEventOrSeries({ familyId: req.family._id, eventId, scope })
    res.json({ message: result.deletedSeries ? req.t('messages.seriesDeleted') : req.t('messages.eventDeleted') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === SHOPPING CATEGORIES ROUTES ===
const DEFAULT_CATEGORIES = [
  { name: 'Frais',           icon: '🧀', rank: 1 },
  { name: 'Épicerie',        icon: '🥫', rank: 2 },
  { name: 'Fruits & Légumes',icon: '🥦', rank: 3 },
  { name: 'Boulangerie',     icon: '🥖', rank: 4 },
  { name: 'Boissons',        icon: '🧃', rank: 5 },
  { name: 'Maison',          icon: '🏠', rank: 6 },
  { name: 'Autre',           icon: '🛒', rank: 7 },
]

// Retourne les catégories de courses de la famille, en semant les 7 catégories par défaut au premier accès.
const getOrSeedShoppingCategories = async (familyId) => {
  let cats = await ShoppingCategory.find({ familyId }).sort({ rank: 1 })
  if (cats.length === 0) {
    const docs = DEFAULT_CATEGORIES.map((c, i) => ({ ...c, familyId, id: Date.now() + i }))
    cats = await ShoppingCategory.insertMany(docs)
  }
  return cats
}

app.get('/api/shopping-categories', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const cats = await getOrSeedShoppingCategories(req.family._id)
    res.json(cats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/shopping-categories', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const maxRank = await ShoppingCategory.findOne({ familyId: req.family._id }).sort({ rank: -1 })
    const cat = new ShoppingCategory({
      familyId: req.family._id,
      id: Date.now(),
      name: req.body.name,
      icon: req.body.icon || '🛒',
      rank: maxRank ? maxRank.rank + 1 : 1
    })
    await cat.save()
    res.status(201).json(cat)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/shopping-categories/reorder', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const updates = req.body
    await Promise.all(updates.map(({ id, rank }) =>
      ShoppingCategory.updateOne({ id: Number(id), familyId: req.family._id }, { rank })
    ))
    const cats = await ShoppingCategory.find({ familyId: req.family._id }).sort({ rank: 1 })
    res.json(cats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/shopping-categories/:id', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const cat = await ShoppingCategory.findOne({ id: Number(req.params.id), familyId: req.family._id })
    if (!cat) return res.status(404).json({ error: req.t('errors.categoryNotFound') })
    if (req.body.name !== undefined) cat.name = req.body.name
    if (req.body.icon !== undefined) cat.icon = req.body.icon
    if (req.body.rank !== undefined) cat.rank = Number(req.body.rank)
    await cat.save()
    res.json(cat)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/api/shopping-categories/:id', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    await ShoppingCategory.deleteOne({ id: Number(req.params.id), familyId: req.family._id })
    res.json({ message: req.t('messages.categoryDeleted') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === SHOPPING ROUTES ===
app.get('/api/shopping', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const items = await ShoppingItem.find({ familyId: req.family._id }).sort({ createdAt: -1 })
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/shopping', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const newItem = new ShoppingItem({
      familyId: req.family._id,
      id: Date.now(),
      name: req.body.name,
      category: req.body.category || 'Frais',
      quantity: Number(req.body.quantity) || 1,
      urgent: Boolean(req.body.urgent),
      checked: false,
      mealId: req.body.mealId ? Number(req.body.mealId) : null
    })
    await newItem.save()
    res.status(201).json(newItem)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/shopping/:id/toggle', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const item = await ShoppingItem.findOne({ id: Number(req.params.id), familyId: req.family._id })
    if (!item) return res.status(404).json({ error: req.t('errors.itemNotFound') })

    item.checked = !item.checked
    await item.save()
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/shopping/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const item = await ShoppingItem.findOne({ id: Number(req.params.id), familyId: req.family._id })
    if (!item) return res.status(404).json({ error: req.t('errors.itemNotFound') })

    if (req.body.name !== undefined)     item.name     = req.body.name
    if (req.body.category !== undefined) item.category = req.body.category
    if (req.body.quantity !== undefined) item.quantity = Number(req.body.quantity)
    if (req.body.urgent !== undefined)   item.urgent   = Boolean(req.body.urgent)
    if (req.body.mealId !== undefined)   item.mealId   = req.body.mealId ? Number(req.body.mealId) : null

    await item.save()
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/shopping/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    await ShoppingItem.deleteOne({ id: Number(req.params.id), familyId: req.family._id })
    res.json({ message: req.t('messages.itemDeleted') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === ABSENCES & MEALS ROUTES ===

// Crée ou met à jour (upsert par memberId+date+type) une déclaration de présence/absence.
// Partagée par la route HTTP et l'outil MCP set_presence_or_absence pour garantir la même
// sémantique d'upsert (re-déclarer le même type le même jour met à jour la ligne existante).
//
// Le type fait partie de la clé : depuis que la présence habituelle peut varier d'un créneau à
// l'autre, il faut pouvoir être absent à midi ET exceptionnellement présent le soir le même
// jour. Une ligne 'absence' et une ligne 'presence' coexistent donc pour un même (membre, date) ;
// c'est pickDeclaredRecord() (shared/presence.js) qui tranche à la lecture si elles se
// chevauchent sur un créneau.
const upsertAbsenceRecord = async ({ familyId, memberId, date, type, lunch, dinner, night, note, declaredBy, eventId }) => {
  const recordType = type === 'presence' ? 'presence' : 'absence'
  const trimmedDate = date.trim()

  let record = await Absence.findOne({ memberId: Number(memberId), date: trimmedDate, type: recordType, familyId })
  if (record) {
    record.type = recordType
    record.lunch = Boolean(lunch)
    record.dinner = Boolean(dinner)
    record.night = Boolean(night)
    if (note !== undefined) record.note = (note || '').trim()
    record.declaredBy = declaredBy ?? null
    if (eventId !== undefined) record.eventId = eventId
    await record.save()
    return { absence: record, isNew: false }
  }

  record = new Absence({
    familyId,
    id: Date.now(),
    memberId: Number(memberId),
    date: trimmedDate,
    type: recordType,
    lunch: Boolean(lunch),
    dinner: Boolean(dinner),
    night: Boolean(night),
    note: (note || '').trim(),
    declaredBy: declaredBy ?? null,
    eventId: eventId || null
  })
  await record.save()
  return { absence: record, isNew: true }
}

// Supprime une absence/présence si les 3 créneaux sont désactivés (une ligne "vide" n'a pas de sens).
const deleteAbsenceIfEmptySlots = async (absence, familyId) => {
  if (!absence.lunch && !absence.dinner && !absence.night) {
    await Absence.deleteOne({ id: absence.id, familyId })
    return true
  }
  return false
}

// Déplacer une déclaration (changement de membre, de date ou de type) peut désormais l'amener
// sur les mêmes coordonnées qu'une ligne sœur, puisque la clé d'unicité logique inclut le type.
// Plutôt que de renvoyer un conflit — incompréhensible pour qui déclare juste une absence — on
// fusionne les créneaux dans la ligne existante et on supprime celle qu'on vient de déplacer.
// Retourne la ligne qui fait foi.
const mergeAbsenceIntoSibling = async (absence, familyId) => {
  const sibling = await Absence.findOne({
    familyId,
    memberId: absence.memberId,
    date: absence.date,
    type: absence.type,
    id: { $ne: absence.id }
  })
  if (!sibling) return absence

  sibling.lunch = sibling.lunch || absence.lunch
  sibling.dinner = sibling.dinner || absence.dinner
  sibling.night = sibling.night || absence.night
  if (absence.note) sibling.note = absence.note
  sibling.declaredBy = absence.declaredBy ?? sibling.declaredBy
  await sibling.save()
  await Absence.deleteOne({ id: absence.id, familyId })
  return sibling
}

app.get('/api/absences', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const absences = await Absence.find({ familyId: req.family._id }).sort({ date: 1 })
    res.json(absences)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/absences', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const { memberId, date, type, lunch, dinner, night, note, eventId } = req.body

    if (!memberId || !date) {
      return res.status(400).json({ error: req.t('errors.memberDateRequired') })
    }

    if (!lunch && !dinner && !night) {
      return res.status(400).json({ error: req.t('errors.selectSlot') })
    }

    const recordType = type === 'presence' ? 'presence' : 'absence'

    const notifyAbsenceOrPresence = async (recType, mId, dStr, l, din, n, nt, absenceId) => {
      try {
        const member = await User.findOne({ id: Number(mId) })
        const isSelf = req.user && req.user.id === Number(mId)
        const kind = recType === 'presence' ? 'presence' : 'absence'
        const badge = kind === 'presence' ? '🟢' : '🚫'
        const texts = (t) => {
          const slots = [l && 'lunch', din && 'dinner', n && 'night'].filter(Boolean).map(slot => t(`notify.slots.${slot}`))
          const params = {
            member: member ? member.firstName : t('notify.aMember'),
            author: authorLabel(t, req.user),
            date: readableDate(t, dStr.trim()),
            slots: slots.length > 0 ? slots.join(', ') : t('notify.slots.day')
          }
          return { params, who: isSelf ? 'Self' : 'Other' }
        }
        const noteStr = nt ? ` • ${nt.trim()}` : ''

        await dispatchFamilyAlert({
          family: req.family,
          actor: req.user,
          action: kind === 'presence' ? ALERT_ACTIONS.PRESENCE_CREATED.code : ALERT_ACTIONS.ABSENCE_CREATED.code,
          actionLabel: kind === 'presence' ? ALERT_ACTIONS.PRESENCE_CREATED.label : ALERT_ACTIONS.ABSENCE_CREATED.label,
          title: (t) => `${badge} ${t(`notify.${kind}.title`, texts(t).params)}`,
          targetType: 'absence',
          targetId: absenceId,
          push: {
            title: (t) => `${badge} ${t(`notify.${kind}.title`, texts(t).params)}`,
            body: (t) => `${t(`notify.${kind}.body${texts(t).who}`, texts(t).params)}${noteStr}`,
            url: `/${req.family.slug}/absences`
          },
          email: {
            subject: (t) => `${badge} ${t(`notify.${kind}.subject${texts(t).who}`, texts(t).params)}`,
            title: (t) => t(`notify.${kind}.heading`),
            badge,
            detailsHtml: (t) => {
              const { params, who } = texts(t)
              const html = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, escapeHtml(v)]))
              return `
                <p style="margin: 0 0 10px 0; font-size: 15px; color: #1e293b;">
                  ${t(`notify.${kind}.intro${who}`, { member: `<strong>${html.member}</strong>`, author: `<strong>${html.author}</strong>` })}
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
                  <li><strong>${t('notify.label', { label: t('notify.fields.member') })}</strong> ${html.member}</li>
                  <li><strong>${t('notify.label', { label: t('notify.fields.date') })}</strong> ${html.date}</li>
                  <li><strong>${t('notify.label', { label: t('notify.fields.slots') })}</strong> ${html.slots}</li>
                  ${!isSelf ? `<li><strong>${t('notify.label', { label: t('notify.fields.reportedBy') })}</strong> ${html.author}</li>` : ''}
                  ${nt ? `<li><strong>${t('notify.label', { label: t('notify.fields.note') })}</strong> ${escapeHtml(nt.trim())}</li>` : ''}
                </ul>
              `
            },
            actionUrl: `/${req.family.slug}/absences`,
            actionText: (t) => t(`notify.${kind}.action`)
          }
        })
      } catch (e) {
        console.error('[WebPush] Erreur notification absence/présence:', e.message)
      }
    }

    const { absence, isNew } = await upsertAbsenceRecord({
      familyId: req.family._id,
      memberId,
      date,
      type,
      lunch,
      dinner,
      night,
      note,
      eventId,
      declaredBy: req.user ? req.user.id : null
    })

    notifyAbsenceOrPresence(absence.type, memberId, date, lunch, dinner, night, note, absence.id)
    res.status(isNew ? 201 : 200).json(absence)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/absences/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const absence = await Absence.findOne({ id: Number(req.params.id), familyId: req.family._id })
    if (!absence) return res.status(404).json({ error: req.t('errors.absenceNotFound') })

    const isAuthorized = absence.memberId === req.user.id || absence.declaredBy === req.user.id || req.membership?.isAdmin || req.user?.isSuperAdmin
    if (!isAuthorized) {
      return res.status(403).json({ error: req.t('errors.ownAbsencesEditOnly') })
    }

    const { memberId, date, type, lunch, dinner, night, note } = req.body
    const previousCoords = `${absence.memberId}|${absence.date}|${absence.type}`
    if (memberId !== undefined && (req.membership?.isAdmin || req.user?.isSuperAdmin)) absence.memberId = Number(memberId)
    if (date) absence.date = date.trim()
    if (type && ['absence', 'presence'].includes(type)) absence.type = type
    if (lunch !== undefined) absence.lunch = Boolean(lunch)
    if (dinner !== undefined) absence.dinner = Boolean(dinner)
    if (night !== undefined) absence.night = Boolean(night)
    if (note !== undefined) absence.note = note.trim()

    if (!absence.lunch && !absence.dinner && !absence.night) {
      await deleteAbsenceIfEmptySlots(absence, req.family._id)
      return res.json({ deleted: true, message: req.t('messages.absenceDeletedNoSlot') })
    }

    await absence.save()

    // La déclaration a changé de coordonnées : elle peut recouvrir une ligne sœur existante.
    const moved = previousCoords !== `${absence.memberId}|${absence.date}|${absence.type}`
    const result = moved ? await mergeAbsenceIntoSibling(absence, req.family._id) : absence
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/absences/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const absence = await Absence.findOne({ id: Number(req.params.id), familyId: req.family._id })
    if (!absence) return res.status(404).json({ error: req.t('errors.absenceNotFound') })

    const isAuthorized = absence.memberId === req.user.id || absence.declaredBy === req.user.id || req.membership?.isAdmin || req.user?.isSuperAdmin
    if (!isAuthorized) {
      return res.status(403).json({ error: req.t('errors.ownAbsencesDeleteOnly') })
    }

    await Absence.deleteOne({ id: Number(req.params.id), familyId: req.family._id })
    res.json({ message: req.t('messages.absenceDeleted') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === LONG ABSENCES ROUTES (ABSENCES LONGUES SUR PLAGE DE DATES) ===
const getDatesRange = (startDateStr, endDateStr) => {
  const dates = []
  const [sy, sm, sd] = startDateStr.split('-').map(Number)
  const [ey, em, ed] = endDateStr.split('-').map(Number)
  const curr = new Date(Date.UTC(sy, sm - 1, sd))
  const end = new Date(Date.UTC(ey, em - 1, ed))
  while (curr <= end) {
    const y = curr.getUTCFullYear()
    const m = String(curr.getUTCMonth() + 1).padStart(2, '0')
    const d = String(curr.getUTCDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    curr.setUTCDate(curr.getUTCDate() + 1)
  }
  return dates
}

const computeSlotsForDate = (dateStr, startDate, startSlot, endDate, endSlot) => {
  const slotIndices = { lunch: 0, dinner: 1, night: 2 }
  const sIdx = slotIndices[startSlot] ?? 0
  const eIdx = slotIndices[endSlot] ?? 2

  let lunch = false
  let dinner = false
  let night = false

  if (startDate === endDate) {
    lunch = sIdx <= 0 && eIdx >= 0
    dinner = sIdx <= 1 && eIdx >= 1
    night = sIdx <= 2 && eIdx >= 2
  } else if (dateStr === startDate) {
    lunch = sIdx <= 0
    dinner = sIdx <= 1
    night = sIdx <= 2
  } else if (dateStr === endDate) {
    lunch = eIdx >= 0
    dinner = eIdx >= 1
    night = eIdx >= 2
  } else {
    lunch = true
    dinner = true
    night = true
  }

  return { lunch, dinner, night }
}

// (Re)génère les lignes Absence journalières couvrant une absence longue. Supprime d'abord toute
// ligne déjà taguée avec ce longAbsenceId (no-op à la création, purge+régénération à la modification),
// ce qui rend la fonction idempotente et réutilisable telle quelle par create/update_long_absence (MCP).
const regenerateLongAbsenceDailyRows = async ({ familyId, longAbsenceId, memberId, startDate, startSlot, endDate, endSlot, note, declaredBy }) => {
  await Absence.deleteMany({ familyId, longAbsenceId })

  const dates = getDatesRange(startDate, endDate)
  const rows = []
  let baseId = Date.now() + 1

  for (const dStr of dates) {
    const { lunch, dinner, night } = computeSlotsForDate(dStr, startDate, startSlot, endDate, endSlot)
    if (!lunch && !dinner && !night) continue

    // Cible explicitement les lignes d'absence : sans le type dans la clé, une absence longue
    // écraserait une présence exceptionnelle saisie auparavant pour le même jour.
    let existing = await Absence.findOne({ memberId: Number(memberId), date: dStr, type: 'absence', familyId })
    if (existing) {
      existing.type = 'absence'
      existing.lunch = lunch
      existing.dinner = dinner
      existing.night = night
      existing.longAbsenceId = longAbsenceId
      if (note !== undefined) existing.note = (note || '').trim()
      existing.declaredBy = declaredBy ?? null
      await existing.save()
      rows.push(existing)
    } else {
      const newAbs = new Absence({
        familyId,
        id: baseId++,
        memberId: Number(memberId),
        date: dStr,
        type: 'absence',
        lunch,
        dinner,
        night,
        note: (note || '').trim(),
        declaredBy: declaredBy ?? null,
        longAbsenceId
      })
      await newAbs.save()
      rows.push(newAbs)
    }
  }

  return rows
}

app.get('/api/long-absences', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const list = await LongAbsence.find({ familyId: req.family._id }).sort({ startDate: 1, createdAt: 1 })
    res.json(list)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/long-absences', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const { memberId, startDate, startSlot, endDate, endSlot, note } = req.body

    if (!memberId || !startDate || !endDate) {
      return res.status(400).json({ error: req.t('errors.longAbsenceFieldsRequired') })
    }

    const slotIndices = { lunch: 0, dinner: 1, night: 2 }
    const validSlot = (s) => ['lunch', 'dinner', 'night'].includes(s)
    const sSlot = validSlot(startSlot) ? startSlot : 'lunch'
    const eSlot = validSlot(endSlot) ? endSlot : 'night'

    if (startDate > endDate) {
      return res.status(400).json({ error: req.t('errors.endDateBeforeStart') })
    }

    if (startDate === endDate && slotIndices[sSlot] > slotIndices[eSlot]) {
      return res.status(400).json({ error: req.t('errors.endSlotBeforeStart') })
    }

    const longAbsence = new LongAbsence({
      familyId: req.family._id,
      id: Date.now(),
      memberId: Number(memberId),
      startDate: startDate.trim(),
      startSlot: sSlot,
      endDate: endDate.trim(),
      endSlot: eSlot,
      note: (note || '').trim(),
      declaredBy: req.user ? req.user.id : null
    })

    await longAbsence.save()

    const dates = getDatesRange(startDate.trim(), endDate.trim())
    const createdOrUpdatedAbsences = await regenerateLongAbsenceDailyRows({
      familyId: req.family._id,
      longAbsenceId: longAbsence.id,
      memberId,
      startDate: startDate.trim(),
      startSlot: sSlot,
      endDate: endDate.trim(),
      endSlot: eSlot,
      note,
      declaredBy: req.user ? req.user.id : null
    })

    // Consolidated notification
    try {
      const member = await User.findOne({ id: Number(memberId) })
      const isSelf = req.user && req.user.id === Number(memberId)
      const who = isSelf ? 'Self' : 'Other'
      const paramsFor = (t) => ({
        member: member ? member.firstName : t('notify.aMember'),
        author: authorLabel(t, req.user),
        period: t('notify.longAbsence.period', {
          start: readableDate(t, startDate.trim()), startSlot: t(`notify.slots.${sSlot}`),
          end: readableDate(t, endDate.trim()), endSlot: t(`notify.slots.${eSlot}`)
        })
      })
      const noteStr = note ? ` • ${note.trim()}` : ''

      dispatchFamilyAlert({
        family: req.family,
        actor: req.user,
        action: ALERT_ACTIONS.LONG_ABSENCE_CREATED.code,
        actionLabel: ALERT_ACTIONS.LONG_ABSENCE_CREATED.label,
        title: (t) => `🚫 ${t('notify.longAbsence.title', paramsFor(t))}`,
        targetType: 'long_absence',
        targetId: longAbsence.id,
        push: {
          title: (t) => `🚫 ${t('notify.longAbsence.title', paramsFor(t))}`,
          body: (t) => `${t(`notify.longAbsence.body${who}`, paramsFor(t))}${noteStr}`,
          url: `/${req.family.slug}/absences`
        },
        email: {
          subject: (t) => `🚫 ${t(`notify.longAbsence.subject${who}`, paramsFor(t))}`,
          title: (t) => t('notify.longAbsence.heading'),
          badge: '🚫',
          detailsHtml: (t) => {
            const html = Object.fromEntries(Object.entries(paramsFor(t)).map(([k, v]) => [k, escapeHtml(v)]))
            return `
            <p style="margin: 0 0 10px 0; font-size: 15px; color: #1e293b;">
              ${t(`notify.longAbsence.intro${who}`, { member: `<strong>${html.member}</strong>`, author: `<strong>${html.author}</strong>` })}
            </p>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
              <li><strong>${t('notify.label', { label: t('notify.fields.member') })}</strong> ${html.member}</li>
              <li><strong>${t('notify.label', { label: t('notify.fields.period') })}</strong> ${html.period}</li>
              <li><strong>${t('notify.label', { label: t('notify.fields.days') })}</strong> ${dates.length}</li>
              ${!isSelf ? `<li><strong>${t('notify.label', { label: t('notify.fields.reportedBy') })}</strong> ${html.author}</li>` : ''}
              ${note ? `<li><strong>${t('notify.label', { label: t('notify.fields.reason') })}</strong> ${escapeHtml(note.trim())}</li>` : ''}
            </ul>
          `
          },
          actionUrl: `/${req.family.slug}/absences`,
          actionText: (t) => t('notify.presence.action')
        }
      }).catch(err => console.error('[AlertLog] dispatchFamilyAlert (absence.long):', err.message))
    } catch (e) {
      console.error('[WebPush] Erreur notification absence longue:', e.message)
    }

    res.status(201).json({ longAbsence, absences: createdOrUpdatedAbsences })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/long-absences/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const longAbsence = await LongAbsence.findOne({ id: Number(req.params.id), familyId: req.family._id })
    if (!longAbsence) return res.status(404).json({ error: req.t('errors.longAbsenceNotFound') })

    const isAuthorized = longAbsence.memberId === req.user.id || longAbsence.declaredBy === req.user.id || req.membership?.isAdmin || req.user?.isSuperAdmin
    if (!isAuthorized) {
      return res.status(403).json({ error: req.t('errors.ownLongAbsencesEditOnly') })
    }

    const { memberId, startDate, startSlot, endDate, endSlot, note } = req.body

    const targetMemberId = memberId !== undefined ? Number(memberId) : longAbsence.memberId
    const targetStartDate = startDate !== undefined ? startDate.trim() : longAbsence.startDate
    const targetEndDate = endDate !== undefined ? endDate.trim() : longAbsence.endDate
    const slotIndices = { lunch: 0, dinner: 1, night: 2 }
    const validSlot = (s) => ['lunch', 'dinner', 'night'].includes(s)
    const targetStartSlot = validSlot(startSlot) ? startSlot : longAbsence.startSlot
    const targetEndSlot = validSlot(endSlot) ? endSlot : longAbsence.endSlot

    if (targetStartDate > targetEndDate) {
      return res.status(400).json({ error: req.t('errors.endDateBeforeStart') })
    }

    if (targetStartDate === targetEndDate && slotIndices[targetStartSlot] > slotIndices[targetEndSlot]) {
      return res.status(400).json({ error: req.t('errors.endSlotBeforeStart') })
    }

    // Supprime puis régénère les lignes Absence journalières liées à cette absence longue
    const createdOrUpdatedAbsences = await regenerateLongAbsenceDailyRows({
      familyId: req.family._id,
      longAbsenceId: longAbsence.id,
      memberId: targetMemberId,
      startDate: targetStartDate,
      startSlot: targetStartSlot,
      endDate: targetEndDate,
      endSlot: targetEndSlot,
      note,
      declaredBy: req.user ? req.user.id : null
    })

    // Update LongAbsence document
    longAbsence.memberId = targetMemberId
    longAbsence.startDate = targetStartDate
    longAbsence.startSlot = targetStartSlot
    longAbsence.endDate = targetEndDate
    longAbsence.endSlot = targetEndSlot
    if (note !== undefined) longAbsence.note = (note || '').trim()
    longAbsence.declaredBy = req.user ? req.user.id : null
    await longAbsence.save()

    res.json({ longAbsence, absences: createdOrUpdatedAbsences })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/api/long-absences/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const longAbsence = await LongAbsence.findOne({ id: Number(req.params.id), familyId: req.family._id })
    if (!longAbsence) return res.status(404).json({ error: req.t('errors.longAbsenceNotFound') })

    const isAuthorized = longAbsence.memberId === req.user.id || longAbsence.declaredBy === req.user.id || req.membership?.isAdmin || req.user?.isSuperAdmin
    if (!isAuthorized) {
      return res.status(403).json({ error: req.t('errors.ownLongAbsencesDeleteOnly') })
    }

    // Cascade delete of daily absence slots
    const deleteResult = await Absence.deleteMany({ familyId: req.family._id, longAbsenceId: longAbsence.id })
    await LongAbsence.deleteOne({ _id: longAbsence._id })

    res.json({ 
      success: true, 
      message: req.t('messages.longAbsenceDeleted'), 
      deletedId: longAbsence.id,
      deletedAbsencesCount: deleteResult.deletedCount 
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === MEAL GUESTS ROUTES (INVITÉS AUX REPAS) ===

// Crée un ou plusieurs invités (batch depuis `name` comma-separated ou `names[]`) pour un repas.
// Partagée par la route HTTP et l'outil MCP add_meal_guests.
const createMealGuestsBatch = async ({ familyId, name, names, date, lunch, dinner, night, invitedBy, note, fallbackHostId }) => {
  let guestNames = []
  if (Array.isArray(names) && names.length > 0) {
    guestNames = names.map(n => String(n).trim()).filter(Boolean)
  } else if (name && typeof name === 'string') {
    guestNames = name.split(',').map(n => n.trim()).filter(Boolean)
  }

  if (guestNames.length === 0) {
    throw new TranslatableError('errors.guestNameRequired')
  }

  const hostId = invitedBy ? Number(invitedBy) : fallbackHostId

  const createdGuests = []
  for (let i = 0; i < guestNames.length; i++) {
    const newGuest = new MealGuest({
      familyId,
      id: Date.now() + i + Math.floor(Math.random() * 100),
      name: guestNames[i],
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

  return createdGuests
}

app.get('/api/meal-guests', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const guests = await MealGuest.find({ familyId: req.family._id }).sort({ date: 1, createdAt: 1 })
    res.json(guests)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/meal-guests', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const { name, names, date, lunch, dinner, night, invitedBy, note } = req.body

    if (!date) {
      return res.status(400).json({ error: req.t('errors.dateRequired') })
    }

    if (!lunch && !dinner && !night) {
      return res.status(400).json({ error: req.t('errors.selectSlot') })
    }

    let createdGuests
    try {
      createdGuests = await createMealGuestsBatch({
        familyId: req.family._id, name, names, date, lunch, dinner, night, invitedBy, note,
        fallbackHostId: req.user.id
      })
    } catch (e) {
      return res.status(400).json({ error: localizeError(req, e) })
    }

    const guestNames = createdGuests.map(g => g.name)
    const hostId = createdGuests[0]?.invitedBy

    // Déclenchement notification push pour nouvel invité
    try {
      const host = await User.findOne({ id: hostId })
      const namesStr = guestNames.join(', ')
      const noteStr = note ? ` • ${note.trim()}` : ''
      const paramsFor = (t) => {
        const slots = [lunch && 'lunch', dinner && 'dinner', night && 'night'].filter(Boolean).map(slot => t(`notify.slots.${slot}`))
        return {
          names: namesStr,
          n: guestNames.length,
          host: host ? host.firstName : authorLabel(t, req.user),
          date: readableDate(t, date.trim()),
          slots: slots.length > 0 ? slots.join(', ') : t('notify.slots.meal')
        }
      }

      dispatchFamilyAlert({
        family: req.family,
        actor: req.user,
        action: ALERT_ACTIONS.MEAL_GUEST_CREATED.code,
        actionLabel: ALERT_ACTIONS.MEAL_GUEST_CREATED.label,
        title: (t) => t('notify.guest.title', paramsFor(t)),
        targetType: 'meal_guest',
        targetId: createdGuests[0]?.id,
        push: {
          title: (t) => `🍽️ ${t('notify.guest.title', paramsFor(t))}`,
          body: (t) => `${t('notify.guest.body', paramsFor(t))}${noteStr}`,
          url: `/${req.family.slug}/absences`
        },
        email: {
          subject: (t) => `🍽️ ${t('notify.guest.subject', paramsFor(t))}`,
          title: (t) => t('notify.guest.heading'),
          badge: '🍽️',
          detailsHtml: (t) => {
            const params = paramsFor(t)
            return `
            <p style="margin: 0 0 10px 0; font-size: 15px; color: #1e293b;">
              ${t('notify.guest.intro', { host: `<strong>${escapeHtml(params.host)}</strong>` })}
            </p>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
              <li><strong>${t('notify.label', { label: t('notify.fields.guests') })}</strong> ${escapeHtml(params.names)}</li>
              <li><strong>${t('notify.label', { label: t('notify.fields.date') })}</strong> ${escapeHtml(params.date)}</li>
              <li><strong>${t('notify.label', { label: t('notify.fields.slotsShort') })}</strong> ${escapeHtml(params.slots)}</li>
              ${note ? `<li><strong>${t('notify.label', { label: t('notify.fields.note') })}</strong> ${escapeHtml(note.trim())}</li>` : ''}
            </ul>
          `
          },
          actionUrl: `/${req.family.slug}/absences`,
          actionText: (t) => t('notify.guest.action')
        }
      }).catch(err => console.error('[AlertLog] dispatchFamilyAlert (meal_guest.created):', err.message))
    } catch (e) {
      console.error('[WebPush] Erreur notification invité:', e.message)
    }

    if (createdGuests.length === 1) {
      res.status(201).json(createdGuests[0])
    } else {
      res.status(201).json(createdGuests)
    }
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/meal-guests/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const guest = await MealGuest.findOne({ id: Number(req.params.id), familyId: req.family._id })
    if (!guest) return res.status(404).json({ error: req.t('errors.guestNotFound') })

    const { name, date, lunch, dinner, night, invitedBy, note } = req.body
    if (name) guest.name = name.trim()
    if (date) guest.date = date.trim()
    if (lunch !== undefined) guest.lunch = Boolean(lunch)
    if (dinner !== undefined) guest.dinner = Boolean(dinner)
    if (night !== undefined) guest.night = Boolean(night)
    if (invitedBy !== undefined) guest.invitedBy = invitedBy ? Number(invitedBy) : null
    if (note !== undefined) guest.note = note.trim()

    if (!guest.lunch && !guest.dinner && !guest.night) {
      await MealGuest.deleteOne({ id: guest.id, familyId: req.family._id })
      return res.json({ deleted: true, message: req.t('messages.guestDeletedNoSlot') })
    }

    await guest.save()
    res.json(guest)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/meal-guests/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    await MealGuest.deleteOne({ id: Number(req.params.id), familyId: req.family._id })
    res.json({ message: req.t('messages.guestDeleted') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === MEALS OF THE WEEK ROUTES ===

// Crée des articles de courses à partir d'une liste d'ingrédients liés à un repas (string ou
// {name, category, quantity}). Partagée par la route HTTP et l'outil MCP create_meal.
const createShoppingItemsForIngredients = async ({ familyId, mealId, ingredients }) => {
  const createdIngredients = []
  if (!Array.isArray(ingredients) || ingredients.length === 0) return createdIngredients

  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i]
    const name = typeof ing === 'string' ? ing.trim() : (ing.name ? String(ing.name).trim() : '')
    if (!name) continue
    const category = (typeof ing === 'object' && ing.category) ? ing.category : 'Frais'
    const quantity = (typeof ing === 'object' && ing.quantity) ? Number(ing.quantity) : 1

    const itemDoc = new ShoppingItem({
      familyId,
      id: Date.now() + i + 1,
      name,
      category,
      quantity,
      urgent: false,
      checked: false,
      mealId
    })
    await itemDoc.save()
    createdIngredients.push(itemDoc)
  }
  return createdIngredients
}

// Le lien de recette est affiché tel quel dans un <a href> : seuls http(s) sont acceptés, pour
// empêcher l'enregistrement d'un lien javascript: exécuté au clic par un autre membre.
const sanitizeRecipeUrl = (raw) => {
  const value = String(raw || '').trim()
  if (!value) return ''
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

// Applique à un repas une modification du lien de recette et/ou de son image. L'image suit le
// lien : elle est effacée quand le lien change sans nouvelle image, ou quand il est retiré.
const applyMealRecipeChanges = (meal, { recipeUrl, recipeImageUrl }) => {
  if (recipeUrl !== undefined) {
    const cleanUrl = sanitizeRecipeUrl(recipeUrl)
    if (cleanUrl !== meal.recipeUrl && recipeImageUrl === undefined) meal.recipeImageUrl = ''
    meal.recipeUrl = cleanUrl
  }
  if (recipeImageUrl !== undefined) meal.recipeImageUrl = sanitizeRecipeUrl(recipeImageUrl)
  if (!meal.recipeUrl) meal.recipeImageUrl = ''
}

// Supprime un repas et les articles de courses liés (cascade). Partagée par la route HTTP et
// l'outil MCP delete_meal.
const deleteMealCascade = async ({ familyId, mealId }) => {
  const deleteResult = await ShoppingItem.deleteMany({ familyId, mealId })
  await Meal.deleteOne({ id: mealId, familyId })
  return { deletedIngredientsCount: deleteResult.deletedCount }
}

app.get('/api/meals', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const filter = { familyId: req.family._id }
    if (startDate && endDate) {
      filter.date = { $gte: String(startDate), $lte: String(endDate) }
    } else if (startDate) {
      filter.date = { $gte: String(startDate) }
    }
    const meals = await Meal.find(filter).sort({ date: 1, slot: 1, createdAt: 1 })
    res.json(meals)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/meals', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const { date, slot, dish, notes, suggestedBy, recipeUrl, recipeImageUrl } = req.body

    if (!date || !slot || !dish) {
      return res.status(400).json({ error: req.t('errors.mealFieldsRequired') })
    }

    const cleanDish = String(dish).trim()
    if (!cleanDish) {
      return res.status(400).json({ error: req.t('errors.dishEmpty') })
    }

    const memberId = suggestedBy !== undefined && suggestedBy !== null 
      ? Number(suggestedBy) 
      : (req.user ? req.user.id : null)

    const newMeal = new Meal({
      familyId: req.family._id,
      id: Date.now(),
      date: String(date),
      slot: slot === 'dinner' ? 'dinner' : 'lunch',
      dish: cleanDish,
      suggestedBy: memberId,
      notes: notes ? String(notes).trim() : ''
    })
    applyMealRecipeChanges(newMeal, { recipeUrl, recipeImageUrl })

    await newMeal.save()

    // Ingrédients associés à ajouter automatiquement dans la liste de courses
    const createdIngredients = await createShoppingItemsForIngredients({
      familyId: req.family._id,
      mealId: newMeal.id,
      ingredients: req.body.ingredients
    })

    // Informations pour les notifications
    const paramsFor = (t) => ({
      dish: newMeal.dish,
      slot: t(`notify.meal.slot.${newMeal.slot === 'lunch' ? 'lunch' : 'dinner'}`),
      date: readableDate(t, newMeal.date),
      author: authorLabel(t, req.user)
    })

    dispatchFamilyAlert({
      family: req.family,
      actor: req.user,
      action: ALERT_ACTIONS.MEAL_CREATED.code,
      actionLabel: ALERT_ACTIONS.MEAL_CREATED.label,
      title: (t) => t('notify.meal.title', paramsFor(t)),
      targetType: 'meal',
      targetId: newMeal.id,
      push: {
        title: (t) => `🍲 ${t('notify.meal.title', paramsFor(t))}`,
        body: (t) => t('notify.meal.body', paramsFor(t)),
        url: `/${req.family.slug}/meals`
      },
      email: {
        subject: (t) => `🍲 ${t('notify.meal.subject', paramsFor(t))}`,
        title: (t) => t('notify.meal.heading'),
        badge: '🍲',
        detailsHtml: (t) => {
          const params = paramsFor(t)
          return `
          <p style="margin: 0 0 10px 0; font-size: 15px; color: #1e293b;">
            ${t('notify.meal.intro', { author: `<strong>${escapeHtml(params.author)}</strong>` })}
          </p>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
            <li><strong>${t('notify.label', { label: t('notify.fields.dish') })}</strong> ${escapeHtml(params.dish)}</li>
            <li><strong>${t('notify.label', { label: t('notify.fields.slot') })}</strong> ${escapeHtml(params.slot)}</li>
            <li><strong>${t('notify.label', { label: t('notify.fields.date') })}</strong> ${escapeHtml(params.date)}</li>
            ${newMeal.notes ? `<li><strong>${t('notify.label', { label: t('notify.fields.notes') })}</strong> ${escapeHtml(newMeal.notes)}</li>` : ''}
          </ul>
        `
        },
        actionUrl: `/${req.family.slug}/meals`,
        actionText: (t) => t('notify.meal.action')
      }
    }).catch(err => console.error('[AlertLog] dispatchFamilyAlert (meal.created):', err.message))

    res.status(201).json({
      ...newMeal.toObject(),
      createdIngredients
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/meals/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const meal = await Meal.findOne({ id: Number(req.params.id), familyId: req.family._id })
    if (!meal) return res.status(404).json({ error: req.t('errors.mealNotFound') })

    const { date, slot, dish, notes, suggestedBy, recipeUrl, recipeImageUrl } = req.body
    if (date !== undefined) meal.date = String(date)
    if (slot !== undefined) meal.slot = slot === 'dinner' ? 'dinner' : 'lunch'
    if (dish !== undefined) {
      const cleanDish = String(dish).trim()
      if (!cleanDish) return res.status(400).json({ error: req.t('errors.dishEmpty') })
      meal.dish = cleanDish
    }
    if (notes !== undefined) meal.notes = String(notes).trim()
    if (suggestedBy !== undefined) meal.suggestedBy = suggestedBy ? Number(suggestedBy) : null
    applyMealRecipeChanges(meal, { recipeUrl, recipeImageUrl })

    await meal.save()
    res.json(meal)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/meals/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const meal = await Meal.findOne({ id: Number(req.params.id), familyId: req.family._id })
    if (!meal) return res.status(404).json({ error: req.t('errors.mealNotFound') })

    await deleteMealCascade({ familyId: req.family._id, mealId: meal.id })
    res.json({ message: req.t('messages.mealDeleted') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === INTÉGRATION MEALIE (RECHERCHE DE RECETTES) ===
// Le serveur sert de relais vers l'instance Mealie de la famille : le jeton d'API reste côté
// serveur et seuls les champs utiles des réponses Mealie sont renvoyés au navigateur.
const MEALIE_TIMEOUT_MS = 8000

class MealieError extends TranslatableError {
  constructor(key, params = {}, status = 502) {
    super(key, params)
    this.status = status
  }
}

// Conserve un éventuel sous-chemin (Mealie servi derrière un reverse proxy sous /mealie), mais
// retire le / final, la query et le hash pour pouvoir concaténer les chemins d'API.
const normalizeMealieBaseUrl = (raw) => {
  let url
  try {
    url = new URL(String(raw || '').trim())
  } catch {
    return null
  }
  if (!['http:', 'https:'].includes(url.protocol)) return null
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
}

// Les erreurs d'authentification Mealie sont renvoyées en 502 et non en 401 : un 401 de notre
// API serait interprété par le client comme une session FamilyGest expirée.
const mealieRequest = async ({ baseUrl, apiToken }, apiPath) => {
  let res
  try {
    res = await fetch(`${baseUrl}${apiPath}`, {
      headers: { Authorization: `Bearer ${apiToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(MEALIE_TIMEOUT_MS)
    })
  } catch (err) {
    if (err.name === 'TimeoutError') throw new MealieError('errors.mealie.timeout')
    throw new MealieError('errors.mealie.unreachable', { reason: err.cause?.code || err.message })
  }
  if (res.status === 401 || res.status === 403) throw new MealieError('errors.mealie.tokenRefused')
  if (res.status === 404) throw new MealieError('errors.mealie.notFound', {}, 404)
  if (!res.ok) throw new MealieError('errors.mealie.serverError', { status: res.status })
  try {
    return await res.json()
  } catch {
    throw new MealieError('errors.mealie.notMealie')
  }
}

const sendMealieError = (res, err) => {
  if (err instanceof MealieError) return res.status(err.status).json({ error: localizeError(res.req, err) })
  res.status(500).json({ error: err.message })
}

// Depuis Mealie v1, les recettes sont servies sous /g/<groupe>/r/<slug> ; /recipe/<slug> reste la
// forme des versions antérieures.
const buildMealieRecipeUrl = (config, slug) => config.groupSlug
  ? `${config.baseUrl}/g/${encodeURIComponent(config.groupSlug)}/r/${encodeURIComponent(slug)}`
  : `${config.baseUrl}/recipe/${encodeURIComponent(slug)}`

// Les images de recettes Mealie sont publiques (pas de jeton requis) : le navigateur les charge
// directement. Le champ `image` de la recette sert de clé de version pour le cache.
const buildMealieImageUrl = (config, recipe) => recipe.image && recipe.id
  ? `${config.baseUrl}/api/media/recipes/${encodeURIComponent(recipe.id)}/images/min-original.webp?version=${encodeURIComponent(recipe.image)}`
  : null

// Transforme un ingrédient Mealie en élément structuré : aliment + quantité + unité quand
// l'ingrédient est structuré (le client ajuste la quantité au nombre de couverts), sinon le
// texte affiché par Mealie, repris tel quel.
const mealieIngredientToItem = (ing) => {
  const foodName = ing.food?.name ? String(ing.food.name).trim() : ''
  const quantity = Number(ing.quantity)
  const unit = ing.unit
    ? String((ing.unit.useAbbreviation && ing.unit.abbreviation) || ing.unit.name || '').trim()
    : ''
  return {
    food: foodName ? foodName.charAt(0).toUpperCase() + foodName.slice(1) : '',
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
    unit,
    text: String(ing.display || ing.note || ing.originalText || '').replace(/\s+/g, ' ').trim()
  }
}

// Nombre de portions de la recette : champ numérique (Mealie v2), sinon premier entier de la
// chaîne libre recipeYield (« 4 personnes »), sinon null (quantités non ajustables).
const getMealieBaseServings = (recipe) => {
  for (const value of [recipe.recipeServings, recipe.recipeYieldQuantity]) {
    const n = Number(value)
    if (Number.isFinite(n) && n > 0) return n
  }
  const match = String(recipe.recipeYield || '').match(/\d+/)
  return match && Number(match[0]) > 0 ? Number(match[0]) : null
}

const getFamilyMealieConfig = async (familyId) => {
  const config = await MealieConfig.findOne({ familyId })
  if (!config) throw new MealieError('errors.mealie.notConfigured', {}, 404)
  return { baseUrl: config.baseUrl, apiToken: config.apiToken, groupSlug: config.groupSlug }
}

const serializeMealieConfig = (config) => config
  ? { configured: true, baseUrl: config.baseUrl, tokenPreview: config.tokenPreview, groupSlug: config.groupSlug, updatedAt: config.updatedAt }
  : { configured: false }

app.get('/api/family-settings/mealie', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const config = await MealieConfig.findOne({ familyId: req.family._id })
    res.json(serializeMealieConfig(config))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/family-settings/mealie : enregistre l'URL et le jeton après avoir vérifié la connexion.
// Le jeton est facultatif si une configuration existe déjà (seule l'URL est alors modifiée).
app.put('/api/family-settings/mealie', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const baseUrl = normalizeMealieBaseUrl(req.body.baseUrl)
    if (!baseUrl) {
      return res.status(400).json({ error: req.t('errors.mealieUrlInvalid') })
    }

    const existing = await MealieConfig.findOne({ familyId: req.family._id })
    const newToken = String(req.body.apiToken || '').trim()
    const apiToken = newToken || existing?.apiToken
    if (!apiToken) {
      return res.status(400).json({ error: req.t('errors.mealieTokenRequired') })
    }

    // Vérifie l'URL et le jeton, et récupère le groupe du compte pour construire les liens.
    const self = await mealieRequest({ baseUrl, apiToken }, '/api/users/self')

    const config = existing || new MealieConfig({ familyId: req.family._id })
    config.baseUrl = baseUrl
    if (newToken) {
      config.apiToken = newToken
      config.tokenPreview = newToken.slice(-4)
    }
    config.groupSlug = self?.groupSlug ? String(self.groupSlug) : ''
    config.updatedByUserId = req.user.id
    await config.save()

    res.json({ ...serializeMealieConfig(config), mealieUser: self?.fullName || self?.username || '' })
  } catch (err) {
    sendMealieError(res, err)
  }
})

app.delete('/api/family-settings/mealie', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    await MealieConfig.deleteOne({ familyId: req.family._id })
    res.json({ message: req.t('messages.mealieDisconnected') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/mealie/recipes?search=... : recherche de recettes (tout membre de la famille).
app.get('/api/mealie/recipes', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const config = await getFamilyMealieConfig(req.family._id)
    const search = String(req.query.search || '').trim().slice(0, 100)
    const params = new URLSearchParams({ page: '1', perPage: '12' })
    if (search) {
      params.set('search', search)
    } else {
      params.set('orderBy', 'updatedAt')
      params.set('orderDirection', 'desc')
    }

    const data = await mealieRequest(config, `/api/recipes?${params}`)
    const items = Array.isArray(data?.items) ? data.items : []
    res.json({
      total: Number(data?.total) || items.length,
      recipes: items.map(r => ({
        slug: r.slug,
        name: r.name,
        description: String(r.description || '').slice(0, 200),
        totalTime: r.totalTime || '',
        imageUrl: buildMealieImageUrl(config, r)
      }))
    })
  } catch (err) {
    sendMealieError(res, err)
  }
})

// GET /api/mealie/recipes/:slug : détail d'une recette, avec ses ingrédients structurés et
// son nombre de portions.
app.get('/api/mealie/recipes/:slug', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const config = await getFamilyMealieConfig(req.family._id)
    const recipe = await mealieRequest(config, `/api/recipes/${encodeURIComponent(req.params.slug)}`)
    const ingredients = (Array.isArray(recipe?.recipeIngredient) ? recipe.recipeIngredient : [])
      .map(mealieIngredientToItem)
      .filter(ing => ing.food || ing.text)

    res.json({
      slug: recipe.slug,
      name: recipe.name,
      description: String(recipe.description || ''),
      baseServings: getMealieBaseServings(recipe),
      recipeUrl: buildMealieRecipeUrl(config, recipe.slug),
      imageUrl: buildMealieImageUrl(config, recipe),
      ingredients
    })
  } catch (err) {
    sendMealieError(res, err)
  }
})

// === SHORTCUTS / APPS ROUTES ===
app.get('/api/shortcuts', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const shortcuts = await Shortcut.find({ familyId: req.family._id }).sort({ order: 1, createdAt: 1 })
    res.json(shortcuts)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/shortcuts', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const { title, url, icon, order } = req.body
    if (!title || !url) {
      return res.status(400).json({ error: req.t('errors.shortcutFieldsRequired') })
    }

    let validUrl = url.trim()
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = `https://${validUrl}`
    }

    const newShortcut = new Shortcut({
      familyId: req.family._id,
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

app.put('/api/shortcuts/:id', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const shortcut = await Shortcut.findOne({ id: Number(req.params.id), familyId: req.family._id })
    if (!shortcut) return res.status(404).json({ error: req.t('errors.shortcutNotFound') })

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

app.delete('/api/shortcuts/:id', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    await Shortcut.deleteOne({ id: Number(req.params.id), familyId: req.family._id })
    res.json({ message: req.t('messages.shortcutDeleted') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === EXPORT DES DONNÉES DE LA FAMILLE (ADMINISTRATION) ===
app.get('/api/admin/export', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const familyId = req.family._id

    const memberships = await FamilyMember.find({ familyId }).lean()
    const memberUserIds = memberships.map(m => m.userId)

    const [
      users,
      tasks,
      shoppingItems,
      shoppingCategories,
      absences,
      mealGuests,
      meals,
      shortcuts,
      events
    ] = await Promise.all([
      User.find({ id: { $in: memberUserIds } }).select('-password').lean(),
      Task.find({ familyId }).lean(),
      ShoppingItem.find({ familyId }).lean(),
      ShoppingCategory.find({ familyId }).sort({ rank: 1 }).lean(),
      Absence.find({ familyId }).lean(),
      MealGuest.find({ familyId }).lean(),
      Meal.find({ familyId }).lean(),
      Shortcut.find({ familyId }).sort({ order: 1 }).lean(),
      Event.find({ familyId }).lean()
    ])

    const exportPayload = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      source: 'familygest-mono',
      data: {
        users,
        tasks,
        shoppingItems,
        shoppingCategories,
        absences,
        mealGuests,
        meals,
        shortcuts,
        events
      }
    }

    res.json(exportPayload)
  } catch (err) {
    console.error('Erreur lors de l\'export des données', err)
    res.status(500).json({ error: req.t('errors.exportFailed', { message: err.message }) })
  }
})

// === CONNECTEUR MCP (PILOTAGE DE L'APPLICATION DEPUIS CLAUDE) ===
// Réglages authentifiés (gestion du connecteur par un admin de famille) : distincts du trafic MCP
// lui-même (non authentifié par session, voir server/mcp/auth.js), qui est monté juste après.
app.get('/api/family-settings/mcp-connector', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const connector = await McpConnector.findOne({ familyId: req.family._id, revokedAt: null })
    if (!connector) return res.json({ exists: false })

    res.json({
      exists: true,
      tokenPreview: connector.tokenPreview,
      createdAt: connector.createdAt,
      lastUsedAt: connector.lastUsedAt,
      requestCount: connector.requestCount
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/family-settings/mcp-connector', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const tokenPreview = rawToken.slice(-4)

    const connector = await McpConnector.findOneAndUpdate(
      { familyId: req.family._id },
      {
        familyId: req.family._id,
        tokenHash,
        tokenPreview,
        createdByUserId: req.user.id,
        revokedAt: null,
        lastUsedAt: null,
        requestCount: 0
      },
      { upsert: true, new: true }
    )

    const baseServerUrl = `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '')
    res.json({
      url: `${baseServerUrl}/api/mcp/${req.family.slug}/${rawToken}`,
      tokenPreview: connector.tokenPreview,
      createdAt: connector.createdAt
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/family-settings/mcp-connector', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    await McpConnector.updateOne({ familyId: req.family._id }, { revokedAt: new Date() })
    res.json({ message: req.t('messages.mcpRevoked') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Trafic MCP non authentifié par session : voir server/mcp/auth.js pour la résolution par jeton.
mountMcpServer(app, {
  dispatchFamilyAlert,
  ALERT_ACTIONS,
  toggleTaskCompletion,
  updateTask,
  notifyTaskCreated,
  upsertAbsenceRecord,
  deleteAbsenceIfEmptySlots,
  mergeAbsenceIntoSibling,
  regenerateLongAbsenceDailyRows,
  createEventOrSeries,
  updateEventOrSeries,
  deleteEventOrSeries,
  createMealGuestsBatch,
  createShoppingItemsForIngredients,
  deleteMealCascade,
  sanitizeRecipeUrl,
  applyMealRecipeChanges,
  normalizeTaskDueDate,
  getOrSeedShoppingCategories
})

// === SKILL ALEXA PRIVÉE (COMMANDES VOCALES) ===
// Réglages authentifiés (gestion du jeton par un admin de famille) ; le trafic de la skill
// elle-même est vérifié par signature Amazon + jeton, voir server/alexa/.
app.get('/api/family-settings/alexa-connector', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const connector = await AlexaConnector.findOne({ familyId: req.family._id, revokedAt: null })
    if (!connector) return res.json({ exists: false })
    res.json({
      exists: true,
      tokenPreview: connector.tokenPreview,
      createdAt: connector.createdAt,
      lastUsedAt: connector.lastUsedAt,
      requestCount: connector.requestCount
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/family-settings/alexa-connector', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const rawToken = crypto.randomBytes(32).toString('hex')
    const connector = await AlexaConnector.findOneAndUpdate(
      { familyId: req.family._id },
      {
        familyId: req.family._id,
        tokenHash: crypto.createHash('sha256').update(rawToken).digest('hex'),
        tokenPreview: rawToken.slice(-4),
        createdByUserId: req.user.id,
        revokedAt: null,
        lastUsedAt: null,
        requestCount: 0
      },
      { upsert: true, new: true }
    )

    // Adresse publique HTTPS de la plateforme (Amazon n'appelle que des adresses publiques)
    const config = await getSmtpConfig()
    const baseServerUrl = (config?.serverUrl || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '')
    res.json({
      url: `${baseServerUrl}/api/alexa/${req.family.slug}/${rawToken}`,
      tokenPreview: connector.tokenPreview,
      createdAt: connector.createdAt
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/family-settings/alexa-connector', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    await AlexaConnector.updateOne({ familyId: req.family._id }, { revokedAt: new Date() })
    res.json({ message: req.t('messages.alexaRevoked') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Modèle de dialogue à importer dans la console Amazon, avec les prénoms de la famille
app.get('/api/family-settings/alexa-connector/interaction-model', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const members = await getFamilyMembersList(req.family._id)
    res.setHeader('Content-Disposition', 'attachment; filename="familygest-alexa-fr-FR.json"')
    res.json(buildInteractionModel({ members }))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

mountAlexaSkill(app, {
  dispatchFamilyAlert,
  ALERT_ACTIONS,
  upsertAbsenceRecord,
  createEventOrSeries,
  createMealGuestsBatch,
  getOrSeedShoppingCategories
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
  await migrateToMultiFamily()
  await migrateNotificationPreferences()
  await migrateUsualPresenceGrid()
  await initVapid()

  const digestCtx = {
    User, FamilyMember, Family, Task, Event, Absence, MealGuest, Meal, ShoppingItem,
    PushSubscription, GlobalConfig,
    getSmtpConfig, sendEmailWithConfig,
    sendPushNotification, sendNotificationEmail,
    webpush,
    getVapidKeys: () => ({ publicKey: vapidPublicKey, privateKey: vapidPrivateKey }),
    logAlertEntry, toAlertChannelLog,
    ALERT_ACTIONS
  }
  startDigestScheduler(digestCtx)
  mountDigestAdminRoutes(app, digestCtx, { requireAuth, requireSuperAdmin })

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur API Express Sécurisé démarré sur http://localhost:${PORT}`)
  })
}

startServer()
