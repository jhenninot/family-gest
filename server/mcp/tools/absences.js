import { z } from 'zod'
import Absence from '../../models/Absence.js'
import { resolveMember } from '../resolveMember.js'
import { jsonResult } from '../toolHelpers.js'
import { notifyMcpAction } from '../notify.js'

export const registerAbsenceTools = (server, req, ctx) => {
  const { upsertAbsenceRecord, deleteAbsenceIfEmptySlots, mergeAbsenceIntoSibling, ALERT_ACTIONS } = ctx
  const familyId = req.family._id

  server.registerTool('list_absences', {
    title: 'Lister les présences/absences',
    description: 'Liste les déclarations de présence/absence, filtrées optionnellement par plage de dates et/ou membre.',
    inputSchema: {
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      member: z.string().optional().describe('Nom ou id du membre')
    }
  }, async ({ startDate, endDate, member }) => {
    const filter = { familyId }
    if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate }
    else if (startDate) filter.date = { $gte: startDate }
    else if (endDate) filter.date = { $lte: endDate }
    if (member) filter.memberId = (await resolveMember(familyId, member)).id

    const absences = await Absence.find(filter).sort({ date: 1 })
    return jsonResult(absences)
  })

  server.registerTool('set_presence_or_absence', {
    title: 'Déclarer une présence ou une absence',
    description: 'Déclare la présence ou l\'absence d\'un membre pour une date et des créneaux donnés (midi/soir/nuit). ' +
      'Si une déclaration du même type existe déjà pour ce membre et cette date, elle est mise à jour (pas de doublon). ' +
      'Une absence et une présence exceptionnelle peuvent coexister le même jour sur des créneaux différents.',
    inputSchema: {
      member: z.string().describe('Nom ou id du membre concerné'),
      date: z.string().describe('Date (YYYY-MM-DD)'),
      type: z.enum(['presence', 'absence']),
      lunch: z.boolean().optional(),
      dinner: z.boolean().optional(),
      night: z.boolean().optional(),
      note: z.string().optional()
    }
  }, async ({ member, date, type, lunch, dinner, night, note }) => {
    if (!lunch && !dinner && !night) {
      throw new Error('Veuillez sélectionner au moins un créneau (midi, soir ou nuit)')
    }
    const resolved = await resolveMember(familyId, member)

    const { absence, isNew } = await upsertAbsenceRecord({
      familyId, memberId: resolved.id, date, type, lunch, dinner, night, note,
      declaredBy: req.mcpFallbackActor?.id ?? null
    })

    const action = type === 'presence' ? ALERT_ACTIONS.PRESENCE_CREATED : ALERT_ACTIONS.ABSENCE_CREATED
    notifyMcpAction(req, ctx, {
      action,
      title: `${type === 'presence' ? 'Présence' : 'Absence'} : ${resolved.name}`,
      targetType: 'absence',
      targetId: absence.id,
      body: `${resolved.name} le ${date} • Déclaré via l'assistant`
    })

    return jsonResult({ absence, isNew })
  })

  server.registerTool('update_absence', {
    title: 'Modifier une présence/absence',
    description: 'Modifie une déclaration de présence/absence existante. Si tous les créneaux sont désactivés, la déclaration est supprimée.',
    inputSchema: {
      id: z.number(),
      date: z.string().optional(),
      type: z.enum(['presence', 'absence']).optional(),
      lunch: z.boolean().optional(),
      dinner: z.boolean().optional(),
      night: z.boolean().optional(),
      note: z.string().optional()
    }
  }, async ({ id, date, type, lunch, dinner, night, note }) => {
    const absence = await Absence.findOne({ id: Number(id), familyId })
    if (!absence) throw new Error('Déclaration non trouvée')

    const previousCoords = `${absence.memberId}|${absence.date}|${absence.type}`
    if (date) absence.date = date.trim()
    if (type) absence.type = type
    if (lunch !== undefined) absence.lunch = Boolean(lunch)
    if (dinner !== undefined) absence.dinner = Boolean(dinner)
    if (night !== undefined) absence.night = Boolean(night)
    if (note !== undefined) absence.note = note.trim()

    const deleted = await deleteAbsenceIfEmptySlots(absence, familyId)
    if (deleted) return jsonResult({ deleted: true })

    await absence.save()

    // Changer de date ou de type peut amener la déclaration sur une ligne sœur existante.
    const moved = previousCoords !== `${absence.memberId}|${absence.date}|${absence.type}`
    return jsonResult(moved ? await mergeAbsenceIntoSibling(absence, familyId) : absence)
  })

  server.registerTool('delete_absence', {
    title: 'Supprimer une présence/absence',
    description: 'Supprime une déclaration de présence/absence.',
    inputSchema: { id: z.number() }
  }, async ({ id }) => {
    await Absence.deleteOne({ id: Number(id), familyId })
    return jsonResult({ deleted: true })
  })
}
