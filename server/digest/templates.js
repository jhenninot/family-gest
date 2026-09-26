import { translator, readableDate, translateValue } from '../i18n/index.js'

// Le récapitulatif est rédigé dans la langue du compte destinataire (User.language).

export const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

const renderMealLine = (t, slot, meal) => {
  const dishStr = meal.dish ? `<strong>${escapeHtml(meal.dish)}</strong>` : `<em>${t('digest.noDish')}</em>`
  const presentStr = meal.presentMembers.length > 0 ? meal.presentMembers.map(m => escapeHtml(m.name)).join(', ') : t('digest.nobody')
  const guestsStr = meal.guests.length > 0 ? ` + ${t('digest.guests', { names: meal.guests.map(g => escapeHtml(g.name)).join(', '), n: meal.guests.length })}` : ''
  return `<li><strong>${t('digest.label', { label: t(`digest.slots.${slot}`) })}</strong> ${dishStr} — ${t('digest.present', { names: presentStr })}${guestsStr} (${t('digest.headcount', { n: meal.headcount })})</li>`
}

const renderNightLine = (t, night) => {
  const presentStr = night.presentMembers.length > 0 ? night.presentMembers.map(m => escapeHtml(m.name)).join(', ') : t('digest.nobody')
  return `<li><strong>${t('digest.label', { label: t('digest.slots.night') })}</strong> ${presentStr}</li>`
}

const renderFamilySection = (t, section) => {
  const tasksHtml = section.myTasks.length > 0
    ? `<ul style="margin: 6px 0 0 0; padding-left: 20px;">${section.myTasks.map(task => `<li>${escapeHtml(task.title)} <span style="color:#94a3b8;">(${t('digest.points', { n: task.points })})</span></li>`).join('')}</ul>`
    : `<p style="margin: 6px 0 0 0; color: #16a34a;">${t('digest.noTasks')} 🎉</p>`

  const eventsHtml = section.todaysEvents.length > 0
    ? `<ul style="margin: 6px 0 0 0; padding-left: 20px;">${section.todaysEvents.map(e => `<li>${e.time ? escapeHtml(e.time) + ' — ' : ''}${escapeHtml(e.title)}${e.location ? ' (' + escapeHtml(e.location) + ')' : ''}</li>`).join('')}</ul>`
    : `<p style="margin: 6px 0 0 0; color: #64748b;">${t('digest.noEvents')}</p>`

  const shoppingHtml = section.shoppingList.length > 0
    ? `<ul style="margin: 6px 0 0 0; padding-left: 20px;">${section.shoppingList.map(i => `<li>${escapeHtml(i.name)}${i.urgent ? ' 🔥' : ''} <span style="color:#94a3b8;">(${escapeHtml(translateValue(t, 'shoppingCategory', i.category))})</span></li>`).join('')}</ul>`
    : `<p style="margin: 6px 0 0 0; color: #64748b;">${t('digest.noShopping')} 🛒</p>`

  return `
    <div style="border-left: 4px solid #6366f1; padding: 4px 0 4px 16px; margin: 20px 0;">
      <h2 style="font-size: 17px; color: #312e81; margin: 0 0 10px 0;">🏠 ${escapeHtml(section.family.name)}</h2>

      <p style="font-weight: 700; color: #334155; margin: 12px 0 4px 0;">🍽️ ${t('digest.sections.meals')}</p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
        ${renderMealLine(t, 'lunch', section.meals.lunch)}
        ${renderMealLine(t, 'dinner', section.meals.dinner)}
        ${renderNightLine(t, section.meals.night)}
      </ul>

      <p style="font-weight: 700; color: #334155; margin: 14px 0 0 0;">✅ ${t('digest.sections.tasks')}</p>
      ${tasksHtml}

      <p style="font-weight: 700; color: #334155; margin: 14px 0 0 0;">📅 ${t('digest.sections.events')}</p>
      ${eventsHtml}

      <p style="font-weight: 700; color: #334155; margin: 14px 0 0 0;">🛒 ${t('digest.sections.shopping')}</p>
      ${shoppingHtml}
    </div>
  `
}

export const buildDigestEmailHtml = ({ user, familySections, todayStr, baseServerUrl }) => {
  const t = translator(user.language)
  const firstSlug = familySections[0]?.family.slug || ''
  const actionUrl = `${baseServerUrl}/${firstSlug}/dashboard`

  return `
    <!DOCTYPE html>
    <html lang="${t.lang}">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${t('digest.pageTitle')}</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <tr>
          <td style="padding: 32px 28px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; width: 54px; height: 54px; line-height: 54px; border-radius: 14px; background: linear-gradient(135deg, #f59e0b, #f97316); font-size: 26px; text-align: center; color: #ffffff;">
                ☀️
              </div>
              <h1 style="color: #312e81; margin: 14px 0 4px 0; font-size: 22px; font-weight: 800;">${t('digest.heading')}</h1>
              <p style="color: #64748b; margin: 0; font-size: 13px;">${escapeHtml(readableDate(t, todayStr))} • FamilyGest</p>
            </div>

            <p style="font-size: 15px; line-height: 1.5; color: #1e293b; margin-bottom: 8px;">
              ${t('digest.intro', { name: `<strong>${escapeHtml(user.firstName || t('email.member'))}</strong>` })}
            </p>

            ${familySections.map(section => renderFamilySection(t, section)).join('')}

            <div style="text-align: center; margin: 28px 0 8px 0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                <tr>
                  <td align="center" bgcolor="#4f46e5" style="border-radius: 8px; background-color: #4f46e5;">
                    <a href="${actionUrl}" target="_blank" style="background-color: #4f46e5; border: 12px solid #4f46e5; border-left: 24px solid #4f46e5; border-right: 24px solid #4f46e5; color: #ffffff !important; font-size: 15px; font-weight: bold; text-decoration: none; display: inline-block; border-radius: 8px;">
                      ${t('digest.openApp')}
                    </a>
                  </td>
                </tr>
              </table>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.4;">
              ${t('digest.whyReceived')}<br/>
              ${t('email.layout.managePreferences')}
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

export const buildDigestPushPayload = ({ user, familySections }) => {
  const t = translator(user?.language)
  const totalTasks = familySections.reduce((sum, s) => sum + s.myTasks.length, 0)
  const totalEvents = familySections.reduce((sum, s) => sum + s.todaysEvents.length, 0)

  const dinnerCounts = familySections
    .slice(0, 2)
    .map(s => `${s.family.name}: ${s.meals.dinner.headcount}`)
    .join(', ')
  const suffix = familySections.length > 2 ? '…' : ''

  return {
    title: `☀️ ${t('digest.pushTitle')}`,
    body: `${t('digest.pushTasks', { n: totalTasks })}, ${t('digest.pushEvents', { n: totalEvents })} • ${t('digest.pushDinner', { counts: `${dinnerCounts}${suffix}` })}`,
    url: `/${familySections[0]?.family.slug || ''}/dashboard`
  }
}
