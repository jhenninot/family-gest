import { z } from 'zod'
import MealGuest from '../../models/MealGuest.js'
import { resolveMember } from '../resolveMember.js'
import { jsonResult } from '../toolHelpers.js'
import { notifyMcpAction } from '../notify.js'

export const registerMealGuestTools = (server, req, ctx) => {
  const { createMealGuestsBatch, ALERT_ACTIONS } = ctx
  const familyId = req.family._id

  server.registerTool('list_meal_guests', {
    title: 'Lister les invités aux repas',
    description: 'Liste les invités déclarés pour des repas, filtrés optionnellement par plage de dates.',
    inputSchema: {
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }
  }, async ({ startDate, endDate }) => {
    const filter = { familyId }
    if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate }
    else if (startDate) filter.date = { $gte: startDate }
    else if (endDate) filter.date = { $lte: endDate }
    const guests = await MealGuest.find(filter).sort({ date: 1 })
    return jsonResult(guests)
  })

  server.registerTool('add_meal_guests', {
    title: 'Ajouter un ou plusieurs invités à un repas',
    description: "Ajoute un ou plusieurs invités pour une date et des créneaux donnés (midi/soir/nuit).",
    inputSchema: {
      names: z.array(z.string()).describe("Noms des invités (personnes extérieures à la famille)"),
      date: z.string().describe('Date (YYYY-MM-DD)'),
      lunch: z.boolean().optional(),
      dinner: z.boolean().optional(),
      night: z.boolean().optional(),
      invitedBy: z.string().optional().describe('Nom ou id du membre qui invite'),
      note: z.string().optional()
    }
  }, async ({ names, date, lunch, dinner, night, invitedBy, note }) => {
    if (!lunch && !dinner && !night) {
      throw new Error('Veuillez sélectionner au moins un créneau (midi, soir ou nuit)')
    }
    const invitedByMember = invitedBy ? await resolveMember(familyId, invitedBy) : null

    const createdGuests = await createMealGuestsBatch({
      familyId, names, date, lunch, dinner, night,
      invitedBy: invitedByMember?.id,
      note,
      fallbackHostId: req.mcpFallbackActor?.id ?? null
    })

    notifyMcpAction(req, ctx, {
      action: ALERT_ACTIONS.MEAL_GUEST_CREATED,
      title: `Nouvel(le) invité(s) : ${createdGuests.map(g => g.name).join(', ')}`,
      targetType: 'meal_guest',
      targetId: createdGuests[0]?.id,
      body: `Le ${date} • Ajouté via l'assistant`
    })

    return jsonResult(createdGuests)
  })

  server.registerTool('update_meal_guest', {
    title: 'Modifier un invité',
    description: 'Modifie un invité existant. Si tous les créneaux sont désactivés, l\'invité est supprimé.',
    inputSchema: {
      id: z.number(),
      name: z.string().optional(),
      date: z.string().optional(),
      lunch: z.boolean().optional(),
      dinner: z.boolean().optional(),
      night: z.boolean().optional(),
      invitedBy: z.string().optional(),
      note: z.string().optional()
    }
  }, async ({ id, name, date, lunch, dinner, night, invitedBy, note }) => {
    const guest = await MealGuest.findOne({ id: Number(id), familyId })
    if (!guest) throw new Error('Invité non trouvé')

    if (name) guest.name = name.trim()
    if (date) guest.date = date.trim()
    if (lunch !== undefined) guest.lunch = Boolean(lunch)
    if (dinner !== undefined) guest.dinner = Boolean(dinner)
    if (night !== undefined) guest.night = Boolean(night)
    if (invitedBy !== undefined) guest.invitedBy = invitedBy ? (await resolveMember(familyId, invitedBy)).id : null
    if (note !== undefined) guest.note = note.trim()

    if (!guest.lunch && !guest.dinner && !guest.night) {
      await MealGuest.deleteOne({ id: guest.id, familyId })
      return jsonResult({ deleted: true })
    }

    await guest.save()
    return jsonResult(guest)
  })

  server.registerTool('delete_meal_guest', {
    title: 'Supprimer un invité',
    description: 'Supprime un invité à un repas.',
    inputSchema: { id: z.number() }
  }, async ({ id }) => {
    await MealGuest.deleteOne({ id: Number(id), familyId })
    return jsonResult({ deleted: true })
  })
}
