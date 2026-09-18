import { getMealSlotPresence } from './mealPresence.js'

// Rassemble, pour une famille et un utilisateur donnés, les 4 sections du récapitulatif
// quotidien : repas/présence (midi, soir, et présence de nuit sans plat associé puisque
// Meal.slot ne supporte que 'lunch'/'dinner'), mes tâches non terminées, les événements du
// jour, et la liste de courses non cochée.
export const gatherFamilyDigestSection = async (ctx, family, user, todayStr) => {
  const [lunchMeal, dinnerMeal, lunchPresence, dinnerPresence, nightPresence, myTasks, todaysEvents, shoppingList] = await Promise.all([
    ctx.Meal.findOne({ familyId: family._id, date: todayStr, slot: 'lunch' }),
    ctx.Meal.findOne({ familyId: family._id, date: todayStr, slot: 'dinner' }),
    getMealSlotPresence(ctx, family._id, todayStr, 'lunch'),
    getMealSlotPresence(ctx, family._id, todayStr, 'dinner'),
    getMealSlotPresence(ctx, family._id, todayStr, 'night'),
    ctx.Task.find({ familyId: family._id, assignedTo: user.id, completed: false }),
    ctx.Event.find({ familyId: family._id, date: todayStr }).sort({ time: 1 }),
    ctx.ShoppingItem.find({ familyId: family._id, checked: false }).sort({ category: 1, name: 1 })
  ])

  return {
    family: { name: family.name, slug: family.slug },
    meals: {
      lunch: { dish: lunchMeal?.dish || null, ...lunchPresence },
      dinner: { dish: dinnerMeal?.dish || null, ...dinnerPresence },
      night: nightPresence
    },
    myTasks,
    todaysEvents,
    shoppingList
  }
}
