import { z } from 'zod'
import ShoppingItem from '../../models/ShoppingItem.js'
import { jsonResult } from '../toolHelpers.js'

export const registerShoppingTools = (server, req, ctx) => {
  const { getOrSeedShoppingCategories } = ctx
  const familyId = req.family._id

  server.registerTool('list_shopping_categories', {
    title: 'Lister les catégories de courses',
    description: 'Liste les catégories de courses de la famille (utile pour choisir une catégorie valide avant de créer un article).',
    inputSchema: {}
  }, async () => {
    const cats = await getOrSeedShoppingCategories(familyId)
    return jsonResult(cats)
  })

  server.registerTool('list_shopping_items', {
    title: 'Lister les articles de courses',
    description: 'Liste tous les articles de la liste de courses.',
    inputSchema: {}
  }, async () => {
    const items = await ShoppingItem.find({ familyId }).sort({ createdAt: -1 })
    return jsonResult(items)
  })

  server.registerTool('create_shopping_item', {
    title: 'Ajouter un article de courses',
    description: 'Ajoute un article à la liste de courses.',
    inputSchema: {
      name: z.string().describe('Nom de l\'article'),
      category: z.string().optional(),
      quantity: z.number().optional(),
      urgent: z.boolean().optional()
    }
  }, async ({ name, category, quantity, urgent }) => {
    const newItem = new ShoppingItem({
      familyId,
      id: Date.now(),
      name,
      category: category || 'Frais',
      quantity: Number(quantity) || 1,
      urgent: Boolean(urgent),
      checked: false,
      mealId: null
    })
    await newItem.save()
    return jsonResult(newItem)
  })

  server.registerTool('update_shopping_item', {
    title: 'Modifier un article de courses',
    description: 'Modifie un article existant de la liste de courses.',
    inputSchema: {
      id: z.number(),
      name: z.string().optional(),
      category: z.string().optional(),
      quantity: z.number().optional(),
      urgent: z.boolean().optional()
    }
  }, async ({ id, name, category, quantity, urgent }) => {
    const item = await ShoppingItem.findOne({ id: Number(id), familyId })
    if (!item) throw new Error('Article non trouvé')

    if (name !== undefined) item.name = name
    if (category !== undefined) item.category = category
    if (quantity !== undefined) item.quantity = Number(quantity)
    if (urgent !== undefined) item.urgent = Boolean(urgent)

    await item.save()
    return jsonResult(item)
  })

  server.registerTool('toggle_shopping_item', {
    title: 'Cocher/décocher un article de courses',
    description: 'Bascule l\'état "acheté" (coché) d\'un article de courses.',
    inputSchema: { id: z.number() }
  }, async ({ id }) => {
    const item = await ShoppingItem.findOne({ id: Number(id), familyId })
    if (!item) throw new Error('Article non trouvé')

    item.checked = !item.checked
    await item.save()
    return jsonResult(item)
  })

  server.registerTool('delete_shopping_item', {
    title: 'Supprimer un article de courses',
    description: 'Supprime un article de la liste de courses.',
    inputSchema: { id: z.number() }
  }, async ({ id }) => {
    await ShoppingItem.deleteOne({ id: Number(id), familyId })
    return jsonResult({ deleted: true })
  })
}
