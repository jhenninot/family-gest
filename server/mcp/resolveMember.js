import FamilyMember from '../models/FamilyMember.js'
import User from '../models/User.js'
import { normalizeUsualPresenceConfig } from '../../shared/presence.js'

// Reproduit la jointure FamilyMember + User utilisée par GET /api/members (server/index.js), sans les
// invitations en attente : le connecteur MCP ne pilote que des membres déjà actifs dans la famille.
export const getFamilyMembersList = async (familyId) => {
  const memberships = await FamilyMember.find({ familyId })
  const userIds = memberships.map(m => m.userId)
  const users = await User.find({ id: { $in: userIds } }).select('-password')

  return memberships.map(mem => {
    const u = users.find(user => user.id === mem.userId)
    if (!u) return null
    return {
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      firstName: u.firstName,
      lastName: u.lastName,
      role: mem.role || 'Membre',
      isAdmin: mem.isAdmin,
      usualPresence: mem.usualPresence || 'present',
      usualPresenceConfig: normalizeUsualPresenceConfig(mem.usualPresenceConfig, mem.usualPresence),
      points: mem.points || 0
    }
  }).filter(Boolean)
}

// Résout un paramètre "membre" (id numérique ou nom, insensible à la casse/accents) en un membre
// unique de la famille. Lève une erreur listant les candidats en cas d'ambiguïté ou d'absence de
// résultat, plutôt que de deviner — l'appelant (un outil MCP) peut alors relancer list_members.
export const resolveMember = async (familyId, nameOrId) => {
  if (nameOrId === undefined || nameOrId === null || nameOrId === '') {
    throw new Error('Un membre (nom ou id) est requis')
  }

  const members = await getFamilyMembersList(familyId)

  if (typeof nameOrId === 'number' || /^\d+$/.test(String(nameOrId))) {
    const byId = members.find(m => m.id === Number(nameOrId))
    if (byId) return byId
  }

  const normalize = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  const query = normalize(nameOrId)

  const exact = members.filter(m => normalize(m.name) === query || normalize(m.firstName) === query)
  if (exact.length === 1) return exact[0]
  if (exact.length > 1) {
    throw new Error(`Plusieurs membres correspondent à "${nameOrId}" : ${exact.map(m => m.name).join(', ')}`)
  }

  const partial = members.filter(m => normalize(m.name).includes(query) || normalize(m.firstName).includes(query))
  if (partial.length === 1) return partial[0]
  if (partial.length > 1) {
    throw new Error(`Plusieurs membres correspondent à "${nameOrId}" : ${partial.map(m => m.name).join(', ')}`)
  }

  throw new Error(`Aucun membre trouvé pour "${nameOrId}". Membres de la famille : ${members.map(m => m.name).join(', ') || 'aucun'}`)
}
