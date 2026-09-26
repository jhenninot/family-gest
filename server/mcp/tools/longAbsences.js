import { z } from 'zod'
import LongAbsence from '../../models/LongAbsence.js'
import Absence from '../../models/Absence.js'
import { resolveMember } from '../resolveMember.js'
import { jsonResult } from '../toolHelpers.js'
import { notifyMcpAction } from '../notify.js'
import { readableDate } from '../../i18n/index.js'

const SLOT_INDEX = { lunch: 0, dinner: 1, night: 2 }
const isValidSlot = (s) => ['lunch', 'dinner', 'night'].includes(s)

export const registerLongAbsenceTools = (server, req, ctx) => {
  const { regenerateLongAbsenceDailyRows, ALERT_ACTIONS } = ctx
  const familyId = req.family._id

  server.registerTool('list_long_absences', {
    title: 'Lister les absences longues',
    description: 'Liste les absences longues (sur plage de dates) déclarées dans la famille.',
    inputSchema: {}
  }, async () => {
    const list = await LongAbsence.find({ familyId }).sort({ startDate: 1 })
    return jsonResult(list)
  })

  server.registerTool('create_long_absence', {
    title: 'Créer une absence longue',
    description: "Déclare une absence sur une plage de dates pour un membre (ex: vacances). Génère automatiquement les déclarations d'absence journalières correspondantes.",
    inputSchema: {
      member: z.string().describe('Nom ou id du membre'),
      startDate: z.string().describe('Date de début (YYYY-MM-DD)'),
      startSlot: z.enum(['lunch', 'dinner', 'night']).optional().describe('Créneau de début (défaut: midi)'),
      endDate: z.string().describe('Date de fin (YYYY-MM-DD)'),
      endSlot: z.enum(['lunch', 'dinner', 'night']).optional().describe('Créneau de fin (défaut: nuit)'),
      note: z.string().optional()
    }
  }, async ({ member, startDate, startSlot, endDate, endSlot, note }) => {
    const resolved = await resolveMember(familyId, member)
    const sSlot = isValidSlot(startSlot) ? startSlot : 'lunch'
    const eSlot = isValidSlot(endSlot) ? endSlot : 'night'

    if (startDate > endDate) {
      throw new Error('La date de fin doit être postérieure ou égale à la date de début')
    }
    if (startDate === endDate && SLOT_INDEX[sSlot] > SLOT_INDEX[eSlot]) {
      throw new Error('Le créneau de fin doit être après ou égal au créneau de début')
    }

    const longAbsence = new LongAbsence({
      familyId,
      id: Date.now(),
      memberId: resolved.id,
      startDate: startDate.trim(),
      startSlot: sSlot,
      endDate: endDate.trim(),
      endSlot: eSlot,
      note: (note || '').trim(),
      declaredBy: req.mcpFallbackActor?.id ?? null
    })
    await longAbsence.save()

    const absences = await regenerateLongAbsenceDailyRows({
      familyId, longAbsenceId: longAbsence.id, memberId: resolved.id,
      startDate: startDate.trim(), startSlot: sSlot, endDate: endDate.trim(), endSlot: eSlot,
      note, declaredBy: req.mcpFallbackActor?.id ?? null
    })

    notifyMcpAction(req, ctx, {
      action: ALERT_ACTIONS.LONG_ABSENCE_CREATED,
      title: (t) => t('notify.mcp.longAbsenceTitle', { member: resolved.name }),
      targetType: 'long_absence',
      targetId: longAbsence.id,
      body: (t) => t('notify.mcp.declaredPeriod', { member: resolved.name, start: readableDate(t, startDate), end: readableDate(t, endDate) })
    })

    return jsonResult({ longAbsence, absences })
  })

  server.registerTool('update_long_absence', {
    title: 'Modifier une absence longue',
    description: 'Modifie une absence longue existante ; régénère entièrement les déclarations journalières liées.',
    inputSchema: {
      id: z.number(),
      member: z.string().optional(),
      startDate: z.string().optional(),
      startSlot: z.enum(['lunch', 'dinner', 'night']).optional(),
      endDate: z.string().optional(),
      endSlot: z.enum(['lunch', 'dinner', 'night']).optional(),
      note: z.string().optional()
    }
  }, async ({ id, member, startDate, startSlot, endDate, endSlot, note }) => {
    const longAbsence = await LongAbsence.findOne({ id: Number(id), familyId })
    if (!longAbsence) throw new Error('Absence longue non trouvée')

    const targetMemberId = member !== undefined ? (await resolveMember(familyId, member)).id : longAbsence.memberId
    const targetStartDate = startDate !== undefined ? startDate.trim() : longAbsence.startDate
    const targetEndDate = endDate !== undefined ? endDate.trim() : longAbsence.endDate
    const targetStartSlot = isValidSlot(startSlot) ? startSlot : longAbsence.startSlot
    const targetEndSlot = isValidSlot(endSlot) ? endSlot : longAbsence.endSlot

    if (targetStartDate > targetEndDate) {
      throw new Error('La date de fin doit être postérieure ou égale à la date de début')
    }
    if (targetStartDate === targetEndDate && SLOT_INDEX[targetStartSlot] > SLOT_INDEX[targetEndSlot]) {
      throw new Error('Le créneau de fin doit être après ou égal au créneau de début')
    }

    const absences = await regenerateLongAbsenceDailyRows({
      familyId, longAbsenceId: longAbsence.id, memberId: targetMemberId,
      startDate: targetStartDate, startSlot: targetStartSlot, endDate: targetEndDate, endSlot: targetEndSlot,
      note, declaredBy: req.mcpFallbackActor?.id ?? null
    })

    longAbsence.memberId = targetMemberId
    longAbsence.startDate = targetStartDate
    longAbsence.startSlot = targetStartSlot
    longAbsence.endDate = targetEndDate
    longAbsence.endSlot = targetEndSlot
    if (note !== undefined) longAbsence.note = (note || '').trim()
    longAbsence.declaredBy = req.mcpFallbackActor?.id ?? null
    await longAbsence.save()

    return jsonResult({ longAbsence, absences })
  })

  server.registerTool('delete_long_absence', {
    title: 'Supprimer une absence longue',
    description: 'Supprime une absence longue et les déclarations journalières liées.',
    inputSchema: { id: z.number() }
  }, async ({ id }) => {
    const longAbsence = await LongAbsence.findOne({ id: Number(id), familyId })
    if (!longAbsence) throw new Error('Absence longue non trouvée')

    const deleteResult = await Absence.deleteMany({ familyId, longAbsenceId: longAbsence.id })
    await LongAbsence.deleteOne({ _id: longAbsence._id })

    return jsonResult({ deleted: true, deletedAbsencesCount: deleteResult.deletedCount })
  })
}
