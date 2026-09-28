// Signalement de bug : validation du formulaire et des pièces jointes, puis mise en forme de
// l'email envoyé aux Super Admins (route POST /api/bug-reports de server/index.js).
// Sans accès base de données : testable seul.
import { escapeHtml } from '../digest/templates.js'

export const MAX_ATTACHMENTS = 5
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
export const MAX_TOTAL_BYTES = 12 * 1024 * 1024
export const MAX_TEXT = 5000

// Types acceptés, reconnus à leurs premiers octets (on ne se fie pas au type annoncé)
const SIGNATURES = [
  { type: 'image/png', ext: 'png', test: b => b.length > 8 && b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG' },
  { type: 'image/jpeg', ext: 'jpg', test: b => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/gif', ext: 'gif', test: b => b.length > 6 && b.toString('ascii', 0, 4) === 'GIF8' },
  { type: 'image/webp', ext: 'webp', test: b => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { type: 'application/pdf', ext: 'pdf', test: b => b.length > 5 && b.toString('ascii', 0, 5) === '%PDF-' }
]

export class BugReportError extends Error {
  constructor (key, params = {}) {
    super(key)
    this.key = key
    this.params = params
  }
}

const cleanText = (value, max = MAX_TEXT) => String(value ?? '').replace(/\r\n/g, '\n').trim().slice(0, max)

// Nom de fichier sûr (pas de chemin, caractères simples), avec l'extension du type réel
const safeFilename = (name, ext, index) => {
  const base = String(name || '').split(/[\\/]/).pop().replace(/\.[^.]*$/, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60)
  return `${base || `piece-jointe-${index + 1}`}.${ext}`
}

// attachments : [{ name, data }] où data est une chaîne base64 (éventuellement « data:…;base64, »)
export const parseAttachments = (attachments) => {
  if (attachments == null) return []
  if (!Array.isArray(attachments)) throw new BugReportError('errors.bugReportAttachmentInvalid')
  if (attachments.length > MAX_ATTACHMENTS) throw new BugReportError('errors.bugReportTooManyAttachments', { max: MAX_ATTACHMENTS })
  let total = 0
  return attachments.map((file, index) => {
    const raw = String(file?.data || '').replace(/^data:[^;,]*;base64,/, '')
    if (!raw || !/^[A-Za-z0-9+/=\s]+$/.test(raw)) throw new BugReportError('errors.bugReportAttachmentInvalid')
    const content = Buffer.from(raw, 'base64')
    if (content.length === 0) throw new BugReportError('errors.bugReportAttachmentInvalid')
    if (content.length > MAX_ATTACHMENT_BYTES) throw new BugReportError('errors.bugReportAttachmentTooLarge', { max: MAX_ATTACHMENT_BYTES / 1024 / 1024 })
    total += content.length
    if (total > MAX_TOTAL_BYTES) throw new BugReportError('errors.bugReportAttachmentsTooLarge', { max: MAX_TOTAL_BYTES / 1024 / 1024 })
    const kind = SIGNATURES.find(s => s.test(content))
    if (!kind) throw new BugReportError('errors.bugReportAttachmentType')
    return { filename: safeFilename(file?.name, kind.ext, index), content, contentType: kind.type }
  })
}

// Informations techniques envoyées par l'appli (toutes facultatives, tronquées)
const CONTEXT_FIELDS = ['page', 'screen', 'family', 'version', 'build', 'language', 'userAgent', 'viewport', 'online', 'time']
export const parseContext = (context) => {
  if (!context || typeof context !== 'object') return null
  const out = {}
  for (const key of CONTEXT_FIELDS) {
    const value = cleanText(context[key], 400)
    if (value) out[key] = value
  }
  return Object.keys(out).length ? out : null
}

export const parseBugReport = (body = {}) => {
  const description = cleanText(body.description)
  if (description.length < 5) throw new BugReportError('errors.bugReportDescriptionRequired')
  return {
    description,
    expected: cleanText(body.expected),
    context: parseContext(body.context),
    attachments: parseAttachments(body.attachments)
  }
}

const paragraph = (text) => escapeHtml(text).replace(/\n/g, '<br>')

// Email destiné à un Super Admin, dans sa langue (t = traducteur du destinataire)
export const buildBugReportEmail = ({ t, report, reporter, familyName, reference }) => {
  const who = `${reporter.firstName || ''} ${reporter.lastName || ''}`.trim() || reporter.email
  const subject = t('email.bugReport.subject', { ref: reference, name: who })
  const contextRows = report.context
    ? Object.entries(report.context).map(([key, value]) => `
        <tr>
          <td style="padding: 4px 10px 4px 0; color: #64748b; white-space: nowrap; vertical-align: top;">${escapeHtml(t(`email.bugReport.context.${key}`))}</td>
          <td style="padding: 4px 0; color: #1e293b; word-break: break-word;">${escapeHtml(value)}</td>
        </tr>`).join('')
    : ''
  const attachmentList = report.attachments.length
    ? `<ul style="margin: 6px 0 0; padding-left: 18px;">${report.attachments.map(a => `<li>${escapeHtml(a.filename)} (${Math.max(1, Math.round(a.content.length / 1024))} Ko)</li>`).join('')}</ul>`
    : `<p style="margin: 6px 0 0; color: #64748b;">${escapeHtml(t('email.bugReport.noAttachment'))}</p>`

  const section = (title, body) => `
    <h2 style="margin: 22px 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: #6366f1;">${escapeHtml(title)}</h2>
    ${body}`

  const html = `<!DOCTYPE html>
<html lang="${escapeHtml(t.lang || 'fr')}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(subject)}</title></head>
<body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
    <tr><td style="padding: 28px;">
      <h1 style="margin: 0 0 4px; font-size: 21px; color: #312e81;">🐞 ${escapeHtml(t('email.bugReport.title'))}</h1>
      <p style="margin: 0; color: #64748b; font-size: 13px;">${escapeHtml(t('email.bugReport.reference', { ref: reference }))}</p>

      ${section(t('email.bugReport.from'), `
        <p style="margin: 0; font-size: 15px; color: #1e293b;"><strong>${escapeHtml(who)}</strong> — <a href="mailto:${escapeHtml(reporter.email)}" style="color: #4f46e5;">${escapeHtml(reporter.email)}</a></p>
        ${familyName ? `<p style="margin: 4px 0 0; color: #475569; font-size: 14px;">${escapeHtml(t('email.bugReport.family', { family: familyName }))}</p>` : ''}
        <p style="margin: 6px 0 0; color: #64748b; font-size: 13px;">${escapeHtml(t('email.bugReport.replyHint'))}</p>`)}

      ${section(t('email.bugReport.description'), `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; font-size: 15px; line-height: 1.55; color: #1e293b;">${paragraph(report.description)}</div>`)}

      ${report.expected ? section(t('email.bugReport.expected'), `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; font-size: 15px; line-height: 1.55; color: #1e293b;">${paragraph(report.expected)}</div>`) : ''}

      ${section(t('email.bugReport.attachments', { n: report.attachments.length }), attachmentList)}

      ${contextRows ? section(t('email.bugReport.technical'), `<table role="presentation" style="font-size: 13px; border-collapse: collapse;">${contextRows}</table>`) : ''}
    </td></tr>
  </table>
</body>
</html>`
  return { subject, html }
}
