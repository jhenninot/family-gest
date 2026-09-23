// Catalogue des types d'alertes journalisées (utilisé pour la journalisation serveur
// et pour peupler les filtres de la console Super Admin).
// La clé `category`, quand présente, relie une action à une des 4 catégories d'abonnement
// granulaire (User.notificationPreferences) : elle détermine quel réglage de préférence
// (push/email) est vérifié par sendPushNotification/sendNotificationEmail avant l'envoi.
// Les actions sans `category` sont transactionnelles (invitations, bienvenue, création de
// compte) et restent toujours envoyées, hors du système d'opt-in.
export const ALERT_ACTIONS = {
  TASK_CREATED: { code: 'task.created', label: 'Nouvelle tâche', category: 'tasks' },
  TASK_DUE: { code: 'task.due', label: 'Rappel de tâche à échéance', category: 'taskReminders' },
  EVENT_CREATED: { code: 'event.created', label: 'Nouvel événement', category: 'events' },
  EVENT_UPDATED: { code: 'event.updated', label: 'Événement modifié', category: 'events' },
  PRESENCE_CREATED: { code: 'absence.presence', label: 'Présence signalée', category: 'presence' },
  ABSENCE_CREATED: { code: 'absence.absence', label: 'Absence signalée', category: 'presence' },
  LONG_ABSENCE_CREATED: { code: 'absence.long', label: 'Absence longue signalée', category: 'presence' },
  MEAL_GUEST_CREATED: { code: 'meal_guest.created', label: 'Invité aux repas ajouté', category: 'presence' },
  MEAL_CREATED: { code: 'meal.created', label: 'Repas suggéré', category: 'meals' },
  DIGEST_SENT: { code: 'digest.sent', label: 'Récapitulatif quotidien envoyé' },
  FAMILY_ADMIN_INVITED: { code: 'family.admin_invited', label: 'Invitation administrateur de famille' },
  FAMILY_MEMBER_INVITED: { code: 'family.member_invited', label: 'Invitation membre de famille' },
  MEMBER_WELCOME: { code: 'member.welcome', label: 'Email de bienvenue (nouveau membre)' },
  MEMBER_WELCOME_RESENT: { code: 'member.welcome_resent', label: 'Email de bienvenue renvoyé' },
  ACCOUNT_REGISTERED: { code: 'account.registered', label: 'Compte créé' }
}

export const ALERT_ACTIONS_LIST = Object.values(ALERT_ACTIONS)

// Résolution rapide code d'action → catégorie d'abonnement (voir commentaire ci-dessus).
export const ACTION_CATEGORY_BY_CODE = Object.fromEntries(
  ALERT_ACTIONS_LIST.filter(a => a.category).map(a => [a.code, a.category])
)
