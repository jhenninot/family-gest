import Meal from '../models/Meal.js'
import ShoppingItem from '../models/ShoppingItem.js'
import Task from '../models/Task.js'
import { visibleTasksFilter } from '../tasks/visibility.js'
import User from '../models/User.js'
import FamilyMember from '../models/FamilyMember.js'
import Absence from '../models/Absence.js'
import MealGuest from '../models/MealGuest.js'
import Event from '../models/Event.js'
import LongAbsence from '../models/LongAbsence.js'
import { getMealSlotPresence } from '../digest/mealPresence.js'
import { translator, readableDate } from '../i18n/index.js'
import { getFamilyMembersList } from '../mcp/resolveMember.js'
import { todayStr } from './parsing.js'

// Écritures déclenchées par la skill Alexa, pour la famille et la langue de la requête. Elles
// réutilisent les fonctions de l'application (mêmes règles de fusion des présences, mêmes
// invités…) et préviennent les autres membres par notification push « via Alexa », comme le
// connecteur MCP. L'auteur est la personne qui a généré le jeton de la skill.

const normalize = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

// channel : 'alexa' (skill) ou 'voice' (assistant vocal de l'application), repris dans les notifications
export const createAlexaApi = (req, ctx, lang, { channel = 'alexa' } = {}) => {
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

    // Personne qui parle : connue seulement dans l'assistant de l'application (compte connecté) ;
    // la skill Alexa agit au nom de l'auteur du jeton, qui n'est pas forcément celui qui parle
    async currentMember () {
      if (channel !== 'voice' || actorId == null) return null
      return (await this.members()).find(m => m.id === actorId) || null
    },

    // --- Questions (lecture seule) ---

    // Qui est à la maison à un créneau : même calcul que le récapitulatif quotidien et l'application
    // (présence habituelle, semaines A/B, absences et présences déclarées, invités)
    whoIsHome: ({ date, slot }) => getMealSlotPresence({ FamilyMember, User, Absence, MealGuest }, family, date, slot),

    // Tâches non terminées (d'un membre ou de toute la famille), les échéances les plus proches d'abord.
    // Les tâches privées ne sont lues qu'à leur auteur, dans l'assistant de l'application (la skill
    // Alexa parle sur un appareil partagé).
    async pendingTasks ({ memberId = null } = {}) {
      const filter = { familyId, completed: false, ...visibleTasksFilter(channel === 'voice' ? actorId : null) }
      if (memberId != null) filter.assignedTo = memberId
      const tasks = await Task.find(filter)
      const names = new Map((await this.members()).map(m => [m.id, m.firstName]))
      return tasks
        .map(task => ({ title: task.title, dueDate: task.dueDate || null, assignee: names.get(task.assignedTo) || null }))
        .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))
    },

    // Plats prévus entre deux dates incluses, dans l'ordre (midi avant soir)
    async plannedMeals ({ start, end }) {
      const meals = await Meal.find({ familyId, date: { $gte: start, $lte: end } })
      return meals
        .map(m => ({ date: m.date, slot: m.slot, dish: m.dish }))
        .sort((a, b) => a.date.localeCompare(b.date) || (a.slot === 'lunch' ? -1 : 1))
    },

    // Événements de l'agenda entre deux dates incluses, dans l'ordre (sans heure en premier dans la
    // journée). Un événement sur plusieurs jours commencé avant la période y figure à son premier jour.
    async upcomingEvents ({ start, end }) {
      const events = await Event.find({
        familyId,
        date: { $lte: end },
        $or: [{ endDate: { $gte: start } }, { endDate: null, date: { $gte: start } }]
      })
      const names = new Map((await this.members()).map(m => [m.id, m.firstName]))
      return events
        .map(e => ({
          date: e.date < start ? start : e.date,
          endDate: e.endDate && e.endDate > e.date ? e.endDate : null,
          time: e.time || '',
          title: e.title,
          members: [...new Set([...(e.memberIds || []), e.assignedTo].filter(id => id != null))].map(id => names.get(id)).filter(Boolean)
        }))
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    },

    // Absences déclarées qui touchent la période : les absences longues en une fois (du … au …), les
    // autres jour par jour avec leurs repas. Les absences habituelles (semaine type) n'y sont pas.
    async upcomingAbsences ({ start, end, memberId = null }) {
      const who = memberId != null ? { memberId } : {}
      const [longs, days] = await Promise.all([
        LongAbsence.find({ familyId, ...who, startDate: { $lte: end }, endDate: { $gte: start } }),
        Absence.find({ familyId, ...who, type: 'absence', longAbsenceId: null, date: { $gte: start, $lte: end } })
      ])
      const names = new Map((await this.members()).map(m => [m.id, m.firstName]))
      const items = [
        ...longs.map(la => ({ memberId: la.memberId, startDate: la.startDate, endDate: la.endDate })),
        ...days.filter(a => a.lunch || a.dinner || a.night)
          .map(a => ({ memberId: a.memberId, startDate: a.date, endDate: null, lunch: a.lunch, dinner: a.dinner, night: a.night }))
      ]
      return items
        .filter(a => names.has(a.memberId))
        .map(a => ({ ...a, firstName: names.get(a.memberId) }))
        .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.firstName.localeCompare(b.firstName))
    },

    // --- Ajouts ---

    async addEvent ({ title, date, endDate = null, time, endTime = '', memberIds = [] }) {
      const { event } = await ctx.createEventOrSeries({ familyId, body: { title, date, endDate, time: time || '', endTime: endTime || '', memberIds }, declaredBy: actorId, lang })
      notify({
        action: ctx.ALERT_ACTIONS.EVENT_CREATED,
        title: (tr) => tr('notify.event.createdTitle', { title: event.title }),
        body: (tr) => tr(`notify.${channel}.added`, {
          text: event.endDate
            ? tr('notify.event.whenDays', { start: readableDate(tr, event.date), end: readableDate(tr, event.endDate) })
            : event.time ? tr('notify.event.whenTime', { date: readableDate(tr, event.date), time: event.time }) : readableDate(tr, event.date)
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
        body: (tr) => tr(`notify.${channel}.added`, { text: tr('notify.alexa.mealFor', { slot: tr(`notify.meal.slot.${slot}`), date: readableDate(tr, date) }) }),
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
        body: (tr) => tr(`notify.${channel}.declared`, {
          text: tr('notify.alexa.memberOn', { member: member.firstName, date: readableDate(tr, date), slots: slotList(tr, { lunch, dinner, night }) })
        }),
        targetType: 'absence',
        targetId: absence.id
      })
      return absence
    },

    // Événement sur plusieurs jours : une absence longue par personne, du déjeuner du premier jour à
    // la nuit du dernier (comme la case « générer une absence » de l'application)
    async addEventLongAbsences ({ eventId, members }) {
      const event = await Event.findOne({ familyId, id: eventId })
      if (!event?.endDate) return []
      const created = await ctx.syncEventLongAbsences({
        familyId, event, memberIds: members.map(m => m.id), declaredBy: actorId, lang
      })
      for (const la of created) {
        const member = members.find(m => m.id === la.memberId)
        notify({
          action: ctx.ALERT_ACTIONS.ABSENCE_CREATED,
          title: (tr) => tr('notify.mcp.absenceTitle', { member: member?.firstName || '' }),
          body: (tr) => tr(`notify.${channel}.declared`, {
            text: `${member?.firstName || ''} : ${tr('notify.event.whenDays', { start: readableDate(tr, la.startDate), end: readableDate(tr, la.endDate) })}`
          }),
          targetType: 'absence',
          targetId: la.id
        })
      }
      return created
    },

    // Absence liée à un événement (comme la case « générer une absence » de l'application) ; les
    // repas déjà déclarés ce jour-là sont conservés
    async addEventAbsence ({ member, date, slots, title, eventId }) {
      const existing = await Absence.findOne({ familyId, memberId: member.id, date, type: 'absence' })
      const lunch = Boolean(existing?.lunch) || slots.includes('lunch')
      const dinner = Boolean(existing?.dinner) || slots.includes('dinner')
      const night = Boolean(existing?.night)
      const { absence } = await ctx.upsertAbsenceRecord({
        familyId, memberId: member.id, date, type: 'absence', lunch, dinner, night,
        note: existing?.note || t('notes.eventAbsence', { title }), declaredBy: actorId, eventId
      })
      notify({
        action: ctx.ALERT_ACTIONS.ABSENCE_CREATED,
        title: (tr) => tr('notify.mcp.absenceTitle', { member: member.firstName }),
        body: (tr) => tr(`notify.${channel}.declared`, {
          text: tr('notify.alexa.memberOn', { member: member.firstName, date: readableDate(tr, date), slots: slotList(tr, { lunch: slots.includes('lunch'), dinner: slots.includes('dinner'), night: false }) })
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
        body: (tr) => tr(`notify.${channel}.added`, { text: tr('notify.alexa.on', { date: readableDate(tr, date), slots: slotList(tr, { lunch, dinner, night }) }) }),
        targetType: 'meal_guest',
        targetId: guests[0]?.id
      })
      return guests
    }
  }
}
