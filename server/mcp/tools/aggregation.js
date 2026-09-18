import { z } from 'zod'
import Absence from '../../models/Absence.js'
import MealGuest from '../../models/MealGuest.js'
import { getFamilyMembersList } from '../resolveMember.js'
import { jsonResult } from '../toolHelpers.js'

export const registerAggregationTools = (server, req) => {
  const familyId = req.family._id

  server.registerTool('get_meal_presence_summary', {
    title: 'Résumé de présence à un repas',
    description: 'Pour une date et un créneau (midi/soir/nuit) donnés, retourne les membres présents, absents, ' +
      'les invités, et l\'effectif total (présents + invités). Croise les déclarations explicites du jour avec ' +
      'la présence habituelle de chaque membre quand aucune déclaration ne couvre ce créneau.',
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

    for (const m of members) {
      const declared = absences.find(a => a.memberId === m.id && a[slot])
      const isPresent = declared ? declared.type === 'presence' : m.usualPresence !== 'absent'
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
