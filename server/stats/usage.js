// Statistiques d'utilisation par famille pour la console Super Admin : uniquement des nombres
// et des dates, jamais de contenu (le Super Admin n'a pas accès aux données des familles).
// Calculées à la demande à partir des dates de création des éléments et de
// FamilyMember.lastSeenAt (dernière visite, mise à jour par attachFamilyContext).

const DAY = 24 * 60 * 60 * 1000
export const WEEKS = 12

// Modules suivis et collections dont les créations comptent pour chacun
export const moduleModels = (models) => ({
  presence: [models.Absence, models.LongAbsence, models.MealGuest],
  meals: [models.Meal],
  mealPlans: [models.MealPoll],
  shopping: [models.ShoppingItem],
  tasks: [models.Task],
  calendar: [models.Event]
})

const key = (id) => String(id)
const later = (a, b) => (!a ? b : !b ? a : (a > b ? a : b))

// Créations sur la période par famille et par module, et date de la dernière création (toutes périodes)
const creationsByFamily = async (models, since) => {
  const byFamily = new Map()
  const entry = (id) => {
    if (!byFamily.has(key(id))) byFamily.set(key(id), { modules: {}, lastCreatedAt: null })
    return byFamily.get(key(id))
  }
  for (const [module, list] of Object.entries(moduleModels(models))) {
    for (const Model of list) {
      const rows = await Model.aggregate([
        { $match: { familyId: { $ne: null } } },
        {
          $group: {
            _id: '$familyId',
            recent: { $sum: { $cond: [{ $gte: ['$createdAt', since] }, 1, 0] } },
            last: { $max: '$createdAt' }
          }
        }
      ])
      for (const row of rows) {
        const e = entry(row._id)
        e.modules[module] = (e.modules[module] || 0) + row.recent
        e.lastCreatedAt = later(e.lastCreatedAt, row.last)
      }
    }
  }
  return byFamily
}

// Statistiques de chaque famille (tableau de la console)
export const familyUsageStats = async (models, now = new Date()) => {
  const since7 = new Date(now - 7 * DAY)
  const since30 = new Date(now - 30 * DAY)
  const [creations, members, invitations] = await Promise.all([
    creationsByFamily(models, since30),
    models.FamilyMember.aggregate([
      {
        $group: {
          _id: '$familyId',
          count: { $sum: 1 },
          active7: { $sum: { $cond: [{ $gte: ['$lastSeenAt', since7] }, 1, 0] } },
          active30: { $sum: { $cond: [{ $gte: ['$lastSeenAt', since30] }, 1, 0] } },
          lastSeen: { $max: '$lastSeenAt' }
        }
      }
    ]),
    models.FamilyInvitation.aggregate([
      { $match: { status: 'pending', expiresAt: { $gt: now } } },
      { $group: { _id: '$familyId', count: { $sum: 1 }, oldest: { $min: '$createdAt' } } }
    ])
  ])
  const memberBy = new Map(members.map(m => [key(m._id), m]))
  const inviteBy = new Map(invitations.map(i => [key(i._id), i]))

  return (familyId) => {
    const c = creations.get(key(familyId)) || { modules: {}, lastCreatedAt: null }
    const m = memberBy.get(key(familyId)) || {}
    const i = inviteBy.get(key(familyId)) || {}
    const usage30 = Object.fromEntries(Object.keys(moduleModels(models)).map(k => [k, c.modules[k] || 0]))
    return {
      memberCount: m.count || 0,
      activeMembers7: m.active7 || 0,
      activeMembers30: m.active30 || 0,
      lastActivityAt: later(m.lastSeen || null, c.lastCreatedAt),
      pendingInvitations: i.count || 0,
      oldestPendingInvitationAt: i.oldest || null,
      usage30,
      created30: Object.values(usage30).reduce((sum, n) => sum + n, 0)
    }
  }
}

// Vue d'ensemble de la plateforme : tuiles et activité par semaine (12 dernières semaines)
export const platformOverview = async (models, now = new Date()) => {
  const since30 = new Date(now - 30 * DAY)
  const start = new Date(now - WEEKS * 7 * DAY)
  const weekly = Array(WEEKS).fill(0)
  let created30 = 0

  for (const list of Object.values(moduleModels(models))) {
    for (const Model of list) {
      const rows = await Model.aggregate([
        { $match: { createdAt: { $gte: start } } },
        {
          $group: {
            _id: { $floor: { $divide: [{ $subtract: ['$createdAt', start] }, 7 * DAY] } },
            count: { $sum: 1 },
            recent: { $sum: { $cond: [{ $gte: ['$createdAt', since30] }, 1, 0] } }
          }
        }
      ])
      for (const row of rows) {
        const index = Math.min(WEEKS - 1, Math.max(0, Number(row._id)))
        weekly[index] += row.count
        created30 += row.recent
      }
    }
  }

  const [families, activeFamilies, activeUsers] = await Promise.all([
    models.Family.countDocuments(),
    models.Family.countDocuments({ isActive: true }),
    models.FamilyMember.distinct('userId', { lastSeenAt: { $gte: since30 } })
  ])

  return {
    families,
    activeFamilies,
    activeUsers30: activeUsers.length,
    users: await models.User.countDocuments(),
    created30,
    weekly: weekly.map((count, i) => ({ weekStart: new Date(start.getTime() + i * 7 * DAY), count }))
  }
}
