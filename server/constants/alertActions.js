// Catalogue des types d'alertes journalisées (utilisé pour la journalisation serveur
// et pour peupler les filtres de la console Super Admin).
export const ALERT_ACTIONS = {
  TASK_CREATED: { code: 'task.created', label: 'Nouvelle tâche' },
  EVENT_CREATED: { code: 'event.created', label: 'Nouvel événement' },
  EVENT_UPDATED: { code: 'event.updated', label: 'Événement modifié' },
  PRESENCE_CREATED: { code: 'absence.presence', label: 'Présence signalée' },
  ABSENCE_CREATED: { code: 'absence.absence', label: 'Absence signalée' },
  LONG_ABSENCE_CREATED: { code: 'absence.long', label: 'Absence longue signalée' },
  MEAL_GUEST_CREATED: { code: 'meal_guest.created', label: 'Invité aux repas ajouté' },
  MEAL_CREATED: { code: 'meal.created', label: 'Repas suggéré' },
  FAMILY_ADMIN_INVITED: { code: 'family.admin_invited', label: 'Invitation administrateur de famille' },
  FAMILY_MEMBER_INVITED: { code: 'family.member_invited', label: 'Invitation membre de famille' },
  MEMBER_WELCOME: { code: 'member.welcome', label: 'Email de bienvenue (nouveau membre)' },
  MEMBER_WELCOME_RESENT: { code: 'member.welcome_resent', label: 'Email de bienvenue renvoyé' },
  ACCOUNT_REGISTERED: { code: 'account.registered', label: 'Compte créé' }
}

export const ALERT_ACTIONS_LIST = Object.values(ALERT_ACTIONS)
