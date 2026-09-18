import { gatherFamilyDigestSection } from './gatherFamilyData.js'
import { buildDigestEmailHtml, buildDigestPushPayload } from './templates.js'

const getTodayStr = (timezone) => {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now)
  const lookup = Object.fromEntries(parts.map(p => [p.type, p.value]))
  return `${lookup.year}-${lookup.month}-${lookup.day}`
}

const sendDigestEmail = async (ctx, user, familySections, todayStr) => {
  const config = await ctx.getSmtpConfig()
  if (!config || !config.isConfigured) {
    return { success: false, reason: 'SMTP_NOT_CONFIGURED', count: 0, recipients: [] }
  }

  const baseServerUrl = (config.serverUrl || 'http://localhost:5173').replace(/\/+$/, '')
  const html = buildDigestEmailHtml({ user, familySections, todayStr, baseServerUrl })

  try {
    await ctx.sendEmailWithConfig(config, {
      to: user.email,
      subject: `☀️ Votre récapitulatif du jour — FamilyGest`,
      html
    })
    return { success: true, count: 1, recipients: [{ userId: user.id, name: `${user.firstName} ${user.lastName}`.trim(), email: user.email }] }
  } catch (err) {
    return { success: false, error: err.message, count: 0, recipients: [] }
  }
}

const sendDigestPush = async (ctx, user, familySections) => {
  const vapid = ctx.getVapidKeys()
  if (!vapid.publicKey || !vapid.privateKey) {
    return { success: false, reason: 'PUSH_NOT_CONFIGURED', count: 0, recipients: [] }
  }

  const subscriptions = await ctx.PushSubscription.find({ userId: user.id })
  if (subscriptions.length === 0) {
    return { success: false, reason: 'NO_SUBSCRIPTIONS', count: 0, recipients: [] }
  }

  const { title, body, url } = buildDigestPushPayload({ familySections })
  const payload = JSON.stringify({
    title,
    body,
    url,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: `familygest-digest-${Date.now()}`
  })

  let delivered = false
  await Promise.allSettled(subscriptions.map(async (sub) => {
    try {
      await ctx.webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, payload)
      delivered = true
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await ctx.PushSubscription.deleteOne({ _id: sub._id })
      }
    }
  }))

  return {
    success: delivered,
    count: delivered ? 1 : 0,
    recipients: delivered ? [{ userId: user.id, name: `${user.firstName} ${user.lastName}`.trim(), email: '' }] : []
  }
}

// Orchestration : un récapitulatif consolidé par utilisateur, couvrant toutes ses familles
// actives, envoyé selon ses préférences (User.notificationPreferences.digest).
export const runDailyDigest = async (ctx) => {
  const timezone = process.env.DIGEST_TIMEZONE || 'Europe/Paris'
  const todayStr = getTodayStr(timezone)

  const users = await ctx.User.find({})
  for (const user of users) {
    const wantsEmail = user.notificationPreferences?.digest?.email === true
    const wantsPush = user.notificationPreferences?.digest?.push === true
    if (!wantsEmail && !wantsPush) continue

    const memberships = await ctx.FamilyMember.find({ userId: user.id })
    if (memberships.length === 0) continue

    const familySections = []
    for (const membership of memberships) {
      const family = await ctx.Family.findById(membership.familyId)
      if (!family || family.isActive === false) continue
      familySections.push(await gatherFamilyDigestSection(ctx, family, user, todayStr))
    }
    if (familySections.length === 0) continue

    const emailResult = wantsEmail ? await sendDigestEmail(ctx, user, familySections, todayStr) : null
    const pushResult = wantsPush ? await sendDigestPush(ctx, user, familySections) : null

    await ctx.logAlertEntry({
      family: null,
      actor: null,
      action: ctx.ALERT_ACTIONS.DIGEST_SENT.code,
      actionLabel: ctx.ALERT_ACTIONS.DIGEST_SENT.label,
      title: `Récapitulatif quotidien pour ${user.firstName} ${user.lastName}`,
      targetType: 'user',
      targetId: user.id,
      channels: [
        pushResult ? ctx.toAlertChannelLog('push', pushResult) : null,
        emailResult ? ctx.toAlertChannelLog('email', emailResult) : null
      ]
    })
  }
}
