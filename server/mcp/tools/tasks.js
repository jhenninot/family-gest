import { z } from 'zod'
import Task from '../../models/Task.js'
import { resolveMember } from '../resolveMember.js'
import { jsonResult } from '../toolHelpers.js'
import { notifyMcpAction } from '../notify.js'

export const registerTaskTools = (server, req, ctx) => {
  const { toggleTaskCompletion, updateTask, normalizeTaskDueDate, ALERT_ACTIONS } = ctx
  const familyId = req.family._id

  server.registerTool('list_tasks', {
    title: 'Lister les tâches',
    description: 'Liste les tâches de la famille.',
    inputSchema: {}
  }, async () => {
    const tasks = await Task.find({ familyId }).sort({ createdAt: -1 })
    return jsonResult(tasks)
  })

  server.registerTool('create_task', {
    title: 'Créer une tâche',
    description: 'Crée une tâche assignée à un membre de la famille, avec des points de récompense à la complétion.',
    inputSchema: {
      title: z.string().describe('Titre de la tâche'),
      assignedTo: z.string().describe('Nom ou id du membre assigné'),
      category: z.string().optional(),
      priority: z.string().optional(),
      points: z.number().optional().describe('Points attribués à la complétion (défaut: 10)'),
      notes: z.string().optional().describe('Description libre de la tâche'),
      dueDate: z.string().optional().describe('Échéance AAAA-MM-JJ : la tâche devient urgente et est rappelée chaque jour à la personne assignée une fois cette date atteinte')
    }
  }, async ({ title, assignedTo, category, priority, points, dueDate, notes }) => {
    const resolved = await resolveMember(familyId, assignedTo)

    const newTask = new Task({
      familyId,
      id: Date.now(),
      title,
      category: category || 'Maison',
      assignedTo: resolved.id,
      priority: priority || 'Moyenne',
      points: Number(points) || 10,
      completed: false,
      dueDate: normalizeTaskDueDate(dueDate),
      notes: String(notes ?? '').trim()
    })
    await newTask.save()

    notifyMcpAction(req, ctx, {
      action: ALERT_ACTIONS.TASK_CREATED,
      title: `Nouvelle tâche : ${newTask.title}`,
      targetType: 'task',
      targetId: newTask.id,
      body: `Assignée à ${resolved.name} • +${newTask.points} pts • Ajoutée via l'assistant`
    })

    return jsonResult(newTask)
  })

  server.registerTool('update_task', {
    title: 'Modifier une tâche',
    description: 'Modifie une tâche existante.',
    inputSchema: {
      id: z.number(),
      title: z.string().optional(),
      category: z.string().optional(),
      assignedTo: z.string().optional(),
      priority: z.string().optional(),
      points: z.number().optional(),
      notes: z.string().optional().describe('Description libre ; chaîne vide pour la retirer'),
      dueDate: z.string().optional().describe('Échéance AAAA-MM-JJ ; chaîne vide pour la retirer')
    }
  }, async ({ id, assignedTo, ...fields }) => {
    const resolvedAssignedTo = assignedTo !== undefined ? (await resolveMember(familyId, assignedTo)).id : undefined
    const task = await updateTask({
      familyId,
      taskId: id,
      fields: { ...fields, assignedTo: resolvedAssignedTo },
      family: req.family,
      actor: req.mcpFallbackActor || null,
      via: "via l'assistant"
    })
    if (!task) throw new Error('Tâche non trouvée')
    return jsonResult(task)
  })

  server.registerTool('toggle_task', {
    title: 'Basculer l\'état d\'une tâche',
    description: 'Marque une tâche comme terminée (ou non terminée) ; répercute les points sur le membre assigné.',
    inputSchema: { id: z.number() }
  }, async ({ id }) => {
    const task = await toggleTaskCompletion({ familyId, taskId: id })
    if (!task) throw new Error('Tâche non trouvée')
    return jsonResult(task)
  })

  server.registerTool('delete_task', {
    title: 'Supprimer une tâche',
    description: 'Supprime une tâche.',
    inputSchema: { id: z.number() }
  }, async ({ id }) => {
    await Task.deleteOne({ id: Number(id), familyId })
    return jsonResult({ deleted: true })
  })
}
