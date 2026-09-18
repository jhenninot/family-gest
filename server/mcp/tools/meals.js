import { z } from 'zod'
import Meal from '../../models/Meal.js'
import { resolveMember } from '../resolveMember.js'
import { jsonResult } from '../toolHelpers.js'
import { notifyMcpAction } from '../notify.js'

const ingredientSchema = z.union([
  z.string(),
  z.object({
    name: z.string(),
    category: z.string().optional(),
    quantity: z.number().optional()
  })
])

export const registerMealTools = (server, req, ctx) => {
  const { createShoppingItemsForIngredients, deleteMealCascade, ALERT_ACTIONS } = ctx
  const familyId = req.family._id

  server.registerTool('list_meals', {
    title: 'Lister les repas de la semaine',
    description: 'Liste les repas planifiés (plat + créneau midi/soir), filtrés optionnellement par plage de dates.',
    inputSchema: {
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }
  }, async ({ startDate, endDate }) => {
    const filter = { familyId }
    if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate }
    else if (startDate) filter.date = { $gte: startDate }
    const meals = await Meal.find(filter).sort({ date: 1, slot: 1 })
    return jsonResult(meals)
  })

  server.registerTool('create_meal', {
    title: 'Ajouter un repas',
    description: "Ajoute un plat au menu de la semaine pour une date et un créneau (midi/soir). " +
      "Les ingrédients fournis sont automatiquement ajoutés à la liste de courses.",
    inputSchema: {
      date: z.string().describe('Date (YYYY-MM-DD)'),
      slot: z.enum(['lunch', 'dinner']),
      dish: z.string().describe('Nom du plat'),
      notes: z.string().optional(),
      suggestedBy: z.string().optional().describe('Nom ou id du membre qui suggère le plat'),
      ingredients: z.array(ingredientSchema).optional()
    }
  }, async ({ date, slot, dish, notes, suggestedBy, ingredients }) => {
    const cleanDish = String(dish).trim()
    if (!cleanDish) throw new Error('L\'intitulé du plat ne peut pas être vide')

    const memberId = suggestedBy ? (await resolveMember(familyId, suggestedBy)).id : (req.mcpFallbackActor?.id ?? null)

    const newMeal = new Meal({
      familyId,
      id: Date.now(),
      date: String(date),
      slot: slot === 'dinner' ? 'dinner' : 'lunch',
      dish: cleanDish,
      suggestedBy: memberId,
      notes: notes ? String(notes).trim() : ''
    })
    await newMeal.save()

    const createdIngredients = await createShoppingItemsForIngredients({ familyId, mealId: newMeal.id, ingredients })

    notifyMcpAction(req, ctx, {
      action: ALERT_ACTIONS.MEAL_CREATED,
      title: `Repas suggéré : ${newMeal.dish}`,
      targetType: 'meal',
      targetId: newMeal.id,
      body: `Pour le ${newMeal.slot === 'lunch' ? 'midi' : 'soir'} du ${newMeal.date} • Ajouté via l'assistant`
    })

    return jsonResult({ ...newMeal.toObject(), createdIngredients })
  })

  server.registerTool('update_meal', {
    title: 'Modifier un repas',
    description: 'Modifie un repas existant.',
    inputSchema: {
      id: z.number(),
      date: z.string().optional(),
      slot: z.enum(['lunch', 'dinner']).optional(),
      dish: z.string().optional(),
      notes: z.string().optional(),
      suggestedBy: z.string().optional()
    }
  }, async ({ id, date, slot, dish, notes, suggestedBy }) => {
    const meal = await Meal.findOne({ id: Number(id), familyId })
    if (!meal) throw new Error('Plat non trouvé')

    if (date !== undefined) meal.date = String(date)
    if (slot !== undefined) meal.slot = slot === 'dinner' ? 'dinner' : 'lunch'
    if (dish !== undefined) {
      const cleanDish = String(dish).trim()
      if (!cleanDish) throw new Error('L\'intitulé du plat ne peut pas être vide')
      meal.dish = cleanDish
    }
    if (notes !== undefined) meal.notes = String(notes).trim()
    if (suggestedBy !== undefined) meal.suggestedBy = suggestedBy ? (await resolveMember(familyId, suggestedBy)).id : null

    await meal.save()
    return jsonResult(meal)
  })

  server.registerTool('delete_meal', {
    title: 'Supprimer un repas',
    description: 'Supprime un repas et les articles de courses créés automatiquement pour ses ingrédients.',
    inputSchema: { id: z.number() }
  }, async ({ id }) => {
    const meal = await Meal.findOne({ id: Number(id), familyId })
    if (!meal) throw new Error('Plat non trouvé')

    const result = await deleteMealCascade({ familyId, mealId: meal.id })
    return jsonResult({ deleted: true, deletedIngredientsCount: result.deletedIngredientsCount })
  })
}
