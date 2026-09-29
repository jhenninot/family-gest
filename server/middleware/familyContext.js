import Family from '../models/Family.js'
import FamilyMember from '../models/FamilyMember.js'
import FamilyInvitation from '../models/FamilyInvitation.js'

// Middleware : Résolution et attachement de la famille courante (Multi-tenancy)
// `onInvitationAccepted(familyId, user, isAdmin)` est appelé quand une invitation en attente
// est acceptée automatiquement au premier accès (tâches d'accueil de la famille).
export const createAttachFamilyContext = ({ onInvitationAccepted = async () => {} } = {}) => async (req, res, next) => {
  try {
    const slug = req.params.familySlug || req.query.familySlug || req.headers['x-family-slug']
    const familyIdHeader = req.headers['x-family-id']

    let family = null
    if (slug) {
      family = await Family.findOne({ slug: String(slug).toLowerCase().trim() })
    } else if (familyIdHeader) {
      family = await Family.findById(familyIdHeader)
    }

    // Si aucune famille n'est explicitement demandée, fallback vers la première famille active de l'utilisateur
    // Le Super Admin n'a aucun passe-droit : comme tout utilisateur, il n'accède qu'aux familles
    // dont il est membre (la console ne gère les familles que de l'extérieur)
    if (!family && req.user) {
      const memberships = await FamilyMember.find({ userId: req.user.id })
      const familyIds = memberships.map(m => m.familyId)
      family = await Family.findOne({ _id: { $in: familyIds }, isActive: true }).sort('createdAt')
    }

    if (!family) {
      return res.status(404).json({ error: req.t('errors.noActiveFamily') })
    }

    // Vérifier si la famille est désactivée
    if (!family.isActive) {
      return res.status(403).json({ error: req.t('errors.familyDisabled') })
    }

    req.family = family

    // Vérification de l'appartenance
    let membership = await FamilyMember.findOne({ familyId: family._id, userId: req.user.id })

    // Si pas encore membre, vérifier si cet utilisateur a une invitation en attente pour cette famille
    if (!membership && req.user?.email) {
      const pendingInv = await FamilyInvitation.findOne({
        familyId: family._id,
        email: req.user.email.toLowerCase().trim(),
        status: 'pending',
        // Une invitation expirée (7 jours) n'ouvre plus l'accès : elle doit être renvoyée
        expiresAt: { $gt: new Date() }
      })
      if (pendingInv) {
        membership = new FamilyMember({
          familyId: family._id,
          userId: req.user.id,
          userRef: req.user._id,
          role: pendingInv.role || 'Administrateur',
          isAdmin: Boolean(pendingInv.isAdmin),
          usualPresence: req.user.usualPresence || 'present'
        })
        await membership.save()
        pendingInv.status = 'accepted'
        await pendingInv.save()
        await onInvitationAccepted(family._id, req.user, pendingInv.isAdmin)
      }
    }

    if (!membership) {
      return res.status(403).json({ error: req.t('errors.notInFamily') })
    }

    // Dernière visite (statistiques d'activité de la console) : au plus une écriture par heure
    const now = Date.now()
    if (!membership.lastSeenAt || now - new Date(membership.lastSeenAt).getTime() > 60 * 60 * 1000) {
      membership.lastSeenAt = new Date(now)
      FamilyMember.updateOne({ _id: membership._id }, { $set: { lastSeenAt: membership.lastSeenAt } })
        .catch(err => console.debug('[Stats] lastSeenAt :', err.message))
    }

    req.membership = membership
    next()
  } catch (err) {
    console.error('attachFamilyContext error:', err.message)
    res.status(500).json({ error: req.t('errors.familyContext') })
  }
}

export const requireFamilyAdmin = (req, res, next) => {
  if (req.membership?.isAdmin) {
    return next()
  }
  return res.status(403).json({ error: req.t('errors.familyAdminOnly') })
}
