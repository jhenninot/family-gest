// Portage serveur fidèle de getMealSlotPresence (src/stores/familyStore.js:306-361), la logique
// canonique déjà utilisée par le Dashboard/AbsencesView pour déterminer qui est présent à un
// repas donné. Aucun équivalent serveur complet n'existait avant ce module (l'outil MCP
// get_meal_presence_summary fait une version simplifiée qui ne distingue pas les présences
// exceptionnelles) — reproduire exactement la même règle est important pour que le
// récapitulatif ne contredise jamais ce que l'app affiche.
//
// Point de vigilance : la comparaison se fait sur FamilyMember.userId (= User.id), jamais sur
// FamilyMember._id — c'est l'espace d'identifiants utilisé par Absence.memberId/MealGuest.
export const getMealSlotPresence = async (ctx, familyId, dateStr, slot) => {
  const members = await ctx.FamilyMember.find({ familyId })
  const userIds = members.map(m => m.userId)
  const users = await ctx.User.find({ id: { $in: userIds } }).select('id firstName lastName avatar color')
  const usersById = new Map(users.map(u => [u.id, u]))

  const usuallyPresentMembers = members.filter(m => m.usualPresence !== 'absent')
  const usuallyAbsentMembers = members.filter(m => m.usualPresence === 'absent')

  const dayRecords = await ctx.Absence.find({ familyId, date: dateStr, [slot]: true })
  const absenceRecords = dayRecords.filter(a => a.type !== 'presence')
  const presenceRecords = dayRecords.filter(a => a.type === 'presence')

  const isDeclaredAbsent = (m) => absenceRecords.some(a => Number(a.memberId) === Number(m.userId))
  const isDeclaredPresent = (m) => presenceRecords.some(a => Number(a.memberId) === Number(m.userId))

  const absentMembers = usuallyPresentMembers.filter(isDeclaredAbsent)
  const presentUsualMembers = usuallyPresentMembers.filter(m => !isDeclaredAbsent(m))
  const exceptionalPresences = usuallyAbsentMembers.filter(isDeclaredPresent)

  const toUserInfo = (m) => {
    const u = usersById.get(m.userId)
    return u ? { id: u.id, name: `${u.firstName} ${u.lastName}`.trim() } : null
  }

  const presentMembers = [...presentUsualMembers, ...exceptionalPresences].map(toUserInfo).filter(Boolean)
  const absentMembersInfo = absentMembers.map(toUserInfo).filter(Boolean)

  const guests = await ctx.MealGuest.find({ familyId, date: dateStr, [slot]: true })
  const guestsInfo = guests.map(g => ({ id: g.id, name: g.name, note: g.note || '' }))

  return {
    presentMembers,
    absentMembers: absentMembersInfo,
    guests: guestsInfo,
    headcount: presentMembers.length + guestsInfo.length
  }
}
