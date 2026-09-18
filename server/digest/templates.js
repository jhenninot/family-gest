const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

const formatDateFr = (dateStr) => {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  } catch {
    return dateStr
  }
}

const renderMealLine = (label, meal) => {
  const dishStr = meal.dish ? `<strong>${escapeHtml(meal.dish)}</strong>` : '<em>Aucun plat prévu</em>'
  const presentStr = meal.presentMembers.length > 0 ? meal.presentMembers.map(m => escapeHtml(m.name)).join(', ') : 'Personne'
  const guestsStr = meal.guests.length > 0 ? ` + invité(s) : ${meal.guests.map(g => escapeHtml(g.name)).join(', ')}` : ''
  return `<li><strong>${label} :</strong> ${dishStr} — Présents : ${presentStr}${guestsStr} (${meal.headcount} pers.)</li>`
}

const renderNightLine = (night) => {
  const presentStr = night.presentMembers.length > 0 ? night.presentMembers.map(m => escapeHtml(m.name)).join(', ') : 'Personne'
  return `<li><strong>Cette nuit :</strong> ${presentStr}</li>`
}

const renderFamilySection = (section) => {
  const tasksHtml = section.myTasks.length > 0
    ? `<ul style="margin: 6px 0 0 0; padding-left: 20px;">${section.myTasks.map(t => `<li>${escapeHtml(t.title)} <span style="color:#94a3b8;">(+${t.points} pts)</span></li>`).join('')}</ul>`
    : `<p style="margin: 6px 0 0 0; color: #16a34a;">Aucune tâche en attente 🎉</p>`

  const eventsHtml = section.todaysEvents.length > 0
    ? `<ul style="margin: 6px 0 0 0; padding-left: 20px;">${section.todaysEvents.map(e => `<li>${e.time ? escapeHtml(e.time) + ' — ' : ''}${escapeHtml(e.title)}${e.location ? ' (' + escapeHtml(e.location) + ')' : ''}</li>`).join('')}</ul>`
    : `<p style="margin: 6px 0 0 0; color: #64748b;">Aucun événement aujourd'hui</p>`

  const shoppingHtml = section.shoppingList.length > 0
    ? `<ul style="margin: 6px 0 0 0; padding-left: 20px;">${section.shoppingList.map(i => `<li>${escapeHtml(i.name)}${i.urgent ? ' 🔥' : ''} <span style="color:#94a3b8;">(${escapeHtml(i.category)})</span></li>`).join('')}</ul>`
    : `<p style="margin: 6px 0 0 0; color: #64748b;">Liste de courses vide 🛒</p>`

  return `
    <div style="border-left: 4px solid #6366f1; padding: 4px 0 4px 16px; margin: 20px 0;">
      <h2 style="font-size: 17px; color: #312e81; margin: 0 0 10px 0;">🏠 ${escapeHtml(section.family.name)}</h2>

      <p style="font-weight: 700; color: #334155; margin: 12px 0 4px 0;">🍽️ Repas</p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
        ${renderMealLine('Déjeuner', section.meals.lunch)}
        ${renderMealLine('Dîner', section.meals.dinner)}
        ${renderNightLine(section.meals.night)}
      </ul>

      <p style="font-weight: 700; color: #334155; margin: 14px 0 0 0;">✅ Mes tâches en attente</p>
      ${tasksHtml}

      <p style="font-weight: 700; color: #334155; margin: 14px 0 0 0;">📅 Événements du jour</p>
      ${eventsHtml}

      <p style="font-weight: 700; color: #334155; margin: 14px 0 0 0;">🛒 Liste de courses</p>
      ${shoppingHtml}
    </div>
  `
}

export const buildDigestEmailHtml = ({ user, familySections, todayStr, baseServerUrl }) => {
  const firstSlug = familySections[0]?.family.slug || ''
  const actionUrl = `${baseServerUrl}/${firstSlug}/dashboard`

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Récapitulatif du jour</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <tr>
          <td style="padding: 32px 28px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; width: 54px; height: 54px; line-height: 54px; border-radius: 14px; background: linear-gradient(135deg, #f59e0b, #f97316); font-size: 26px; text-align: center; color: #ffffff;">
                ☀️
              </div>
              <h1 style="color: #312e81; margin: 14px 0 4px 0; font-size: 22px; font-weight: 800;">Votre récapitulatif du jour</h1>
              <p style="color: #64748b; margin: 0; font-size: 13px;">${escapeHtml(formatDateFr(todayStr))} • FamilyGest</p>
            </div>

            <p style="font-size: 15px; line-height: 1.5; color: #1e293b; margin-bottom: 8px;">
              Bonjour <strong>${escapeHtml(user.firstName || 'Membre')}</strong>, voici ce qui vous attend aujourd'hui :
            </p>

            ${familySections.map(renderFamilySection).join('')}

            <div style="text-align: center; margin: 28px 0 8px 0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                <tr>
                  <td align="center" bgcolor="#4f46e5" style="border-radius: 8px; background-color: #4f46e5;">
                    <a href="${actionUrl}" target="_blank" style="background-color: #4f46e5; border: 12px solid #4f46e5; border-left: 24px solid #4f46e5; border-right: 24px solid #4f46e5; color: #ffffff !important; font-size: 15px; font-weight: bold; text-decoration: none; display: inline-block; border-radius: 8px;">
                      Ouvrir FamilyGest
                    </a>
                  </td>
                </tr>
              </table>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.4;">
              Vous recevez ce récapitulatif quotidien car vous l'avez activé sur votre compte FamilyGest.<br/>
              Vous pouvez gérer vos préférences de notification à tout moment depuis votre profil, dans l'application.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

export const buildDigestPushPayload = ({ familySections }) => {
  const totalTasks = familySections.reduce((sum, s) => sum + s.myTasks.length, 0)
  const totalEvents = familySections.reduce((sum, s) => sum + s.todaysEvents.length, 0)

  const dinnerCounts = familySections
    .slice(0, 2)
    .map(s => `${s.family.name}: ${s.meals.dinner.headcount}`)
    .join(', ')
  const suffix = familySections.length > 2 ? '…' : ''

  return {
    title: '☀️ Votre récap du jour',
    body: `${totalTasks} tâche(s), ${totalEvents} événement(s) • Dîner : ${dinnerCounts}${suffix}`,
    url: `/${familySections[0]?.family.slug || ''}/dashboard`
  }
}
