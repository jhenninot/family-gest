import { z } from 'zod'
import Absence from '../../models/Absence.js'
import MealGuest from '../../models/MealGuest.js'
import { getFamilyMembersList } from '../resolveMember.js'
import { jsonResult } from '../toolHelpers.js'
import { isUsuallyPresent, pickDeclaredRecord, resolveSlot } from '../../../shared/presence.js'

export const registerAggregationTools = (server, req) => {
  const familyId = req.family._id

  server.registerTool('get_meal_presence_summary', {
    title: 'Résumé de présence à un repas',
    description: 'Pour une date et un créneau (midi/soir/nuit) donnés, retourne les membres présents, absents, ' +
      'les invités, et l\'effectif total (présents + invités). Croise les déclarations explicites du jour avec ' +
      'la présence habituelle de chaque membre quand aucune déclaration ne couvre ce créneau — cette présence ' +
      'habituelle pouvant varier selon le jour de la semaine, le créneau et l\'alternance semaine A / semaine B.',
    inputSchema: {
      date: z.string().describe('Date (YYYY-MM-DD)'),
      slot: z.enum(['lunch', 'dinner', 'night'])
    }
  }, async ({ date, slot }) => {
    const [members, absences, guests] = await Promise.all([
      getFamilyMembersList(familyId),
      Absence.find({ familyId, date }),
      MealGuest.find({ familyId, date, [slot]: true })
    ])

    const present = []
    const absent = []

    // Même règle que l'app et que le récapitulatif quotidien : elle vit dans shared/presence.js
    // et ne doit pas être réimplémentée ici.
    const anchor = req.family.presenceWeekAnchor
    for (const m of members) {
      const declared = pickDeclaredRecord(absences, m.id, slot)
      const isPresent = resolveSlot(isUsuallyPresent(m, date, slot, anchor), declared)
      ;(isPresent ? present : absent).push({ id: m.id, name: m.name })
    }

    const guestList = guests.map(g => ({ id: g.id, name: g.name, note: g.note }))

    return jsonResult({
      date,
      slot,
      present,
      absent,
      guests: guestList,
      totalHeadcount: present.length + guestList.length
    })
  })
}
