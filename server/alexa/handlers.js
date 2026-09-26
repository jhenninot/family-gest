import Alexa from 'ask-sdk-core'
import { readableDate } from '../i18n/index.js'
import { parseAlexaDate, parseAlexaTime, parseMealSlot, slotsToFlags, splitSpokenList, parseShoppingEntry, parseGuestNames, matchMember } from './parsing.js'

// Dialogue de la skill Alexa. Toutes les écritures passent par `api` (voir actions.js), ce qui
// permet de tester ces gestionnaires sans base de données.
//
// api = { t, today(), members(), addEvent(), addShoppingItems(), addMeal(), declarePresence(), addGuests() }

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
      AddGuestHandler, HelpHandler, StopHandler, FallbackHandler, SessionEndedHandler
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
