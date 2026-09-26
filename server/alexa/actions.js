import Meal from '../models/Meal.js'
import ShoppingItem from '../models/ShoppingItem.js'
import { translator, readableDate } from '../i18n/index.js'
import { getFamilyMembersList } from '../mcp/resolveMember.js'
import { todayStr } from './parsing.js'

// Écritures déclenchées par la skill Alexa, pour la famille et la langue de la requête. Elles
// réutilisent les fonctions de l'application (mêmes règles de fusion des présences, mêmes
// invités…) et préviennent les autres membres par notification push « via Alexa », comme le
// connecteur MCP. L'auteur est la personne qui a généré le jeton de la skill.

const normalize = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export const createAlexaApi = (req, ctx, lang) => {
  const { family, alexaActor: actor } = req
  const familyId = family._id
  const actorId = actor?.id ?? null
  const t = translator(lang)
  let membersCache = null

  const notify = ({ action, title, body, targetType, targetId }) => {
    ctx.dispatchFamilyAlert({
      family,
      actor,
      action: action.code,
      actionLabel: action.label,
      title,
      targetType,
      targetId,
      push: { title, body, url: `/${family.slug}/dashboard` },
      email: null
    }).catch(err => console.error('[Alexa] dispatchFamilyAlert :', err.message))
  }

  const slotList = (tr, { lunch, dinner, night }) => [lunch && 'lunch', dinner && 'dinner', night && 'night']
    .filter(Boolean).map(s => tr(`notify.slots.${s}`)).join(', ')

  return {
    t,
    today: () => todayStr(),

    async members () {
      if (!membersCache) membersCache = await getFamilyMembersList(familyId)
      return membersCache
    },

    async addEvent ({ title, date, time }) {
      const { event } = await ctx.createEventOrSeries({ familyId, body: { title, date, time: time || '' }, declaredBy: actorId, lang })
      notify({
        action: ctx.ALERT_ACTIONS.EVENT_CREATED,
        title: (tr) => tr('notify.event.createdTitle', { title: event.title }),
        body: (tr) => tr('notify.alexa.added', {
          text: event.time ? tr('notify.event.whenTime', { date: readableDate(tr, event.date), time: event.time }) : readableDate(tr, event.date)
        }),
        targetType: 'event',
        targetId: event.id
      })
      return event
    },

    // Articles dictés ; ceux déjà présents (non cochés) sur la liste ne sont pas ajoutés en double.
    // Catégorie « Autre » quand elle existe (on ne devine pas le rayon), sinon la première.
    async addShoppingItems (entries) {
      const categories = await ctx.getOrSeedShoppingCategories(familyId)
      const category = (categories.find(c => normalize(c.name) === 'autre') || categories[0])?.name || 'Autre'
      const pending = await ShoppingItem.find({ familyId, checked: false }).select('name')
      const existing = new Set(pending.map(i => normalize(i.name)))

      const added = []
      const skipped = []
      for (let i = 0; i < entries.length; i++) {
        const { name, quantity } = entries[i]
        if (existing.has(normalize(name))) { skipped.push(name); continue }
        await new ShoppingItem({
          familyId, id: Date.now() + i, name, category, quantity, urgent: false, checked: false, mealId: null
        }).save()
        existing.add(normalize(name))
        added.push(name)
      }
      return { added, skipped }
    },

    async addMeal ({ dish, date, slot }) {
      const meal = await new Meal({ familyId, id: Date.now(), date, slot, dish, suggestedBy: actorId, notes: '', recipeUrl: '' }).save()
      notify({
        action: ctx.ALERT_ACTIONS.MEAL_CREATED,
        title: (tr) => tr('notify.meal.title', { dish }),
        body: (tr) => tr('notify.alexa.added', { text: tr('notify.alexa.mealFor', { slot: tr(`notify.meal.slot.${slot}`), date: readableDate(tr, date) }) }),
        targetType: 'meal',
        targetId: meal.id
      })
      return meal
    },

    async declarePresence ({ member, date, type, lunch, dinner, night }) {
      const { absence } = await ctx.upsertAbsenceRecord({
        familyId, memberId: member.id, date, type, lunch, dinner, night, note: '', declaredBy: actorId
      })
      notify({
        action: type === 'presence' ? ctx.ALERT_ACTIONS.PRESENCE_CREATED : ctx.ALERT_ACTIONS.ABSENCE_CREATED,
        title: (tr) => tr(`notify.mcp.${type === 'presence' ? 'presence' : 'absence'}Title`, { member: member.firstName }),
        body: (tr) => tr('notify.alexa.declared', {
          text: tr('notify.alexa.memberOn', { member: member.firstName, date: readableDate(tr, date), slots: slotList(tr, { lunch, dinner, night }) })
        }),
        targetType: 'absence',
        targetId: absence.id
      })
      return absence
    },

    async addGuests ({ names, date, lunch, dinner, night }) {
      const guests = await ctx.createMealGuestsBatch({ familyId, names, date, lunch, dinner, night, invitedBy: null, note: '', fallbackHostId: actorId })
      notify({
        action: ctx.ALERT_ACTIONS.MEAL_GUEST_CREATED,
        title: (tr) => tr('notify.guest.title', { names: names.join(', '), n: names.length }),
        body: (tr) => tr('notify.alexa.added', { text: tr('notify.alexa.on', { date: readableDate(tr, date), slots: slotList(tr, { lunch, dinner, night }) }) }),
        targetType: 'meal_guest',
        targetId: guests[0]?.id
      })
      return guests
    }
  }
}
