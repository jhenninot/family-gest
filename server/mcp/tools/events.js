import { z } from 'zod'
import Event from '../../models/Event.js'
import { resolveMember } from '../resolveMember.js'
import { jsonResult } from '../toolHelpers.js'
import { notifyMcpAction } from '../notify.js'

const resolveMemberIdOrNull = async (familyId, value) => {
  if (value === undefined || value === null || value === '') return undefined
  const member = await resolveMember(familyId, value)
  return member.id
}

const resolveMemberIdList = async (familyId, values) => {
  if (!Array.isArray(values)) return undefined
  const ids = []
  for (const v of values) {
    ids.push((await resolveMember(familyId, v)).id)
  }
  return ids
}

export const registerEventTools = (server, req, ctx) => {
  const { createEventOrSeries, updateEventOrSeries, deleteEventOrSeries, ALERT_ACTIONS } = ctx
  const familyId = req.family._id

  server.registerTool('list_events', {
    title: 'Lister les événements',
    description: 'Liste les événements du calendrier familial, filtrés optionnellement par plage de dates (YYYY-MM-DD).',
    inputSchema: {
      startDate: z.string().optional().describe('Date de début (YYYY-MM-DD), incluse'),
      endDate: z.string().optional().describe('Date de fin (YYYY-MM-DD), incluse')
    }
  }, async ({ startDate, endDate }) => {
    const filter = { familyId }
    if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate }
    else if (startDate) filter.date = { $gte: startDate }
    else if (endDate) filter.date = { $lte: endDate }
    const events = await Event.find(filter).sort({ date: 1 })
    return jsonResult(events)
  })

  server.registerTool('create_event', {
    title: 'Créer un événement',
    description: 'Crée un événement au calendrier familial, ponctuel ou récurrent (quotidien/hebdomadaire/mensuel). ' +
      "Peut générer automatiquement des absences liées pour les membres concernés (generateAbsence + absenceSlots).",
    inputSchema: {
      title: z.string().describe('Titre de l\'événement'),
      date: z.string().describe('Date (YYYY-MM-DD)'),
      time: z.string().optional().describe('Heure de début (HH:MM)'),
      endTime: z.string().optional().describe('Heure de fin (HH:MM)'),
      category: z.string().optional(),
      location: z.string().optional(),
      color: z.string().optional().describe('Couleur hexadécimale, ex: #8b5cf6'),
      assignedTo: z.string().optional().describe('Nom ou id du membre principal concerné'),
      memberIds: z.array(z.string()).optional().describe('Noms ou ids des membres concernés'),
      recurrence: z.object({
        frequency: z.enum(['daily', 'weekly', 'monthly']),
        interval: z.number().int().positive().optional(),
        endDate: z.string().describe('Date de fin de la récurrence (YYYY-MM-DD)')
      }).optional(),
      generateAbsence: z.boolean().optional().describe('Générer une absence pour memberIds sur chaque occurrence'),
      absenceSlots: z.object({
        lunch: z.boolean().optional(),
        dinner: z.boolean().optional(),
        night: z.boolean().optional()
      }).optional()
    }
  }, async (input) => {
    const assignedTo = await resolveMemberIdOrNull(familyId, input.assignedTo)
    const memberIds = await resolveMemberIdList(familyId, input.memberIds)

    const result = await createEventOrSeries({
      familyId,
      body: { ...input, assignedTo, memberIds },
      declaredBy: req.mcpFallbackActor?.id ?? null
    })

    if (result.isRecurring) {
      notifyMcpAction(req, ctx, {
        action: ALERT_ACTIONS.EVENT_CREATED,
        title: `Nouvel événement récurrent : ${input.title}`,
        targetType: 'event',
        targetId: result.recurrenceId,
        body: `${result.occurrenceCount} occurrence(s) jusqu'au ${result.endDate} • Ajouté via l'assistant`
      })
      return jsonResult({ events: result.events, absences: result.absences, truncated: result.truncated })
    }

    notifyMcpAction(req, ctx, {
      action: ALERT_ACTIONS.EVENT_CREATED,
      title: `Nouvel événement : ${result.event.title}`,
      targetType: 'event',
      targetId: result.event.id,
      body: `${result.event.date}${result.event.time ? ' à ' + result.event.time : ''} • Ajouté via l'assistant`
    })
    return jsonResult(result.event)
  })

  server.registerTool('update_event', {
    title: 'Modifier un événement',
    description: "Modifie un événement existant. Passer scope: 'series' pour modifier toutes les occurrences d'une série récurrente.",
    inputSchema: {
      id: z.number().describe('Identifiant de l\'événement'),
      scope: z.enum(['single', 'series']).optional(),
      title: z.string().optional(),
      date: z.string().optional(),
      time: z.string().optional(),
      endTime: z.string().optional(),
      category: z.string().optional(),
      location: z.string().optional(),
      color: z.string().optional(),
      assignedTo: z.string().optional(),
      memberIds: z.array(z.string()).optional(),
      generateAbsence: z.boolean().optional(),
      absenceSlots: z.object({
        lunch: z.boolean().optional(),
        dinner: z.boolean().optional(),
        night: z.boolean().optional()
      }).optional()
    }
  }, async ({ id, ...input }) => {
    const assignedTo = await resolveMemberIdOrNull(familyId, input.assignedTo)
    const memberIds = await resolveMemberIdList(familyId, input.memberIds)

    const result = await updateEventOrSeries({
      familyId,
      eventId: id,
      body: { ...input, assignedTo, memberIds },
      declaredBy: req.mcpFallbackActor?.id ?? null
    })
    if (!result) throw new Error('Événement non trouvé')

    if (result.isSeries) {
      notifyMcpAction(req, ctx, {
        action: ALERT_ACTIONS.EVENT_UPDATED,
        title: `Série d'événements modifiée : ${result.events[0]?.title}`,
        targetType: 'event',
        targetId: result.recurrenceId,
        body: `${result.events.length} occurrence(s) mises à jour via l'assistant`
      })
      return jsonResult({ events: result.events, absences: result.absences })
    }

    notifyMcpAction(req, ctx, {
      action: ALERT_ACTIONS.EVENT_UPDATED,
      title: `Événement modifié : ${result.event.title}`,
      targetType: 'event',
      targetId: result.event.id,
      body: `Modifié via l'assistant`
    })
    return jsonResult(result.event)
  })

  server.registerTool('delete_event', {
    title: 'Supprimer un événement',
    description: "Supprime un événement. Passer scope: 'series' pour supprimer toute la série récurrente (et les absences liées).",
    inputSchema: {
      id: z.number(),
      scope: z.enum(['single', 'series']).optional()
    }
  }, async ({ id, scope }) => {
    const result = await deleteEventOrSeries({ familyId, eventId: id, scope })
    return jsonResult({ deletedSeries: result.deletedSeries, deletedCount: result.deletedCount })
  })
}
