import express from 'express'
import cors from 'cors'
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

// Helper : Obtenir la configuration SMTP appropriée (priorité : familial si configuré, sinon global plateforme)
const getSmtpConfig = async (familyId = null) => {
  try {
    const globalConfig = await GlobalConfig.findOne()
    let config = null
    if (familyId) {
      const familyConfig = await EmailConfig.findOne({ familyId, isConfigured: true })
      if (familyConfig && familyConfig.host && familyConfig.user && familyConfig.pass) {
        config = familyConfig.toObject ? familyConfig.toObject() : { ...familyConfig }
      }
    }
    if (!config) {
      if (globalConfig && globalConfig.isConfigured && globalConfig.host && globalConfig.user && globalConfig.pass) {
        config = globalConfig.toObject ? globalConfig.toObject() : { ...globalConfig }
      } else {
        const fallback = await EmailConfig.findOne({ isConfigured: true })
        if (fallback) {
          config = fallback.toObject ? fallback.toObject() : { ...fallback }
        }
      }
    }

    if (config) {
      // L'URL de base configurée au niveau Super Admin s'applique à toute l'application et à toutes les familles
      if (globalConfig?.serverUrl) {
        config.serverUrl = globalConfig.serverUrl
      }
    }

    return config
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

    // Si aucune famille n'est explicitement demandée, fallback vers la première famille de l'utilisateur
    if (!family && req.user) {
      const membership = await FamilyMember.findOne({ userId: req.user.id }).sort('createdAt')
      if (membership) {
        family = await Family.findById(membership.familyId)
      } else if (req.user.isSuperAdmin) {
        family = await Family.findOne().sort('createdAt')
      }
    }

    if (!family) {
      return res.status(404).json({ error: 'Famille introuvable ou aucune famille active' })
    }

    req.family = family

    // Vérification de l'appartenance
    const membership = await FamilyMember.findOne({ familyId: family._id, userId: req.user.id })

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
      return res.status(403).json({ error: 'Vous ne faites pas partie de cette famille' })
    }

    req.membership = membership
    next()
  } catch (err) {
    console.error('attachFamilyContext error:', err.message)
    res.status(500).json({ error: 'Erreur lors de la résolution du contexte familial' })
  }
}

const requireFamilyAdmin = (req, res, next) => {
  if (req.user?.isSuperAdmin || req.membership?.isAdmin) {
    return next()
  }
  return res.status(403).json({ error: 'Action réservée aux administrateurs de cette famille' })
}

// Helper : Envoi d'email de bienvenue avec token d'activation (durée 2 heures)
const sendWelcomeEmail = async (user, token) => {
  try {
    const config = await getSmtpConfig()
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

// Helper : Envoi d'email d'invitation à une famille
const sendFamilyInvitationEmail = async ({ email, family, invitationToken, isExistingUser, invitedByName, isAdmin = false }) => {
  try {
    const config = await getSmtpConfig(family._id)
    if (!config || !config.isConfigured || !config.host || !config.user || !config.pass) {
      console.log(`[Email] Configuration SMTP non définie ou incomplète. Invitation non envoyée à ${email}`)
      return { success: false, reason: 'SMTP_NOT_CONFIGURED' }
    }

    const baseServerUrl = (config.serverUrl || 'http://localhost:5173').replace(/\/+$/, '')
    const invitationUrl = `${baseServerUrl}/invitation/${invitationToken}`

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

    const title = isExistingUser
      ? (isAdmin ? `Invitation à devenir administrateur de « ${family.name} »` : `Invitation à rejoindre la famille « ${family.name} »`)
      : (isAdmin ? `Bienvenue sur FamilyGest - Administrez « ${family.name} »` : `Bienvenue sur FamilyGest - Rejoignez « ${family.name} »`)

    const introText = isExistingUser
      ? (isAdmin
          ? `<strong>${invitedByName || 'Le Super Administrateur'}</strong> vous a désigné comme <strong>administrateur</strong> de l'espace familial <strong>${family.name}</strong> sur FamilyGest.`
          : `<strong>${invitedByName || 'Un administrateur'}</strong> vous invite à rejoindre l'espace familial <strong>${family.name}</strong> sur FamilyGest.`)
      : (isAdmin
          ? `Un espace familial <strong>${family.name}</strong> vous attend sur <strong>FamilyGest</strong>, où vous avez été invité en tant qu'<strong>administrateur</strong> par <strong>${invitedByName || 'Le Super Administrateur'}</strong>.`
          : `Un nouvel espace familial <strong>${family.name}</strong> a été créé pour vous sur <strong>FamilyGest</strong> par <strong>${invitedByName || 'Un administrateur'}</strong>.`)

    const buttonText = isExistingUser
      ? (isAdmin ? `✨ Rejoindre en tant qu'administrateur` : `✨ Rejoindre la famille ${family.name}`)
      : (isAdmin ? `🚀 Définir mon mot de passe & administrer` : `🚀 Créer mon compte & rejoindre la famille`)

    const mailOptions = {
      from: `"${config.fromName || 'FamilyGest'}" <${config.fromEmail || config.user}>`,
      to: email,
      subject: `✨ ${title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
            <tr>
              <td style="padding: 32px 28px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 14px; background-color: #6366f1; background: linear-gradient(135deg, #6366f1, #818cf8); font-size: 28px; text-align: center; color: #ffffff;">
                    🏡
                  </div>
                  <h1 style="color: #4338ca; margin: 12px 0 4px 0; font-size: 22px; font-weight: 800;">${family.name}</h1>
                  <p style="color: #64748b; margin: 0; font-size: 14px;">Espace partagé FamilyGest</p>
                </div>

                <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
                  Bonjour,
                </p>
                <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
                  ${introText}
                </p>

                <div style="text-align: center; margin: 32px 0;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                    <tr>
                      <td align="center" bgcolor="#4f46e5" style="border-radius: 8px; background-color: #4f46e5; vertical-align: middle;">
                        <a href="${invitationUrl}" target="_blank" style="background-color: #4f46e5; border: 14px solid #4f46e5; border-left: 28px solid #4f46e5; border-right: 28px solid #4f46e5; color: #ffffff !important; font-family: 'Segoe UI', sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; display: inline-block; border-radius: 8px; line-height: 1.2;">
                          ${buttonText}
                        </a>
                      </td>
                    </tr>
                  </table>
                </div>

                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;">
                  <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
                    ⏱️ Cette invitation sécurisée est valable pendant <strong>7 jours</strong>.
                  </p>
                </div>

                <p style="font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 24px; line-height: 1.5;">
                  Lien d'accès direct :<br/>
                  <a href="${invitationUrl}" style="color: #6366f1; text-decoration: underline;">${invitationUrl}</a>
                </p>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
                  FamilyGest • Gestion collaborative et privée de la vie de famille
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    }

    await transporter.sendMail(mailOptions)
    console.log(`[Email] Invitation envoyée avec succès à ${email} pour la famille ${family.name}`)
    return { success: true }
  } catch (err) {
    console.error(`[Email] Erreur lors de l'envoi de l'invitation à ${email} :`, err.message)
    return { success: false, error: err.message }
  }
}

// Helpers pour le formatage iCalendar (.ics) et Google Agenda côté serveur
const formatServerEventDates = (dateStr, timeStr) => {
  if (!dateStr) return { start: '', end: '', isAllDay: true }
  const [year, month, day] = dateStr.split('-').map(Number)
  const pad = (n) => String(n).padStart(2, '0')

  if (timeStr && timeStr.includes(':')) {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const startDate = new Date(year, month - 1, day, hours, minutes, 0)
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)

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

const generateServerGoogleCalendarUrl = (event) => {
  const { start, end } = formatServerEventDates(event.date, event.time)
  const title = encodeURIComponent(event.title || 'Événement FamilyGest')
  const location = encodeURIComponent(event.location || '')
  let detailsText = 'Événement FamilyGest'
  if (event.category) detailsText += ` (${event.category})`
  const details = encodeURIComponent(detailsText)

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`
}

const generateServerIcsContent = (event) => {
  const { start, end, isAllDay } = formatServerEventDates(event.date, event.time)
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`

  const uid = `familygest-${event.id || Date.now()}@familygest.local`
  const summary = (event.title || 'Événement FamilyGest').replace(/[,;\\]/g, ' ')
  const location = (event.location || '').replace(/[,;\\]/g, ' ')
  const description = `Événement FamilyGest${event.category ? ' - ' + event.category : ''}`

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

// Helper : Diffusion d'une notification par email aux membres ayant activé cette option
const sendNotificationEmail = async ({ 
  subject, 
  title, 
  badge = '🔔', 
  detailsHtml, 
  actionUrl = '/', 
  actionText = 'Accéder à FamilyGest', 
  excludeUserId = null,
  calendarData = null,
  familyId = null 
}) => {
  try {
    const config = await getSmtpConfig(familyId)
    if (!config || !config.isConfigured || !config.host || !config.user || !config.pass) {
      return { success: false, reason: 'SMTP_NOT_CONFIGURED' }
    }

    let recipientUsers = []
    if (familyId) {
      const memberQuery = { familyId, emailNotificationsEnabled: true }
      if (excludeUserId) {
        memberQuery.userId = { $ne: Number(excludeUserId) }
      }
      const members = await FamilyMember.find(memberQuery)
      const userIds = members.map(m => m.userId)
      recipientUsers = await User.find({ id: { $in: userIds } }).select('email firstName')
    } else {
      const userQuery = { emailNotificationsEnabled: true }
      if (excludeUserId) {
        userQuery.id = { $ne: Number(excludeUserId) }
      }
      recipientUsers = await User.find(userQuery).select('email firstName')
    }

    if (!recipientUsers || recipientUsers.length === 0) return { success: true, count: 0 }

    const baseServerUrl = (config.serverUrl || 'http://localhost:5173').replace(/\/+$/, '')
    const fullActionUrl = actionUrl.startsWith('http') ? actionUrl : `${baseServerUrl}${actionUrl}`

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

    const emailPromises = recipientUsers.map(async (recipient) => {
      const mailOptions = {
        from: `"${config.fromName || 'FamilyGest'}" <${config.fromEmail || config.user}>`,
        to: recipient.email,
        subject: subject || `✨ FamilyGest - ${title}`,
        html: `
          <!DOCTYPE html>
          <html>
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
                    <p style="color: #64748b; margin: 0; font-size: 13px;">Notification FamilyGest • Espace Familial</p>
                  </div>

                  <p style="font-size: 15px; line-height: 1.5; color: #1e293b; margin-bottom: 16px;">
                    Bonjour <strong>${recipient.firstName || 'Membre'}</strong>,
                  </p>

                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">
                    ${detailsHtml}
                  </div>

                  <!-- Boutons d'export vers agenda personnel si disponible -->
                  ${calendarData ? `
                    <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px 18px; margin: 20px 0; text-align: center;">
                      <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #334155;">
                        📅 Ajouter directement à votre agenda personnel :
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
                    Vous recevez cet email car vous avez activé les notifications par email sur votre compte FamilyGest.<br/>
                    Vous pouvez modifier vos préférences à tout moment depuis votre profil.
                  </p>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
        attachments: (calendarData && calendarData.icsContent) ? [
          {
            filename: `${(calendarData.eventTitle || 'evenement').replace(/[^a-zA-Z0-9]/g, '_')}.ics`,
            content: calendarData.icsContent,
            contentType: 'text/calendar; charset=utf-8; method=REQUEST'
          }
        ] : []
      }
      return transporter.sendMail(mailOptions)
    })

    await Promise.allSettled(emailPromises)
    console.log(`[Email] Notification email envoyée à ${recipientUsers.length} membre(s) : "${title}"`)
    return { success: true, count: recipientUsers.length }
  } catch (err) {
    console.error('[Email] Erreur sendNotificationEmail:', err.message)
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
const sendPushNotification = async ({ 
  title, 
  body, 
  url = '/', 
  excludeUserId = null,
  actions = [],
  googleCalendarUrl = null,
  familyId = null
}) => {
  try {
    if (!vapidPublicKey || !vapidPrivateKey) return

    let userIds = []
    if (familyId) {
      const memberQuery = { familyId, pushNotificationsEnabled: { $ne: false } }
      if (excludeUserId) {
        memberQuery.userId = { $ne: Number(excludeUserId) }
      }
      const eligibleMembers = await FamilyMember.find(memberQuery).select('userId')
      userIds = eligibleMembers.map(m => m.userId)
    } else {
      const userQuery = { pushNotificationsEnabled: { $ne: false } }
      if (excludeUserId) {
        userQuery.id = { $ne: Number(excludeUserId) }
      }
      const eligibleUsers = await User.find(userQuery).select('id')
      userIds = eligibleUsers.map(u => u.id)
    }

    if (userIds.length === 0) return

    const subscriptions = await PushSubscription.find({ userId: { $in: userIds } })
    if (subscriptions.length === 0) return

    const payload = JSON.stringify({
      title,
      body,
      url,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `familygest-${Date.now()}`,
      actions,
      googleCalendarUrl
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
      // Vérifier s'il reste d'autres appareils abonnés pour cet utilisateur
      const remaining = await PushSubscription.countDocuments({ userId })
      if (remaining === 0) {
        await User.updateOne({ id: userId }, { pushNotificationsEnabled: false })
      }
    } else {
      await PushSubscription.deleteMany({ userId })
      await User.updateOne({ id: userId }, { pushNotificationsEnabled: false })
    }

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
        pushNotificationsEnabled: user.pushNotificationsEnabled !== false,
        emailNotificationsEnabled: Boolean(user.emailNotificationsEnabled),
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
        pushNotificationsEnabled: user.pushNotificationsEnabled !== false,
        emailNotificationsEnabled: Boolean(user.emailNotificationsEnabled),
        usualPresence: user.usualPresence || 'present',
        families: familiesData
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
    const { token, password, pushNotificationsEnabled, emailNotificationsEnabled } = req.body
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
    if (emailNotificationsEnabled !== undefined) {
      user.emailNotificationsEnabled = Boolean(emailNotificationsEnabled)
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
        pushNotificationsEnabled: user.pushNotificationsEnabled !== false,
        emailNotificationsEnabled: Boolean(user.emailNotificationsEnabled),
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
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' })

    const { firstName, lastName, email, password, role, avatar, color, pushNotificationsEnabled, emailNotificationsEnabled, usualPresence } = req.body

    if (firstName) user.firstName = firstName.trim()
    if (lastName) user.lastName = lastName.trim()
    if (role) user.role = role
    if (avatar) user.avatar = avatar
    if (color) user.color = color
    if (usualPresence && ['present', 'absent'].includes(usualPresence)) {
      user.usualPresence = usualPresence
    }

    if (pushNotificationsEnabled !== undefined) {
      const activeSubs = await PushSubscription.countDocuments({ userId: user.id })
      if (!pushNotificationsEnabled && activeSubs > 0) {
        user.pushNotificationsEnabled = true
      } else {
        user.pushNotificationsEnabled = Boolean(pushNotificationsEnabled)
      }
    }
    if (emailNotificationsEnabled !== undefined) {
      user.emailNotificationsEnabled = Boolean(emailNotificationsEnabled)
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
      pushNotificationsEnabled: user.pushNotificationsEnabled !== false,
      emailNotificationsEnabled: Boolean(user.emailNotificationsEnabled),
      usualPresence: user.usualPresence || 'present'
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === SUPER ADMIN ROUTES ===

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
    const reservedSlugs = ['admin', 'superadmin', 'super-admin', 'api', 'login', 'set-password', 'invitation', 'settings', 'dashboard', 'tasks', 'calendar', 'absences', 'shopping', 'select-family']
    if (reservedSlugs.includes(slug)) {
      return res.json({ available: false, reason: 'Ce nom est réservé par le système' })
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.json({ available: false, reason: 'Le slug ne doit contenir que des lettres minuscules, chiffres et tirets' })
    }
    const existing = await Family.findOne({ slug })
    res.json({ available: !existing })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/super-admin/check-email (Vérifie si un email existe déjà dans l'application)
app.get('/api/super-admin/check-email', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const email = String(req.query.email || '').toLowerCase().trim()
    if (!email) return res.status(400).json({ error: 'Email requis' })
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
      return res.status(400).json({ error: 'Nom de famille, identifiant (slug) et email administrateur requis' })
    }

    const cleanSlug = String(slug).toLowerCase().trim()
    if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
      return res.status(400).json({ error: 'L\'identifiant ne doit comporter que des minuscules, chiffres et tirets' })
    }

    const reservedSlugs = ['admin', 'superadmin', 'super-admin', 'api', 'login', 'set-password', 'invitation', 'settings', 'select-family']
    if (reservedSlugs.includes(cleanSlug)) {
      return res.status(400).json({ error: 'Cet identifiant est réservé par le système' })
    }

    const slugExists = await Family.findOne({ slug: cleanSlug })
    if (slugExists) {
      return res.status(400).json({ error: 'Cet identifiant de famille est déjà utilisé' })
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
      status: 'pending',
      expiresAt
    })
    await invitation.save()

    // Envoi de l'email via SMTP Global
    await sendFamilyInvitationEmail({
      email: cleanEmail,
      family,
      invitationToken: token,
      isExistingUser: Boolean(existingUser),
      invitedByName: `${req.user.firstName} ${req.user.lastName}`,
      isAdmin: true
    })

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
      return res.status(404).json({ error: 'Famille introuvable' })
    }

    const { email, firstName, lastName } = req.body
    if (!email) {
      return res.status(400).json({ error: 'L\'adresse email est requise' })
    }

    const cleanEmail = String(email).toLowerCase().trim()
    const existingUser = await User.findOne({ email: cleanEmail })

    if (existingUser) {
      const existingMember = await FamilyMember.findOne({ familyId: family._id, userId: existingUser.id })
      if (existingMember && existingMember.isAdmin) {
        return res.status(400).json({
          error: `L'utilisateur ${existingUser.firstName || ''} ${existingUser.lastName || ''} (${cleanEmail}) est déjà administrateur de la famille « ${family.name} »`
        })
      }
    } else {
      if (!firstName || !firstName.trim()) {
        return res.status(400).json({ error: 'Le prénom est requis pour un nouveau compte' })
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
      status: 'pending',
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
      isAdmin: true
    })

    res.status(201).json({
      message: `Invitation administrateur envoyée avec succès à ${cleanEmail}`,
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

// PUT /api/super-admin/families/:id (Modification d'une famille / quota)
app.put('/api/super-admin/families/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const family = await Family.findById(req.params.id)
    if (!family) return res.status(404).json({ error: 'Famille introuvable' })

    const { name, maxMembers, isActive } = req.body
    if (name !== undefined) family.name = name.trim()
    if (maxMembers !== undefined) family.maxMembers = Number(maxMembers)
    if (isActive !== undefined) family.isActive = Boolean(isActive)

    await family.save()
    res.json(family)
  } catch (err) {
    res.status(500).json({ error: err.message })
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
      return res.status(404).json({ error: 'Rattachement familial introuvable' })
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
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const { firstName, lastName, email, isSuperAdmin } = req.body

    if (email) {
      const cleanEmail = String(email).toLowerCase().trim()
      const existing = await User.findOne({ email: cleanEmail, id: { $ne: userId } })
      if (existing) {
        return res.status(400).json({ error: 'Cette adresse email est déjà utilisée par un autre compte' })
      }
      user.email = cleanEmail
    }

    if (firstName) user.firstName = firstName.trim()
    if (lastName) user.lastName = lastName.trim()

    if (isSuperAdmin !== undefined) {
      if (!isSuperAdmin && user.isSuperAdmin) {
        const superAdminCount = await User.countDocuments({ isSuperAdmin: true })
        if (superAdminCount <= 1) {
          return res.status(400).json({ error: 'Impossible de retirer les droits du dernier Super Administrateur de la plateforme' })
        }
      }
      user.isSuperAdmin = Boolean(isSuperAdmin)
    }

    await user.save()
    res.json({
      message: 'Utilisateur mis à jour avec succès',
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
      return res.status(400).json({ error: 'Identifiant de famille requis' })
    }

    const user = await User.findOne({ id: userId })
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const family = await Family.findById(familyId)
    if (!family) return res.status(404).json({ error: 'Famille introuvable' })

    const existingMember = await FamilyMember.findOne({ userId, familyId })
    if (existingMember) {
      return res.status(400).json({ error: `Cet utilisateur fait déjà partie de la famille « ${family.name} »` })
    }

    // Contrôle quota
    const currentMemberCount = await FamilyMember.countDocuments({ familyId: family._id })
    if (currentMemberCount >= family.maxMembers) {
      return res.status(400).json({ error: `Le quota maximal de cette famille (${family.maxMembers} membres) est atteint` })
    }

    const isMemberAdmin = Boolean(isAdmin)
    const assignedRole = role && role.trim() ? role.trim() : (isMemberAdmin ? 'Administrateur' : 'Membre')

    const newMember = new FamilyMember({
      familyId: family._id,
      userId: user.id,
      userRef: user._id,
      role: assignedRole,
      isAdmin: isMemberAdmin,
      usualPresence: 'present',
      pushNotificationsEnabled: true,
      emailNotificationsEnabled: false
    })
    await newMember.save()

    res.status(201).json({
      message: `Utilisateur rattaché à la famille « ${family.name} » avec succès`,
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
      return res.status(404).json({ error: 'Rattachement familial introuvable' })
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
    res.json({ message: 'Rôle familial mis à jour avec succès', member })
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
      return res.status(404).json({ error: 'Rattachement familial introuvable' })
    }

    await FamilyMember.deleteOne({ _id: member._id })
    res.json({ message: 'Utilisateur retiré de la famille avec succès' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/super-admin/users/:userId (Supprimer définitivement un compte utilisateur)
app.delete('/api/super-admin/users/:userId', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.userId)

    if (req.user.id === userId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte Super Administrateur' })
    }

    const user = await User.findOne({ id: userId })
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' })
    }

    if (user.isSuperAdmin) {
      const superAdminCount = await User.countDocuments({ isSuperAdmin: true })
      if (superAdminCount <= 1) {
        return res.status(400).json({ error: 'Impossible de supprimer le dernier Super Administrateur de la plateforme' })
      }
    }

    // Suppression en cascade : memberships et invitations
    await FamilyMember.deleteMany({ userId: user.id })
    await FamilyInvitation.deleteMany({ email: user.email })
    await User.deleteOne({ id: user.id })

    res.json({ message: `Le compte de ${user.firstName} ${user.lastName} (${user.email}) a été supprimé avec succès` })
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

    config.isConfigured = Boolean(config.host && config.user && config.pass)
    await config.save()

    res.json({
      message: 'Configuration SMTP globale enregistrée avec succès',
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

// POST /api/super-admin/smtp/test (Test d'envoi SMTP plateforme)
app.post('/api/super-admin/smtp/test', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const recipientEmail = req.body.recipientEmail || req.user?.email
    if (!recipientEmail || !recipientEmail.trim()) {
      return res.status(400).json({ error: 'Veuillez renseigner une adresse email destinataire' })
    }

    const config = await GlobalConfig.findOne()
    const host = (req.body.host || config?.host || '').trim()
    const port = Number(req.body.port || config?.port || 587)
    const secure = req.body.secure !== undefined ? Boolean(req.body.secure) : Boolean(config?.secure)
    const user = (req.body.user || config?.user || '').trim()
    const pass = req.body.password || req.body.pass || config?.pass
    const fromName = req.body.fromName || config?.fromName || 'FamilyGest Platform'
    const fromEmail = (req.body.from || req.body.fromEmail || config?.fromEmail || user).trim()

    if (!host || !user || !pass) {
      return res.status(400).json({ error: 'Veuillez renseigner l\'hôte, l\'utilisateur et le mot de passe SMTP' })
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    })

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientEmail.trim(),
      subject: '✨ Test de connexion SMTP Plateforme - FamilyGest',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0;">
          <h2 style="color: #4f46e5;">Connexion SMTP Plateforme Réussie !</h2>
          <p>Le serveur SMTP global de FamilyGest fonctionne correctement.</p>
          <p style="color: #64748b; font-size: 13px;">Expédié depuis : ${fromEmail}</p>
        </div>
      `
    })

    res.json({ success: true, message: `Email de test plateforme envoyé avec succès à ${recipientEmail.trim()}` })
  } catch (err) {
    res.status(500).json({ error: `Échec de l'envoi : ${err.message}` })
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
    const memberCount = await FamilyMember.countDocuments({ familyId: req.family._id })
    const isFamilyAdmin = Boolean(req.user?.isSuperAdmin || req.membership?.isAdmin)
    res.json({
      family: {
        _id: req.family._id,
        name: req.family.name,
        slug: req.family.slug,
        maxMembers: req.family.maxMembers,
        memberCount
      },
      membership: req.membership,
      role: req.membership?.role || (isFamilyAdmin ? 'Administrateur' : 'Membre'),
      isAdmin: isFamilyAdmin
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/families/:familySlug/check-email (Vérification si un email existe avant invitation par l'admin familial)
app.post('/api/families/:familySlug/check-email', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim()
    if (!email) return res.status(400).json({ error: 'Adresse email requise' })

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
    if (!email) return res.status(400).json({ error: 'Adresse email requise' })

    const cleanEmail = email.toLowerCase().trim()

    // Vérifier le quota
    const currentMemberCount = await FamilyMember.countDocuments({ familyId: req.family._id })
    if (currentMemberCount >= req.family.maxMembers) {
      return res.status(400).json({ error: `Le quota maximal de cette famille (${req.family.maxMembers} membres) est atteint` })
    }

    const existingUser = await User.findOne({ email: cleanEmail })
    if (existingUser) {
      const alreadyMember = await FamilyMember.findOne({ familyId: req.family._id, userId: existingUser.id })
      if (alreadyMember) {
        return res.status(400).json({ error: 'Cet utilisateur fait déjà partie de la famille' })
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
    await sendFamilyInvitationEmail({
      email: cleanEmail,
      family: req.family,
      invitationToken: token,
      isExistingUser: Boolean(existingUser),
      invitedByName: `${req.user.firstName} ${req.user.lastName}`
    })

    res.json({
      success: true,
      message: `Invitation envoyée avec succès à ${cleanEmail}`,
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
    if (!invitation) return res.status(404).json({ error: 'Invitation introuvable' })

    if (invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Cette invitation a expiré ou a déjà été utilisée' })
    }

    const family = await Family.findById(invitation.familyId)
    if (!family) return res.status(404).json({ error: 'Famille introuvable' })

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
app.post('/api/invitations/:token/accept', async (req, res) => {
  try {
    const invitation = await FamilyInvitation.findOne({ token: req.params.token })
    if (!invitation) return res.status(404).json({ error: 'Invitation introuvable' })

    if (invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Cette invitation a expiré ou a déjà été utilisée' })
    }

    const family = await Family.findById(invitation.familyId)
    if (!family) return res.status(404).json({ error: 'Famille introuvable' })

    let user = await User.findOne({ email: invitation.email })
    let alreadyMember = false
    if (user) {
      alreadyMember = await FamilyMember.findOne({ familyId: family._id, userId: user.id })
    }

    // Contrôle quota uniquement pour les nouveaux membres arrivants
    if (!alreadyMember) {
      const currentMemberCount = await FamilyMember.countDocuments({ familyId: family._id })
      if (currentMemberCount >= family.maxMembers) {
        return res.status(400).json({ error: `Le quota de membres pour la famille "${family.name}" est atteint` })
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
          usualPresence: req.body.usualPresence || 'present',
          pushNotificationsEnabled: true,
          emailNotificationsEnabled: false
        })
        await newMember.save()
      }
    } else {
      // Nouvel utilisateur : création complète
      const { password, firstName, lastName, avatar, color, usualPresence, role } = req.body
      if (!password) {
        return res.status(400).json({ error: 'Veuillez définir un mot de passe' })
      }

      const pwdCheck = validatePasswordSecurity(password)
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
        usualPresence: usualPresence || 'present'
      })
      await user.save()

      const newMember = new FamilyMember({
        familyId: family._id,
        userId: user.id,
        userRef: user._id,
        role: assignedRole,
        isAdmin: isInvitedAdmin, // Le rôle d'administrateur familial réside ici
        usualPresence: usualPresence || 'present',
        pushNotificationsEnabled: true,
        emailNotificationsEnabled: false
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
        role: user.role
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === MEMBERS ROUTES (SCOPED TO FAMILY) ===
app.get('/api/members', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const memberships = await FamilyMember.find({ familyId: req.family._id })
    const userIds = memberships.map(m => m.userId)
    const users = await User.find({ id: { $in: userIds } }).select('-password')

    const members = memberships.map(mem => {
      const u = users.find(user => user.id === mem.userId)
      if (!u) return null
      return {
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        isAdmin: mem.isAdmin,
        role: mem.role || 'Membre',
        avatar: u.avatar,
        color: u.color,
        points: mem.points || 0,
        pushNotificationsEnabled: mem.pushNotificationsEnabled !== false,
        emailNotificationsEnabled: Boolean(mem.emailNotificationsEnabled),
        usualPresence: mem.usualPresence || 'present',
        isSuperAdmin: Boolean(u.isSuperAdmin)
      }
    }).filter(Boolean)

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
      return res.status(400).json({ error: `Le quota maximal de cette famille (${req.family.maxMembers} membres) est atteint` })
    }

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

    let user = await User.findOne({ email: userEmail })
    if (user) {
      const already = await FamilyMember.findOne({ familyId: req.family._id, userId: user.id })
      if (already) {
        return res.status(400).json({ error: 'Ce membre fait déjà partie de la famille' })
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
      sendWelcomeEmail(user, welcomeToken)
    }

    const newMembership = new FamilyMember({
      familyId: req.family._id,
      userId: user.id,
      userRef: user._id,
      role: role || (isAdmin ? 'Administrateur' : 'Membre'),
      isAdmin: Boolean(isAdmin),
      usualPresence: usualPresence || 'present',
      points: Number(points) || 0,
      pushNotificationsEnabled: true,
      emailNotificationsEnabled: false
    })
    await newMembership.save()

    res.status(201).json({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isAdmin: newMembership.isAdmin,
      role: newMembership.role,
      avatar: user.avatar,
      color: user.color,
      points: newMembership.points,
      usualPresence: newMembership.usualPresence
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Modifier un membre : Réservé à l'Administrateur
app.put('/api/members/:id', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const memberId = Number(req.params.id)
    const user = await User.findOne({ id: memberId })
    if (!user) return res.status(404).json({ error: 'Membre non trouvé' })

    const membership = await FamilyMember.findOne({ familyId: req.family._id, userId: memberId })
    if (!membership) return res.status(404).json({ error: 'Membre non trouvé dans cette famille' })

    const { name, firstName, lastName, email, password, role, avatar, color, points, isAdmin, pushNotificationsEnabled, emailNotificationsEnabled, usualPresence } = req.body

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
    if (pushNotificationsEnabled !== undefined) membership.pushNotificationsEnabled = Boolean(pushNotificationsEnabled)
    if (emailNotificationsEnabled !== undefined) membership.emailNotificationsEnabled = Boolean(emailNotificationsEnabled)
    if (usualPresence && ['present', 'absent'].includes(usualPresence)) {
      membership.usualPresence = usualPresence
    }

    if (isAdmin !== undefined && isAdmin !== null) {
      const newAdminState = Boolean(isAdmin)
      if (user.id === req.user.id && !newAdminState && membership.isAdmin) {
        return res.status(400).json({ error: 'Vous ne pouvez pas retirer vos propres privilèges d\'administrateur' })
      }
      if (membership.isAdmin && !newAdminState) {
        const adminCount = await FamilyMember.countDocuments({ familyId: req.family._id, isAdmin: true })
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Impossible de retirer le statut administrateur car il s\'agit du dernier administrateur de cette famille.' })
        }
      }
      membership.isAdmin = newAdminState
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
      points: membership.points,
      pushNotificationsEnabled: membership.pushNotificationsEnabled !== false,
      emailNotificationsEnabled: Boolean(membership.emailNotificationsEnabled),
      usualPresence: membership.usualPresence || 'present'
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Modifier le statut Administrateur d'un membre : Réservé à l'Administrateur
app.put('/api/members/:id/toggle-admin', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const memberId = Number(req.params.id)
    const membership = await FamilyMember.findOne({ familyId: req.family._id, userId: memberId })
    if (!membership) return res.status(404).json({ error: 'Membre non trouvé dans cette famille' })

    const user = await User.findOne({ id: memberId })
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' })

    if (user.id === req.user.id && membership.isAdmin) {
      return res.status(400).json({ error: 'Vous ne pouvez pas retirer vos propres privilèges d\'administrateur' })
    }

    if (membership.isAdmin) {
      const adminCount = await FamilyMember.countDocuments({ familyId: req.family._id, isAdmin: true })
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Impossible de retirer le statut administrateur car il s\'agit du dernier administrateur de cette famille.' })
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
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte de la famille' })
    }
    const membership = await FamilyMember.findOne({ familyId: req.family._id, userId: memberId })
    if (!membership) return res.status(404).json({ error: 'Membre non trouvé dans cette famille' })

    if (membership.isAdmin) {
      const adminCount = await FamilyMember.countDocuments({ familyId: req.family._id, isAdmin: true })
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Impossible de supprimer cet administrateur car il s\'agit du dernier administrateur de cette famille.' })
      }
    }

    await FamilyMember.deleteOne({ familyId: req.family._id, userId: memberId })
    res.json({ message: 'Membre retiré de la famille' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Renvoyer manuellement un email de bienvenue avec un nouveau token de 2h : Réservé à l'Administrateur
app.post('/api/members/:id/resend-welcome', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const memberId = Number(req.params.id)
    const user = await User.findOne({ id: memberId })
    if (!user) return res.status(404).json({ error: 'Membre non trouvé' })

    const config = await getSmtpConfig(req.family._id)
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
      dueDate: req.body.dueDate
    })
    await newTask.save()

    // Informations pour les notifications
    const authorName = req.user ? req.user.firstName : 'Un membre'
    const assignedUser = await User.findOne({ id: newTask.assignedTo })
    const assignedName = assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Non assigné'

    // Notification push pour la nouvelle tâche
    sendPushNotification({
      title: `📋 Nouvelle tâche : ${newTask.title}`,
      body: `Assignée à ${assignedName} • +${newTask.points} pts • Ajoutée par ${authorName}`,
      url: '/tasks',
      excludeUserId: req.user ? req.user.id : null,
      familyId: req.family._id
    })

    // Notification email pour la nouvelle tâche
    sendNotificationEmail({
      subject: `📋 Nouvelle tâche : ${newTask.title}`,
      title: `Nouvelle tâche ajoutée`,
      badge: '📋',
      detailsHtml: `
        <p style="margin: 0 0 10px 0; font-size: 15px; color: #1e293b;">
          <strong>${authorName}</strong> a ajouté une nouvelle tâche :
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
          <li><strong>Titre :</strong> ${newTask.title}</li>
          <li><strong>Assignée à :</strong> ${assignedName}</li>
          <li><strong>Catégorie :</strong> ${newTask.category || 'Maison'}</li>
          <li><strong>Priorité :</strong> ${newTask.priority || 'Moyenne'}</li>
          <li><strong>Récompense :</strong> +${newTask.points} pts</li>
          ${newTask.dueDate ? `<li><strong>Échéance :</strong> ${newTask.dueDate}</li>` : ''}
        </ul>
      `,
      actionUrl: '/tasks',
      actionText: 'Voir les tâches',
      excludeUserId: req.user ? req.user.id : null,
      familyId: req.family._id
    })

    res.status(201).json(newTask)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/tasks/:id/toggle', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const task = await Task.findOne({ id: Number(req.params.id), familyId: req.family._id })
    if (!task) return res.status(404).json({ error: 'Tâche non trouvée' })

    task.completed = !task.completed
    await task.save()

    // Mise à jour des points du membre dans la famille
    const membership = await FamilyMember.findOne({ familyId: req.family._id, userId: task.assignedTo })
    if (membership) {
      if (task.completed) {
        membership.points = (membership.points || 0) + task.points
      } else {
        membership.points = Math.max(0, (membership.points || 0) - task.points)
      }
      await membership.save()
    }

    const user = await User.findOne({ id: task.assignedTo })
    if (user) {
      if (task.completed) {
        user.points = (user.points || 0) + task.points
      } else {
        user.points = Math.max(0, (user.points || 0) - task.points)
      }
      await user.save()
    }

    res.json(task)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/tasks/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    await Task.deleteOne({ id: Number(req.params.id), familyId: req.family._id })
    res.json({ message: 'Tâche supprimée' })
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

app.post('/api/events', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const newEvent = new Event({
      familyId: req.family._id,
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

    // Liens et contenu pour ajout à l'agenda personnel
    const emailConfig = await getSmtpConfig(req.family._id)
    const baseServerUrl = (emailConfig?.serverUrl || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '')
    const googleCalendarUrl = generateServerGoogleCalendarUrl(newEvent)
    const icsContent = generateServerIcsContent(newEvent)
    const icsDownloadUrl = `${baseServerUrl}/api/events/${newEvent.id}/ics`

    // Notification push pour le nouvel événement agenda avec bouton Google Agenda
    const authorName = req.user ? req.user.firstName : 'Un membre'
    const timeStr = newEvent.time ? ` à ${newEvent.time}` : ''
    const locStr = newEvent.location ? ` (${newEvent.location})` : ''
    sendPushNotification({
      title: `📅 Nouvel événement : ${newEvent.title}`,
      body: `${newEvent.date}${timeStr}${locStr} • Ajouté par ${authorName}`,
      url: '/calendar',
      excludeUserId: req.user ? req.user.id : null,
      familyId: req.family._id,
      actions: [
        { action: 'open', title: 'Voir' },
        { action: 'add-google', title: '📅 Google Agenda' }
      ],
      googleCalendarUrl
    })

    // Notification email pour le nouvel événement agenda avec boutons et invitation .ics
    sendNotificationEmail({
      subject: `📅 Nouvel événement agenda : ${newEvent.title}`,
      title: `Nouvel événement dans l'agenda`,
      badge: '📅',
      detailsHtml: `
        <p style="margin: 0 0 10px 0; font-size: 15px; color: #1e293b;">
          <strong>${authorName}</strong> a ajouté un événement au calendrier familial :
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
          <li><strong>Titre :</strong> ${newEvent.title}</li>
          <li><strong>Date :</strong> ${newEvent.date}${timeStr}</li>
          ${newEvent.location ? `<li><strong>Lieu :</strong> ${newEvent.location}</li>` : ''}
          <li><strong>Catégorie :</strong> ${newEvent.category || 'Famille'}</li>
        </ul>
      `,
      actionUrl: '/calendar',
      actionText: 'Voir dans le calendrier',
      excludeUserId: req.user ? req.user.id : null,
      familyId: req.family._id,
      calendarData: {
        googleUrl: googleCalendarUrl,
        icsUrl: icsDownloadUrl,
        icsContent,
        eventTitle: newEvent.title
      }
    })

    res.status(201).json(newEvent)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT /api/events/:id (Modification d'un événement avec alertes push & email)
app.put('/api/events/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const eventId = Number(req.params.id)
    const event = await Event.findOne({ id: eventId, familyId: req.family._id })
    if (!event) return res.status(404).json({ error: 'Événement non trouvé' })

    const { title, date, time, category, location, color, assignedTo } = req.body

    if (title) event.title = title.trim()
    if (date) event.date = date
    if (time !== undefined) event.time = time
    if (category) event.category = category
    if (location !== undefined) event.location = location
    if (color) event.color = color
    if (assignedTo !== undefined) event.assignedTo = assignedTo

    await event.save()

    // Liens et contenu pour ajout/mise à jour sur l'agenda personnel
    const emailConfig = await getSmtpConfig(req.family._id)
    const baseServerUrl = (emailConfig?.serverUrl || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '')
    const googleCalendarUrl = generateServerGoogleCalendarUrl(event)
    const icsContent = generateServerIcsContent(event)
    const icsDownloadUrl = `${baseServerUrl}/api/events/${event.id}/ics`

    const authorName = req.user ? req.user.firstName : 'Un membre'
    const timeStr = event.time ? ` à ${event.time}` : ''
    const locStr = event.location ? ` (${event.location})` : ''

    // Notification push pour l'événement modifié
    sendPushNotification({
      title: `✏️ Événement modifié : ${event.title}`,
      body: `${event.date}${timeStr}${locStr} • Modifié par ${authorName}`,
      url: '/calendar',
      excludeUserId: req.user ? req.user.id : null,
      familyId: req.family._id,
      actions: [
        { action: 'open', title: 'Voir l\'agenda' },
        { action: 'add-google', title: '📅 Mettre à jour' }
      ],
      googleCalendarUrl
    })

    // Notification email pour l'événement modifié
    sendNotificationEmail({
      subject: `✏️ Événement modifié : ${event.title}`,
      title: `Événement modifié dans l'agenda`,
      badge: '✏️',
      detailsHtml: `
        <p style="margin: 0 0 10px 0; font-size: 15px; color: #1e293b;">
          <strong>${authorName}</strong> a modifié cet événement dans le calendrier familial :
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
          <li><strong>Titre :</strong> ${event.title}</li>
          <li><strong>Nouvelle date :</strong> ${event.date}${timeStr}</li>
          ${event.location ? `<li><strong>Lieu :</strong> ${event.location}</li>` : ''}
          <li><strong>Catégorie :</strong> ${event.category || 'Famille'}</li>
        </ul>
      `,
      actionUrl: '/calendar',
      actionText: 'Voir dans le calendrier',
      excludeUserId: req.user ? req.user.id : null,
      familyId: req.family._id,
      calendarData: {
        googleUrl: googleCalendarUrl,
        icsUrl: icsDownloadUrl,
        icsContent,
        eventTitle: event.title
      }
    })

    res.json(event)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/events/:id/ics (Téléchargement direct du fichier iCalendar pour ajout à Apple / Outlook)
app.get('/api/events/:id/ics', async (req, res) => {
  try {
    const event = await Event.findOne({ id: Number(req.params.id) })
    if (!event) return res.status(404).send('Événement introuvable')

    const icsContent = generateServerIcsContent(event)
    const sanitizedTitle = (event.title || 'evenement').toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedTitle || 'evenement'}.ics"`)
    res.send(icsContent)
  } catch (err) {
    res.status(500).send('Erreur lors de la génération du fichier calendrier')
  }
})

app.delete('/api/events/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    await Event.deleteOne({ id: Number(req.params.id), familyId: req.family._id })
    res.json({ message: 'Événement supprimé' })
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

app.get('/api/shopping-categories', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    let cats = await ShoppingCategory.find({ familyId: req.family._id }).sort({ rank: 1 })
    if (cats.length === 0) {
      const docs = DEFAULT_CATEGORIES.map((c, i) => ({ ...c, familyId: req.family._id, id: Date.now() + i }))
      cats = await ShoppingCategory.insertMany(docs)
    }
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
    if (!cat) return res.status(404).json({ error: 'Catégorie non trouvée' })
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
    res.json({ message: 'Catégorie supprimée' })
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
      checked: false
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
    if (!item) return res.status(404).json({ error: 'Article non trouvé' })

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
    if (!item) return res.status(404).json({ error: 'Article non trouvé' })

    if (req.body.name !== undefined)     item.name     = req.body.name
    if (req.body.category !== undefined) item.category = req.body.category
    if (req.body.quantity !== undefined) item.quantity = Number(req.body.quantity)
    if (req.body.urgent !== undefined)   item.urgent   = Boolean(req.body.urgent)

    await item.save()
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/shopping/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    await ShoppingItem.deleteOne({ id: Number(req.params.id), familyId: req.family._id })
    res.json({ message: 'Article supprimé' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === ABSENCES & MEALS ROUTES ===
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
    const { memberId, date, type, lunch, dinner, night, note } = req.body

    if (!memberId || !date) {
      return res.status(400).json({ error: 'Membre et date requis' })
    }

    if (!lunch && !dinner && !night) {
      return res.status(400).json({ error: 'Veuillez sélectionner au moins un créneau (Déjeuner, Dîner ou Nuit)' })
    }

    const recordType = type === 'presence' ? 'presence' : 'absence'

    const notifyAbsenceOrPresence = async (recType, mId, dStr, l, din, n, nt) => {
      try {
        const member = await User.findOne({ id: Number(mId) })
        const mName = member ? member.firstName : 'Un membre'
        const authorName = req.user ? req.user.firstName : 'Un membre'
        const isSelf = req.user && req.user.id === Number(mId)
        const slots = []
        if (l) slots.push('Midi')
        if (din) slots.push('Soir')
        if (n) slots.push('Nuit')
        const slotsStr = slots.length > 0 ? slots.join(', ') : 'Journée'
        const noteStr = nt ? ` • ${nt.trim()}` : ''

        if (recType === 'presence') {
          const pushTitle = `🟢 Présence confirmée : ${mName}`
          const pushBody = isSelf
            ? `${mName} sera présent(e) le ${dStr.trim()} (${slotsStr})${noteStr}`
            : `${authorName} a signalé la présence de ${mName} le ${dStr.trim()} (${slotsStr})${noteStr}`

          sendPushNotification({
            title: pushTitle,
            body: pushBody,
            url: '/absences',
            excludeUserId: req.user ? req.user.id : null,
            familyId: req.family._id
          })

          const emailSubject = isSelf 
            ? `🟢 Présence confirmée : ${mName}`
            : `🟢 Présence signalée pour ${mName} par ${authorName}`

          const introHtml = isSelf
            ? `<strong>${mName}</strong> a confirmé sa présence :`
            : `<strong>${authorName}</strong> a signalé la présence de <strong>${mName}</strong> :`

          sendNotificationEmail({
            subject: emailSubject,
            title: `Nouvelle présence signalée`,
            badge: '🟢',
            detailsHtml: `
              <p style="margin: 0 0 10px 0; font-size: 15px; color: #1e293b;">
                ${introHtml}
              </p>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
                <li><strong>Membre :</strong> ${mName}</li>
                <li><strong>Date :</strong> ${dStr.trim()}</li>
                <li><strong>Créneau(x) concerné(s) :</strong> ${slotsStr}</li>
                ${!isSelf ? `<li><strong>Signalé par :</strong> ${authorName}</li>` : ''}
                ${nt ? `<li><strong>Remarque :</strong> ${nt.trim()}</li>` : ''}
              </ul>
            `,
            actionUrl: '/absences',
            actionText: 'Consulter les présences & repas',
            excludeUserId: req.user ? req.user.id : null,
            familyId: req.family._id
          })
        } else {
          const pushTitle = `🚫 Nouvelle absence : ${mName}`
          const pushBody = isSelf
            ? `${mName} sera absent(e) le ${dStr.trim()} (${slotsStr})${noteStr}`
            : `${authorName} a signalé l'absence de ${mName} le ${dStr.trim()} (${slotsStr})${noteStr}`

          sendPushNotification({
            title: pushTitle,
            body: pushBody,
            url: '/absences',
            excludeUserId: req.user ? req.user.id : null,
            familyId: req.family._id
          })

          const emailSubject = isSelf 
            ? `🚫 Nouvelle absence signalée : ${mName}`
            : `🚫 Absence signalée pour ${mName} par ${authorName}`

          const introHtml = isSelf
            ? `<strong>${mName}</strong> a signalé une absence :`
            : `<strong>${authorName}</strong> a signalé l'absence de <strong>${mName}</strong> :`

          sendNotificationEmail({
            subject: emailSubject,
            title: `Nouvelle absence signalée`,
            badge: '🚫',
            detailsHtml: `
              <p style="margin: 0 0 10px 0; font-size: 15px; color: #1e293b;">
                ${introHtml}
              </p>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
                <li><strong>Membre :</strong> ${mName}</li>
                <li><strong>Date :</strong> ${dStr.trim()}</li>
                <li><strong>Créneau(x) concerné(s) :</strong> ${slotsStr}</li>
                ${!isSelf ? `<li><strong>Signalé par :</strong> ${authorName}</li>` : ''}
                ${nt ? `<li><strong>Remarque :</strong> ${nt.trim()}</li>` : ''}
              </ul>
            `,
            actionUrl: '/absences',
            actionText: 'Consulter les absences & repas',
            excludeUserId: req.user ? req.user.id : null,
            familyId: req.family._id
          })
        }
      } catch (e) {
        console.error('[WebPush] Erreur notification absence/présence:', e.message)
      }
    }

    let existing = await Absence.findOne({ memberId: Number(memberId), date: date.trim(), familyId: req.family._id })
    if (existing) {
      existing.type = recordType
      existing.lunch = Boolean(lunch)
      existing.dinner = Boolean(dinner)
      existing.night = Boolean(night)
      if (note !== undefined) existing.note = note.trim()
      existing.declaredBy = req.user ? req.user.id : null
      await existing.save()
      notifyAbsenceOrPresence(existing.type, memberId, date, lunch, dinner, night, note)
      return res.json(existing)
    }

    const newAbsence = new Absence({
      familyId: req.family._id,
      id: Date.now(),
      memberId: Number(memberId),
      date: date.trim(),
      type: recordType,
      lunch: Boolean(lunch),
      dinner: Boolean(dinner),
      night: Boolean(night),
      note: (note || '').trim(),
      declaredBy: req.user ? req.user.id : null
    })

    await newAbsence.save()
    notifyAbsenceOrPresence(newAbsence.type, memberId, date, lunch, dinner, night, note)
    res.status(201).json(newAbsence)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/absences/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const absence = await Absence.findOne({ id: Number(req.params.id), familyId: req.family._id })
    if (!absence) return res.status(404).json({ error: 'Absence non trouvée' })

    const isAuthorized = absence.memberId === req.user.id || absence.declaredBy === req.user.id || req.membership?.isAdmin || req.user?.isSuperAdmin
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres déclarations d\'absence ou de présence' })
    }

    const { memberId, date, type, lunch, dinner, night, note } = req.body
    if (memberId !== undefined && (req.membership?.isAdmin || req.user?.isSuperAdmin)) absence.memberId = Number(memberId)
    if (date) absence.date = date.trim()
    if (type && ['absence', 'presence'].includes(type)) absence.type = type
    if (lunch !== undefined) absence.lunch = Boolean(lunch)
    if (dinner !== undefined) absence.dinner = Boolean(dinner)
    if (night !== undefined) absence.night = Boolean(night)
    if (note !== undefined) absence.note = note.trim()

    if (!absence.lunch && !absence.dinner && !absence.night) {
      await Absence.deleteOne({ id: absence.id, familyId: req.family._id })
      return res.json({ message: 'Absence supprimée car aucun créneau n\'est sélectionné' })
    }

    await absence.save()
    res.json(absence)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/absences/:id', requireAuth, attachFamilyContext, async (req, res) => {
  try {
    const absence = await Absence.findOne({ id: Number(req.params.id), familyId: req.family._id })
    if (!absence) return res.status(404).json({ error: 'Absence non trouvée' })

    const isAuthorized = absence.memberId === req.user.id || absence.declaredBy === req.user.id || req.membership?.isAdmin || req.user?.isSuperAdmin
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres déclarations d\'absence ou de présence' })
    }

    await Absence.deleteOne({ id: Number(req.params.id), familyId: req.family._id })
    res.json({ message: 'Absence supprimée' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === MEAL GUESTS ROUTES (INVITÉS AUX REPAS) ===
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
      return res.status(400).json({ error: 'La date est requise' })
    }

    if (!lunch && !dinner && !night) {
      return res.status(400).json({ error: 'Veuillez sélectionner au moins un créneau (Déjeuner, Dîner ou Nuit)' })
    }

    let guestNames = []
    if (Array.isArray(names) && names.length > 0) {
      guestNames = names.map(n => String(n).trim()).filter(Boolean)
    } else if (name && typeof name === 'string') {
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
        familyId: req.family._id,
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
        excludeUserId: req.user ? req.user.id : null,
        familyId: req.family._id
      })

      sendNotificationEmail({
        subject: `🍽️ Nouvel invité aux repas : ${namesStr}`,
        title: `Nouvel invité aux repas`,
        badge: '🍽️',
        detailsHtml: `
          <p style="margin: 0 0 10px 0; font-size: 15px; color: #1e293b;">
            <strong>${hostName}</strong> a invité à la maison :
          </p>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
            <li><strong>Invité(s) :</strong> ${namesStr}</li>
            <li><strong>Date :</strong> ${date.trim()}</li>
            <li><strong>Créneau(x) :</strong> ${slotsStr}</li>
            ${note ? `<li><strong>Remarque :</strong> ${note.trim()}</li>` : ''}
          </ul>
        `,
        actionUrl: '/absences',
        actionText: 'Consulter le planning des repas',
        excludeUserId: req.user ? req.user.id : null,
        familyId: req.family._id
      })
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
      await MealGuest.deleteOne({ id: guest.id, familyId: req.family._id })
      return res.json({ message: 'Invité supprimé car aucun créneau n\'est sélectionné' })
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
    res.json({ message: 'Invité supprimé' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === EMAIL & APP SETTINGS ROUTES (ADMIN FAMILIAL) ===
app.get('/api/settings/email', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    let config = await EmailConfig.findOne({ familyId: req.family._id })
    const globalConfig = await GlobalConfig.findOne()

    res.json({
      serverUrl: config?.serverUrl || globalConfig?.serverUrl || 'http://localhost:5173',
      providerPreset: config?.providerPreset || 'gmail',
      host: config?.host || '',
      port: config?.port || 587,
      secure: Boolean(config?.secure),
      user: config?.user || '',
      hasPassword: Boolean(config?.pass && config.pass.length > 0),
      fromEmail: config?.fromEmail || config?.user || '',
      fromName: config?.fromName || req.family.name || 'FamilyGest',
      isConfigured: Boolean(config?.isConfigured),
      isUsingGlobalFallback: Boolean(!config?.isConfigured && globalConfig?.isConfigured)
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/settings/email', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const { serverUrl, providerPreset, host, port, secure, user, pass, fromEmail, fromName } = req.body

    let config = await EmailConfig.findOne({ familyId: req.family._id })
    if (!config) {
      config = new EmailConfig({ familyId: req.family._id })
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
      message: 'Paramètres email de la famille enregistrés avec succès',
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

app.post('/api/settings/email/test', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    const { recipientEmail } = req.body
    if (!recipientEmail || !recipientEmail.trim()) {
      return res.status(400).json({ error: 'Veuillez renseigner une adresse email destinataire' })
    }

    const config = await getSmtpConfig(req.family._id)
    if (!config || !config.host || !config.user || !config.pass) {
      return res.status(400).json({ error: 'Aucun serveur email n\'est configuré (ni familial, ni plateforme)' })
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
      from: `"${config.fromName || req.family.name || 'FamilyGest'}" <${config.fromEmail || config.user}>`,
      to: recipientEmail.trim(),
      subject: `✨ Test de configuration Email - ${req.family.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 12px; border: 1px solid #e0e7ff; background-color: #f8fafc;">
          <h2 style="color: #4f46e5; margin-top: 0;">🎉 Connexion Email Réussie pour ${req.family.name} !</h2>
          <p>Bonjour,</p>
          <p>Ceci est un message de test envoyé depuis votre espace familial <strong>${req.family.name}</strong> sur <strong>FamilyGest</strong>.</p>
          <p>Vos paramètres de serveur d'envoi Email sont opérationnels :</p>
          <ul>
            <li><strong>Serveur :</strong> ${config.host}:${config.port}</li>
            <li><strong>Compte :</strong> ${config.user}</li>
            <li><strong>Expéditeur :</strong> ${config.fromName || req.family.name}</li>
          </ul>
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
      return res.status(400).json({ error: 'Le titre et l\'adresse URL sont requis' })
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

app.delete('/api/shortcuts/:id', requireAuth, attachFamilyContext, requireFamilyAdmin, async (req, res) => {
  try {
    await Shortcut.deleteOne({ id: Number(req.params.id), familyId: req.family._id })
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
  await migrateToMultiFamily()
  await initVapid()

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur API Express Sécurisé démarré sur http://localhost:${PORT}`)
  })
}

startServer()
