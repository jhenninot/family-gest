import { z } from 'zod'
import Task from '../../models/Task.js'
import { resolveMember } from '../resolveMember.js'
import { jsonResult } from '../toolHelpers.js'
import { notifyMcpAction } from '../notify.js'

export const registerTaskTools = (server, req, ctx) => {
  const { toggleTaskCompletion, updateTask, ALERT_ACTIONS } = ctx
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
      dueDate: z.string().optional()
    }
  }, async ({ title, assignedTo, category, priority, points, dueDate }) => {
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
      dueDate
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
      dueDate: z.string().optional()
    }
  }, async ({ id, assignedTo, ...fields }) => {
    const resolvedAssignedTo = assignedTo !== undefined ? (await resolveMember(familyId, assignedTo)).id : undefined
    const task = await updateTask({ familyId, taskId: id, fields: { ...fields, assignedTo: resolvedAssignedTo } })
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
