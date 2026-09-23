// Agrégation serveur de « qui est présent à ce créneau ? », utilisée par le récapitulatif
// quotidien (email/push).
//
// La RÈGLE elle-même (présence habituelle, parité semaine A/B, priorité des déclarations,
// départage des doublons) vit dans shared/presence.js et NE DOIT PAS être réimplémentée ici :
// ce fichier ne fait que la plomberie Mongo et la mise en forme. Toute divergence avec
// src/stores/familyStore.js ferait dire au récapitulatif l'inverse de ce qu'affiche l'app.
//
// Point de vigilance : la comparaison se fait sur FamilyMember.userId (= User.id), jamais sur
// FamilyMember._id — c'est l'espace d'identifiants utilisé par Absence.memberId/MealGuest.
import { isUsuallyPresent, pickDeclaredRecord, resolveSlot } from '../../shared/presence.js'

export const getMealSlotPresence = async (ctx, family, dateStr, slot) => {
  const familyId = family._id
  const anchor = family.presenceWeekAnchor

  const members = await ctx.FamilyMember.find({ familyId })
  const userIds = members.map(m => m.userId)
  const users = await ctx.User.find({ id: { $in: userIds } }).select('id firstName lastName avatar color')
  const usersById = new Map(users.map(u => [u.id, u]))

  const dayRecords = await ctx.Absence.find({ familyId, date: dateStr, [slot]: true })

  const presentMembers = []
  const absentMembers = []
  const exceptionalPresences = []

  for (const m of members) {
    const usually = isUsuallyPresent(m, dateStr, slot, anchor)
    const declared = pickDeclaredRecord(dayRecords, m.userId, slot)
    const present = resolveSlot(usually, declared)

    const u = usersById.get(m.userId)
    if (!u) continue
    const info = { id: u.id, name: `${u.firstName} ${u.lastName}`.trim() }

    if (present) {
      presentMembers.push(info)
      // Présence exceptionnelle = présent alors que l'habitude dit le contraire.
      if (!usually && declared) exceptionalPresences.push(info)
    } else if (declared) {
      // Seules les absences DÉCLARÉES sont listées : un membre habituellement absent ce
      // créneau-là n'est pas une information, c'est la normale.
      absentMembers.push(info)
    }
  }

  const guests = await ctx.MealGuest.find({ familyId, date: dateStr, [slot]: true })
  const guestsInfo = guests.map(g => ({ id: g.id, name: g.name, note: g.note || '' }))

  return {
    presentMembers,
    absentMembers,
    exceptionalPresences,
    guests: guestsInfo,
    headcount: presentMembers.length + guestsInfo.length
  }
}
