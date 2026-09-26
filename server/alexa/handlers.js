import Alexa from 'ask-sdk-core'
import { readableDate, formatDateOnly } from '../i18n/index.js'
import { parseAlexaDate, parseAlexaTime, parseMealSlot, slotsToFlags, splitSpokenList, parseShoppingEntry, parseGuestNames, matchMember, parseAlexaPeriod, addDays, currentHour } from './parsing.js'

// Dialogue de la skill Alexa. Toutes les écritures passent par `api` (voir actions.js), ce qui
// permet de tester ces gestionnaires sans base de données.
//
// api = { t, today(), members(), addEvent(), addShoppingItems(), addMeal(), declarePresence(), addGuests(),
//         whoIsHome(), pendingTasks(), plannedMeals() }

// Valeur entendue et identifiant résolu (valeurs du modèle ou entités dynamiques) d'un créneau
const readSlot = (handlerInput, name) => {
  const slot = Alexa.getSlot(handlerInput.requestEnvelope, name)
  if (!slot) return { value: null, id: null }
  const match = (slot.resolutions?.resolutionsPerAuthority || []).find(r => r.status?.code === 'ER_SUCCESS_MATCH')
  return { value: slot.value || null, id: match?.values?.[0]?.value?.id || null }
}

const escapeSsml = (s) => String(s ?? '').replace(/&/g, 'et').replace(/[<>]/g, ' ')

// « a, b et c »
const joinList = (t, items) => items.length <= 1
  ? (items[0] || '')
  : `${items.slice(0, -1).join(', ')} ${t('alexa.and')} ${items[items.length - 1]}`

const spokenTime = (t, time) => {
  const [h, m] = time.split(':').map(Number)
  return m === 0 ? t('alexa.time.hour', { h }) : t('alexa.time.hourMinutes', { h, m: String(m).padStart(2, '0') })
}

// Fin d'une action : la conversation continue si la skill a été ouverte (« Alexa, ouvre… »),
// sinon Alexa se tait après avoir confirmé.
const finish = (handlerInput, api, speech) => {
  const { launched } = handlerInput.attributesManager.getSessionAttributes()
  const rb = handlerInput.responseBuilder
  if (launched) {
    const more = api.t('alexa.anythingElse')
    return rb.speak(`${escapeSsml(speech)} ${more}`).reprompt(more).getResponse()
  }
  return rb.speak(escapeSsml(speech)).withShouldEndSession(true).getResponse()
}

// Redemande une information (créneau d'intention) avec un message expliquant pourquoi
const elicit = (handlerInput, slotName, speech) => handlerInput.responseBuilder
  .speak(escapeSsml(speech))
  .reprompt(escapeSsml(speech))
  .addElicitSlotDirective(slotName, Alexa.getRequest(handlerInput.requestEnvelope).intent)
  .getResponse()

const isIntent = (...names) => (handlerInput) =>
  Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
  names.includes(Alexa.getIntentName(handlerInput.requestEnvelope))

// Date facultative (repas, présences, invités) : aujourd'hui si rien n'a été dit
const optionalDate = (handlerInput, api) => {
  const { value } = readSlot(handlerInput, 'date')
  if (!value) return { date: api.today() }
  const date = parseAlexaDate(value)
  return date ? { date } : { invalid: true }
}

// Membre désigné par son prénom, ou réponse qui redemande de qui il s'agit
const resolveMemberOrElicit = async (handlerInput, api) => {
  const { value, id } = readSlot(handlerInput, 'member')
  const found = matchMember(await api.members(), value, id)
  if (found.member) return { member: found.member }
  if (found.candidates) {
    return { response: elicit(handlerInput, 'member', api.t('alexa.member.ambiguous', { name: value, names: joinList(api.t, found.candidates.map(m => m.firstName)) })) }
  }
  return { response: elicit(handlerInput, 'member', api.t('alexa.member.unknown', { name: value || '' })) }
}

// Créneaux dits (« midi et soir », « toute la journée ») ; forcedSlot pour les intentions « nuit »
const readPresenceSlots = (handlerInput, forcedSlot) => {
  if (forcedSlot) return [forcedSlot]
  return ['slotOne', 'slotTwo']
    .map(name => { const s = readSlot(handlerInput, name); return parseMealSlot(s.id, s.value) })
    .filter(Boolean)
}

// « aujourd'hui », « demain », « mardi » (dans les six jours) ou « samedi 17 octobre »
const dayLabel = (api, date) => {
  const today = api.today()
  if (date === today) return api.t('alexa.query.today')
  if (date === addDays(today, 1)) return api.t('alexa.query.tomorrow')
  if (date > today && date <= addDays(today, 6)) return formatDateOnly(api.t.lang, date, { weekday: 'long' })
  return readableDate(api.t, date)
}

// « ce soir », « demain midi », « la nuit de samedi 4 octobre »
const slotMoment = (api, date, slot) => {
  if (date === api.today()) return api.t(`alexa.query.moment.today.${slot}`)
  return api.t(`alexa.query.moment.other.${slot}`, { day: dayLabel(api, date) })
}

const capitalizeFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

const slotNames = (t, flags) => ['lunch', 'dinner', 'night'].filter(s => flags[s]).map(s => t(`alexa.slots.${s}`))

export const buildHandlers = (api) => {
  const { t } = api

  const LaunchHandler = {
    canHandle: (h) => Alexa.getRequestType(h.requestEnvelope) === 'LaunchRequest',
    async handle (h) {
      h.attributesManager.setSessionAttributes({ launched: true })
      // Prénoms de la famille transmis à la reconnaissance vocale pour la suite de la conversation
      const members = await api.members()
      h.responseBuilder.addDirective({
        type: 'Dialog.UpdateDynamicEntities',
        updateBehavior: 'REPLACE',
        types: [{
          name: 'MemberName',
          values: members.map(m => ({ id: String(m.id), name: { value: m.firstName, synonyms: [m.name].filter(n => n && n !== m.firstName) } }))
        }]
      })
      return h.responseBuilder.speak(t('alexa.welcome')).reprompt(t('alexa.reprompt')).getResponse()
    }
  }

  const AddEventHandler = {
    canHandle: isIntent('AddEventIntent'),
    async handle (h) {
      const title = (readSlot(h, 'title').value || '').trim()
      if (!title) return elicit(h, 'title', t('alexa.event.askTitle'))
      const date = parseAlexaDate(readSlot(h, 'date').value)
      if (!date) return elicit(h, 'date', t('alexa.event.askPreciseDate'))
      const time = parseAlexaTime(readSlot(h, 'time').value)

      const cleanTitle = title.charAt(0).toUpperCase() + title.slice(1)
      await api.addEvent({ title: cleanTitle, date, time })
      const when = time
        ? t('alexa.dateAt', { date: readableDate(t, date), time: spokenTime(t, time) })
        : readableDate(t, date)
      return finish(h, api, t('alexa.event.done', { title: cleanTitle, when }))
    }
  }

  const AddShoppingHandler = {
    canHandle: isIntent('AddShoppingIntent'),
    async handle (h) {
      const entries = splitSpokenList(readSlot(h, 'items').value).map(parseShoppingEntry).filter(Boolean)
      if (entries.length === 0) return elicit(h, 'items', t('alexa.shopping.askItems'))

      const { added, skipped } = await api.addShoppingItems(entries)
      const parts = []
      if (added.length > 0) parts.push(t('alexa.shopping.done', { items: joinList(t, added), n: added.length }))
      if (skipped.length > 0) parts.push(t('alexa.shopping.already', { items: joinList(t, skipped), n: skipped.length }))
      return finish(h, api, parts.join(' '))
    }
  }

  const AddMealHandler = {
    canHandle: isIntent('AddMealIntent'),
    async handle (h) {
      const dish = (readSlot(h, 'dish').value || '').trim()
      if (!dish) return elicit(h, 'dish', t('alexa.meal.askDish'))
      const { date, invalid } = optionalDate(h, api)
      if (invalid) return elicit(h, 'date', t('alexa.askPreciseDay'))
      const slotRead = readSlot(h, 'mealSlot')
      const slot = parseMealSlot(slotRead.id, slotRead.value)
      if (slot !== 'LUNCH' && slot !== 'DINNER') return elicit(h, 'mealSlot', t('alexa.meal.askSlot'))

      const cleanDish = dish.replace(/^(?:des|du|de la|de l'|une|un|le|la|les)\s+/i, '')
      const finalDish = cleanDish.charAt(0).toUpperCase() + cleanDish.slice(1)
      const mealSlot = slot === 'LUNCH' ? 'lunch' : 'dinner'
      await api.addMeal({ dish: finalDish, date, slot: mealSlot })
      return finish(h, api, t('alexa.meal.done', { dish: finalDish, slot: t(`alexa.meals.${mealSlot}`), date: readableDate(t, date) }))
    }
  }

  const presenceHandler = (intentName, type, forcedSlot = null) => ({
    canHandle: isIntent(intentName),
    async handle (h) {
      const { member, response } = await resolveMemberOrElicit(h, api)
      if (response) return response
      const { date, invalid } = optionalDate(h, api)
      if (invalid) return elicit(h, 'date', t('alexa.askPreciseDay'))
      const slots = readPresenceSlots(h, forcedSlot)
      if (slots.length === 0) return elicit(h, 'slotOne', t('alexa.presence.askSlot'))

      const flags = slotsToFlags(slots)
      await api.declarePresence({ member, date, type, ...flags })
      return finish(h, api, t(`alexa.${type}.done`, {
        member: member.firstName,
        date: readableDate(t, date),
        slots: joinList(t, slotNames(t, flags))
      }))
    }
  })

  const AddGuestHandler = {
    canHandle: isIntent('AddGuestIntent'),
    async handle (h) {
      const names = parseGuestNames(readSlot(h, 'guests').value)
      if (names.length === 0) return elicit(h, 'guests', t('alexa.guest.askNames'))
      const { date, invalid } = optionalDate(h, api)
      if (invalid) return elicit(h, 'date', t('alexa.askPreciseDay'))
      const slots = readPresenceSlots(h)
      if (slots.length === 0) return elicit(h, 'slotOne', t('alexa.guest.askSlot'))

      const flags = slotsToFlags(slots)
      await api.addGuests({ names, date, ...flags })
      return finish(h, api, t('alexa.guest.done', {
        names: joinList(t, names),
        n: names.length,
        date: readableDate(t, date),
        slots: joinList(t, slotNames(t, flags))
      }))
    }
  }

  // --- Questions ---

  // « Qui mange à la maison ce soir ? » : sans créneau, le prochain repas du jour (midi avant 14 h,
  // soir ensuite), ou les deux repas pour un autre jour.
  // Sur une semaine ou un week-end : seulement ce qui change des habitudes (absences et présences
  // déclarées, invités), regroupé par personne
  const whoOverPeriod = async (h, period, asked) => {
    const slots = asked === 'LUNCH' ? ['lunch'] : asked === 'DINNER' ? ['dinner'] : ['lunch', 'dinner']
    const firstNames = new Map((await api.members()).map(m => [m.id, m.firstName]))
    const absent = new Map()
    const present = new Map()
    const guests = new Map()
    const note = (map, name, date, slot) => {
      if (!map.has(name)) map.set(name, [])
      map.get(name).push({ date, slot })
    }
    let total = 0
    for (let day = period.start; day <= period.end; day = addDays(day, 1)) {
      for (const slot of slots) {
        total++
        const presence = await api.whoIsHome({ date: day, slot })
        for (const m of presence.absentMembers || []) note(absent, firstNames.get(m.id) || m.name, day, slot)
        for (const m of presence.exceptionalPresences || []) note(present, firstNames.get(m.id) || m.name, day, slot)
        for (const g of presence.guests) note(guests, g.name, day, slot)
      }
    }
    // « lundi midi », « mardi midi et soir », ou « sur toute la période »
    const moments = (list) => {
      if (list.length === total && total > 1) return t('alexa.query.who.period.whole')
      const byDay = new Map()
      for (const { date, slot } of list) byDay.set(date, [...(byDay.get(date) || []), slot])
      // Dans une même semaine, le nom du jour suffit (« mercredi midi »)
      const day = (date) => (date === api.today() || date === addDays(api.today(), 1)) ? dayLabel(api, date) : formatDateOnly(t.lang, date, { weekday: 'long' })
      return joinList(t, [...byDay].map(([date, daySlots]) => {
        if (date === api.today()) return daySlots.length === 2 ? t('alexa.query.moment.today.both') : slotMoment(api, date, daySlots[0])
        return t(`alexa.query.moment.other.${daySlots.length === 2 ? 'both' : daySlots[0]}`, { day: day(date) })
      }))
    }
    // Invités venant aux mêmes repas regroupés : « Mamie et Papi viendront samedi soir »
    const guestGroups = new Map()
    for (const [name, list] of guests) {
      const when = moments(list)
      guestGroups.set(when, [...(guestGroups.get(when) || []), name])
    }
    const label = capitalizeFirst(t('alexa.query.who.period.range', { start: readableDate(t, period.start), end: readableDate(t, period.end) }))
    const parts = [
      ...[...absent].map(([name, list]) => t('alexa.query.who.period.absent', { name, moments: moments(list) })),
      ...[...present].map(([name, list]) => t('alexa.query.who.period.present', { name, moments: moments(list) })),
      ...[...guestGroups].map(([when, names]) => t('alexa.query.who.period.guest', { name: joinList(t, names), moments: when, n: names.length }))
    ]
    return finish(h, api, parts.length === 0
      ? t('alexa.query.who.period.nothing', { period: label })
      : t('alexa.query.who.period.result', { period: label, list: parts.join(' ; ') }))
  }

  const whoIsHomeHandler = (intentName, forcedSlot = null) => ({
    canHandle: isIntent(intentName),
    async handle (h) {
      if (!forcedSlot) {
        const period = parseAlexaPeriod(readSlot(h, 'date').value)
        if (period && period.start !== period.end) {
          const slotRead = readSlot(h, 'mealSlot')
          return whoOverPeriod(h, period, parseMealSlot(slotRead.id, slotRead.value))
        }
      }
      const { date, invalid } = optionalDate(h, api)
      const day = invalid ? api.today() : date
      const slotRead = readSlot(h, 'mealSlot')
      const asked = forcedSlot || parseMealSlot(slotRead.id, slotRead.value)
      let slots
      if (asked === 'LUNCH') slots = ['lunch']
      else if (asked === 'DINNER') slots = ['dinner']
      else if (asked === 'NIGHT') slots = ['night']
      else if (day === api.today()) slots = [currentHour() < 14 ? 'lunch' : 'dinner']
      else slots = ['lunch', 'dinner']

      const firstNames = new Map((await api.members()).map(m => [m.id, m.firstName]))
      const sentences = []
      for (const slot of slots) {
        const presence = await api.whoIsHome({ date: day, slot })
        const when = capitalizeFirst(slotMoment(api, day, slot))
        const members = presence.presentMembers.map(m => firstNames.get(m.id) || m.name)
        const guests = presence.guests.map(g => g.name)
        if (members.length + guests.length === 0) {
          sentences.push(t('alexa.query.who.nobody', { when }))
          continue
        }
        const names = guests.length > 0
          ? t('alexa.query.who.withGuests', { members: joinList(t, members), guests: joinList(t, guests), n: guests.length })
          : joinList(t, members)
        sentences.push(t('alexa.query.who.result', { when, names, n: presence.headcount }))
      }
      return finish(h, api, sentences.join(' '))
    }
  })

  // « Quelles sont les tâches en cours ? », « Qu'est-ce que Paul doit faire ? »
  const TasksHandler = {
    canHandle: isIntent('TasksIntent'),
    async handle (h) {
      const { value } = readSlot(h, 'member')
      let member = null
      if (value) {
        const found = await resolveMemberOrElicit(h, api)
        if (found.response) return found.response
        member = found.member
      }
      const tasks = await api.pendingTasks({ memberId: member?.id ?? null })
      if (tasks.length === 0) {
        return finish(h, api, member ? t('alexa.query.tasks.noneFor', { member: member.firstName }) : t('alexa.query.tasks.none'))
      }
      const today = api.today()
      const describe = (task) => {
        let text = task.title
        if (!member && task.assignee) text += ` ${t('alexa.query.tasks.for', { name: task.assignee })}`
        if (task.dueDate) {
          if (task.dueDate < today) text += `, ${t('alexa.query.tasks.overdue')}`
          else if (task.dueDate === today) text += `, ${t('alexa.query.tasks.dueToday')}`
          else if (task.dueDate === addDays(today, 1)) text += `, ${t('alexa.query.tasks.dueTomorrow')}`
          else text += `, ${t('alexa.query.tasks.dueOn', { date: readableDate(t, task.dueDate) })}`
        }
        return text
      }
      const shown = tasks.slice(0, 5).map(describe)
      const rest = tasks.length - shown.length
      const list = shown.join(' ; ') + (rest > 0 ? ` ; ${t('alexa.query.tasks.more', { n: rest })}` : '')
      return finish(h, api, member
        ? t('alexa.query.tasks.listFor', { member: member.firstName, n: tasks.length, list })
        : t('alexa.query.tasks.list', { n: tasks.length, list }))
    }
  }

  // « Qu'est-ce qu'on mange ce soir ? », « Quels sont les repas prévus cette semaine ? »
  const MealsHandler = {
    canHandle: isIntent('MealsIntent'),
    async handle (h) {
      const dateValue = readSlot(h, 'date').value
      const slotRead = readSlot(h, 'mealSlot')
      const slotKey = parseMealSlot(slotRead.id, slotRead.value)
      const slot = slotKey === 'LUNCH' ? 'lunch' : slotKey === 'DINNER' ? 'dinner' : null
      const today = api.today()
      // Sans date : aujourd'hui si un repas est précisé, sinon les 7 prochains jours
      const period = dateValue ? parseAlexaPeriod(dateValue) : (slot ? { start: today, end: today } : { start: today, end: addDays(today, 6) })
      if (!period) return elicit(h, 'date', t('alexa.askPreciseDay'))

      const meals = (await api.plannedMeals(period)).filter(m => !slot || m.slot === slot)
      const singleDay = period.start === period.end

      // Un repas précis : « Ce soir, c'est raclette. »
      if (singleDay && slot) {
        const when = slotMoment(api, period.start, slot)
        return finish(h, api, meals.length > 0
          ? t('alexa.query.meals.one', { when: capitalizeFirst(when), dish: joinList(t, meals.map(m => m.dish)) })
          : t('alexa.query.meals.noneAt', { when }))
      }
      if (meals.length === 0) {
        if (singleDay) return finish(h, api, t('alexa.query.meals.noneOn', { day: dayLabel(api, period.start) }))
        return finish(h, api, dateValue
          ? t('alexa.query.meals.nonePeriod', { start: readableDate(t, period.start), end: readableDate(t, period.end) })
          : t('alexa.query.meals.nonePlanned'))
      }
      const list = meals.slice(0, 10).map(m => t('alexa.query.meals.item', {
        when: singleDay ? t(`alexa.query.meals.slot.${m.slot}`) : slotMoment(api, m.date, m.slot),
        dish: m.dish
      }))
      const rest = meals.length - list.length
      const fullList = list.join(' ; ') + (rest > 0 ? ` ; ${t('alexa.query.tasks.more', { n: rest })}` : '')
      return finish(h, api, singleDay
        ? t('alexa.query.meals.listOn', { day: capitalizeFirst(dayLabel(api, period.start)), list: fullList })
        : t('alexa.query.meals.list', { list: fullList }))
    }
  }

  // « le dentiste à 15 heures pour Paul »
  const describeEvent = (event) => {
    let text = event.time ? t('alexa.query.events.at', { title: event.title, time: spokenTime(t, event.time) }) : event.title
    if (event.members.length > 0) text += ` ${t('alexa.query.tasks.for', { name: joinList(t, event.members) })}`
    return text
  }

  // « Quels sont les événements à venir ? », « Qu'est-ce qu'il y a dans l'agenda demain ? »
  const EventsHandler = {
    canHandle: isIntent('EventsIntent'),
    async handle (h) {
      const dateValue = readSlot(h, 'date').value
      const today = api.today()
      // Sans date : les deux prochaines semaines
      const period = dateValue ? parseAlexaPeriod(dateValue) : { start: today, end: addDays(today, 13) }
      if (!period) return elicit(h, 'date', t('alexa.askPreciseDay'))
      const events = await api.upcomingEvents(period)
      const singleDay = period.start === period.end

      if (events.length === 0) {
        if (singleDay) return finish(h, api, t('alexa.query.events.noneOn', { day: dayLabel(api, period.start) }))
        return finish(h, api, dateValue
          ? t('alexa.query.events.nonePeriod', { start: readableDate(t, period.start), end: readableDate(t, period.end) })
          : t('alexa.query.events.noneSoon'))
      }
      const shown = events.slice(0, 8)
      // Regroupés par jour : « aujourd'hui, le dentiste à 15 heures et l'anniversaire de Léa »
      const byDay = new Map()
      for (const e of shown) byDay.set(e.date, [...(byDay.get(e.date) || []), describeEvent(e)])
      const list = singleDay
        ? shown.map(describeEvent)
        : [...byDay].map(([date, items]) => `${dayLabel(api, date)}, ${joinList(t, items)}`)
      const rest = events.length - shown.length
      const fullList = list.join(' ; ') + (rest > 0 ? ` ; ${t('alexa.query.tasks.more', { n: rest })}` : '')
      return finish(h, api, singleDay
        ? t('alexa.query.events.listOn', { day: capitalizeFirst(dayLabel(api, period.start)), list: fullList, n: events.length })
        : t('alexa.query.events.list', { list: fullList, n: events.length }))
    }
  }

  // Récapitulatif d'une journée : événements, puis pour chaque repas qui est là, qui n'est pas là
  // et ce qu'on mange
  const DaySummaryHandler = {
    canHandle: isIntent('DaySummaryIntent'),
    async handle (h) {
      const { date, invalid } = optionalDate(h, api)
      if (invalid) return elicit(h, 'date', t('alexa.askPreciseDay'))
      const day = dayLabel(api, date)
      const [events, meals, members] = await Promise.all([
        api.upcomingEvents({ start: date, end: date }),
        api.plannedMeals({ start: date, end: date }),
        api.members()
      ])
      const firstNames = new Map(members.map(m => [m.id, m.firstName]))
      const sentences = [events.length > 0
        ? t('alexa.query.summary.events', { day: capitalizeFirst(day), list: events.map(describeEvent).join(' ; '), n: events.length })
        : t('alexa.query.summary.noEvents', { day: capitalizeFirst(day) })]

      for (const slot of ['lunch', 'dinner']) {
        const presence = await api.whoIsHome({ date, slot })
        const when = capitalizeFirst(slotMoment(api, date, slot))
        const presentIds = new Set(presence.presentMembers.map(m => m.id))
        const present = presence.presentMembers.map(m => firstNames.get(m.id) || m.name)
        const guests = presence.guests.map(g => g.name)
        const absent = members.filter(m => !presentIds.has(m.id)).map(m => m.firstName)
        if (present.length + guests.length === 0) {
          sentences.push(t('alexa.query.who.nobody', { when }))
        } else {
          const names = guests.length > 0
            ? t('alexa.query.who.withGuests', { members: joinList(t, present), guests: joinList(t, guests), n: guests.length })
            : joinList(t, present)
          sentences.push(t('alexa.query.who.result', { when, names, n: presence.headcount }))
          if (absent.length > 0) sentences.push(t('alexa.query.summary.absent', { names: joinList(t, absent), n: absent.length }))
        }
        const dishes = meals.filter(m => m.slot === slot).map(m => m.dish)
        sentences.push(dishes.length > 0
          ? t('alexa.query.summary.menu', { dish: joinList(t, dishes) })
          : t('alexa.query.summary.noMenu'))
      }
      return finish(h, api, sentences.join(' '))
    }
  }

  const HelpHandler = {
    canHandle: isIntent('AMAZON.HelpIntent'),
    handle: (h) => h.responseBuilder.speak(t('alexa.help')).reprompt(t('alexa.reprompt')).getResponse()
  }

  const StopHandler = {
    canHandle: isIntent('AMAZON.CancelIntent', 'AMAZON.StopIntent', 'AMAZON.NoIntent', 'AMAZON.NavigateHomeIntent'),
    handle: (h) => h.responseBuilder.speak(t('alexa.goodbye')).withShouldEndSession(true).getResponse()
  }

  const FallbackHandler = {
    canHandle: isIntent('AMAZON.FallbackIntent', 'AMAZON.YesIntent'),
    handle: (h) => h.responseBuilder.speak(t('alexa.notUnderstood')).reprompt(t('alexa.reprompt')).getResponse()
  }

  const SessionEndedHandler = {
    canHandle: (h) => Alexa.getRequestType(h.requestEnvelope) === 'SessionEndedRequest',
    handle: (h) => h.responseBuilder.getResponse()
  }

  const ErrorHandler = {
    canHandle: () => true,
    handle (h, error) {
      console.error('[Alexa] Erreur de traitement :', error.message)
      return h.responseBuilder.speak(t('alexa.error')).withShouldEndSession(true).getResponse()
    }
  }

  return {
    requestHandlers: [
      LaunchHandler, AddEventHandler, AddShoppingHandler, AddMealHandler,
      presenceHandler('AbsenceIntent', 'absence'),
      presenceHandler('AbsenceNightIntent', 'absence', 'NIGHT'),
      presenceHandler('PresenceIntent', 'presence'),
      presenceHandler('PresenceNightIntent', 'presence', 'NIGHT'),
      AddGuestHandler,
      whoIsHomeHandler('WhoIsHomeIntent'), whoIsHomeHandler('WhoSleepsIntent', 'NIGHT'), TasksHandler, MealsHandler, EventsHandler, DaySummaryHandler,
      HelpHandler, StopHandler, FallbackHandler, SessionEndedHandler
    ],
    errorHandler: ErrorHandler
  }
}

// Skill ASK construite pour une requête (famille et langue déjà résolues dans `api`)
export const buildSkill = (api) => {
  const { requestHandlers, errorHandler } = buildHandlers(api)
  return Alexa.SkillBuilders.custom()
    .addRequestHandlers(...requestHandlers)
    .addErrorHandlers(errorHandler)
    .create()
}
