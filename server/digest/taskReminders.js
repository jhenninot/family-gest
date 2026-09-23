import { escapeHtml } from './templates.js'

// Rappel quotidien des tâches à échéance : chaque jour, à l'heure du récapitulatif, la personne
// assignée à une tâche non terminée dont l'échéance est atteinte ou dépassée reçoit une
// notification (une par famille, regroupant ses tâches), par push et/ou email selon ses
// préférences User.notificationPreferences.taskReminders — vérifiées par les helpers d'envoi.

const formatDueLabel = (dueDate, todayStr) => {
  if (dueDate === todayStr) return "aujourd'hui"
  const [y, m, d] = dueDate.split('-').map(Number)
  const formatted = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return `en retard, prévue le ${formatted}`
}

const buildPush = (family, tasks, todayStr) => ({
  // Le nom de la famille est préfixé par sendPushNotification.
  title: tasks.length === 1 ? `📋 Tâche à faire : ${tasks[0].title}` : `📋 ${tasks.length} tâches à faire`,
  body: tasks.length === 1
    ? `Échéance ${formatDueLabel(tasks[0].dueDate, todayStr)}`
    : tasks.map(t => `• ${t.title} (${formatDueLabel(t.dueDate, todayStr)})`).join('\n'),
  url: `/${family.slug}/tasks`
})

const buildEmail = (family, tasks, todayStr) => ({
  subject: tasks.length === 1 ? `📋 Tâche à faire : ${tasks[0].title}` : `📋 ${tasks.length} tâches à faire`,
  title: tasks.length === 1 ? 'Une tâche arrive à échéance' : 'Des tâches arrivent à échéance',
  badge: '📋',
  detailsHtml: `
    <p style="margin: 0 0 10px 0; font-size: 15px; color: #1e293b;">
      ${tasks.length === 1 ? 'Cette tâche qui vous est assignée est' : 'Ces tâches qui vous sont assignées sont'} à faire :
    </p>
    <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
      ${tasks.map(t => {
        const late = t.dueDate < todayStr
        return `<li><strong>${escapeHtml(t.title)}</strong> — <span style="color: ${late ? '#e11d48' : '#d97706'};">${escapeHtml(formatDueLabel(t.dueDate, todayStr))}</span> <span style="color:#94a3b8;">(+${t.points} pts)</span></li>`
      }).join('')}
    </ul>
  `,
  actionUrl: `/${family.slug}/tasks`,
  actionText: 'Voir mes tâches'
})

export const runTaskDueReminders = async (ctx, todayStr) => {
  // Bornes sur des chaînes « AAAA-MM-JJ » : la borne basse écarte les échéances vides.
  const dueTasks = await ctx.Task.find({
    completed: false,
    dueDate: { $gte: '0001-01-01', $lte: todayStr }
  }).sort({ dueDate: 1 })
  if (dueTasks.length === 0) return

  // Regroupement par (famille, personne assignée) : une notification chacun.
  const groups = new Map()
  for (const task of dueTasks) {
    const key = `${task.familyId}:${task.assignedTo}`
    if (!groups.has(key)) groups.set(key, { familyId: task.familyId, userId: task.assignedTo, tasks: [] })
    groups.get(key).tasks.push(task)
  }

  for (const { familyId, userId, tasks } of groups.values()) {
    try {
      const [family, user] = await Promise.all([
        ctx.Family.findById(familyId),
        ctx.User.findOne({ id: userId })
      ])
      if (!family || family.isActive === false || !user) continue

      // Les helpers vérifient l'appartenance à la famille et la préférence taskReminders.
      const action = ctx.ALERT_ACTIONS.TASK_DUE.code
      const target = { familyId: family._id, action, recipientUserIds: [user.id] }
      const [pushResult, emailResult] = await Promise.all([
        ctx.sendPushNotification({ ...buildPush(family, tasks, todayStr), ...target }),
        ctx.sendNotificationEmail({ ...buildEmail(family, tasks, todayStr), ...target })
      ])

      await ctx.logAlertEntry({
        family,
        actor: null,
        action,
        actionLabel: ctx.ALERT_ACTIONS.TASK_DUE.label,
        title: `${tasks.length} tâche(s) à échéance pour ${user.firstName} ${user.lastName}`.trim(),
        targetType: 'user',
        targetId: user.id,
        channels: [ctx.toAlertChannelLog('push', pushResult), ctx.toAlertChannelLog('email', emailResult)]
      })
    } catch (err) {
      console.error('[TaskReminders] Erreur rappel de tâches:', err.message)
    }
  }
}
