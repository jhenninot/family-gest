import { escapeHtml } from './templates.js'
import { formatDateOnly } from '../i18n/index.js'

// Rappel quotidien des tâches à échéance : chaque jour, à l'heure du récapitulatif, la personne
// assignée à une tâche non terminée dont l'échéance est atteinte ou dépassée reçoit une
// notification (une par famille, regroupant ses tâches), par push et/ou email selon ses
// préférences User.notificationPreferences.taskReminders — vérifiées par les helpers d'envoi.

// « aujourd'hui » ou « en retard, prévue le 3 sept. », dans la langue du destinataire
const formatDueLabel = (t, dueDate, todayStr) => {
  if (dueDate === todayStr) return t('reminders.dueToday')
  return t('reminders.overdue', { date: formatDateOnly(t.lang, dueDate, { day: 'numeric', month: 'short' }) })
}

// Textes résolus par sendPushNotification / sendNotificationEmail pour chaque destinataire
const buildPush = (family, tasks, todayStr) => ({
  // Le nom de la famille est préfixé par sendPushNotification.
  title: (t) => `📋 ${tasks.length === 1 ? t('reminders.oneTitle', { title: tasks[0].title }) : t('reminders.manyTitle', { n: tasks.length })}`,
  body: (t) => tasks.length === 1
    ? t('reminders.due', { label: formatDueLabel(t, tasks[0].dueDate, todayStr) })
    : tasks.map(task => `• ${task.title} (${formatDueLabel(t, task.dueDate, todayStr)})`).join('\n'),
  url: `/${family.slug}/tasks`
})

const buildEmail = (family, tasks, todayStr) => ({
  subject: (t) => `📋 ${tasks.length === 1 ? t('reminders.oneTitle', { title: tasks[0].title }) : t('reminders.manyTitle', { n: tasks.length })}`,
  title: (t) => t('reminders.heading', { n: tasks.length }),
  badge: '📋',
  detailsHtml: (t) => `
    <p style="margin: 0 0 10px 0; font-size: 15px; color: #1e293b;">
      ${t('reminders.intro', { n: tasks.length })}
    </p>
    <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
      ${tasks.map(task => {
        const late = task.dueDate < todayStr
        return `<li><strong>${escapeHtml(task.title)}</strong> — <span style="color: ${late ? '#e11d48' : '#d97706'};">${escapeHtml(formatDueLabel(t, task.dueDate, todayStr))}</span> <span style="color:#94a3b8;">(${t('notify.task.points', { n: task.points })})</span></li>`
      }).join('')}
    </ul>
  `,
  actionUrl: `/${family.slug}/tasks`,
  actionText: (t) => t('notify.task.viewMyTasks')
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
