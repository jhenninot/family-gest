import Family from '../models/Family.js'
import FamilyMember from '../models/FamilyMember.js'

export const resolveFamilyContext = async (req, res, next) => {
  try {
    const slug = req.params.familySlug || req.query.familySlug || req.headers['x-family-slug']
    const familyId = req.headers['x-family-id']

    let family = null
    if (slug) {
      family = await Family.findOne({ slug: String(slug).toLowerCase().trim() })
    } else if (familyId) {
      family = await Family.findById(familyId)
    }

    if (!family) {
      return res.status(404).json({ error: 'Famille introuvable ou non spécifiée' })
    }

    if (!family.isActive && !req.user?.isSuperAdmin) {
      return res.status(403).json({ error: 'Cet espace familial est actuellement désactivé' })
    }

    req.family = family

    // Vérification de l'appartenance
    const membership = await FamilyMember.findOne({ familyId: family._id, userId: req.user.id })

    if (req.user.isSuperAdmin) {
      req.membership = membership || {
        role: 'Super Administrateur',
        isAdmin: true,
        points: 0,
        usualPresence: 'present'
      }
      return next()
    }

    if (!membership) {
      return res.status(403).json({ error: 'Vous ne disposez pas des accès pour cette famille' })
    }

    req.membership = membership
    next()
  } catch (error) {
    console.error('Erreur resolveFamilyContext:', error)
    return res.status(500).json({ error: 'Erreur lors de la résolution du contexte familial' })
  }
}

export const requireFamilyAdmin = (req, res, next) => {
  if (req.user?.isSuperAdmin || req.membership?.isAdmin) {
    return next()
  }
  return res.status(403).json({ error: 'Action réservée aux administrateurs de cette famille' })
}
