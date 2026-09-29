import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import User from '../models/User.js'
import { createAlexaApi } from '../alexa/actions.js'
import { buildSkill } from '../alexa/handlers.js'
import { todayStr } from '../alexa/parsing.js'
import { getFamilyMembersList } from '../mcp/resolveMember.js'
import { buildNlu } from './nlu.js'
import { recordChannelUsage } from '../stats/channels.js'

// Assistant vocal de l'application : POST /api/voice/command avec le texte dicté (reconnaissance
// vocale du navigateur). La phrase est comprise sans IA (voir nlu.js), puis traitée par les
// dialogues de la skill Alexa, à l'identique : mêmes questions, mêmes vérifications, mêmes
// enregistrements, au nom de l'utilisateur connecté.
//
// L'état de la conversation (attributs de session de la skill, question en attente) fait
// l'aller-retour avec l'application ; le serveur ne garde rien entre deux phrases.

const voiceRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' }
})

// Règles de compréhension par famille (elles contiennent les prénoms), refaites si les membres changent
const nluCache = new Map()
const getNlu = async (family) => {
  const members = await getFamilyMembersList(family._id)
  const key = crypto.createHash('sha1').update(JSON.stringify(members.map(m => [m.id, m.firstName, m.name]))).digest('hex')
  const cached = nluCache.get(String(family._id))
  if (cached?.key === key) return cached.nlu
  const nlu = buildNlu({ members })
  nluCache.set(String(family._id), { key, nlu })
  return nlu
}

// Créneau au format d'une requête Alexa (avec la résolution de valeur quand elle est connue)
const toSlot = (name, found) => ({
  name,
  confirmationStatus: 'NONE',
  ...(found?.value ? { value: found.value } : {}),
  ...(found?.id
    ? { resolutions: { resolutionsPerAuthority: [{ authority: 'voice', status: { code: 'ER_SUCCESS_MATCH' }, values: [{ value: { id: found.id, name: found.value } }] }] } }
    : {})
})

const buildIntent = (nlu, name, found = {}) => ({
  name,
  confirmationStatus: 'NONE',
  slots: Object.fromEntries(nlu.slotNames(name).map(slot => [slot, toSlot(slot, found[slot])]))
})

// Intention reçue de l'application (question en attente) : on n'en garde que la forme attendue
const sanitizeIntent = (nlu, intent) => {
  if (!intent || typeof intent.name !== 'string') return null
  const allowed = nlu.slotNames(intent.name)
  const found = {}
  for (const slot of allowed) {
    const s = intent.slots?.[slot]
    if (s?.value) found[slot] = { value: String(s.value).slice(0, 300), id: s.resolutions?.resolutionsPerAuthority?.[0]?.values?.[0]?.value?.id || null }
  }
  return buildIntent(nlu, intent.name, found)
}

const envelope = ({ intent, dialogState, attributes, isNew, lang }) => ({
  version: '1.0',
  session: { new: isNew, sessionId: 'voice', application: { applicationId: 'familygest-voice' }, attributes, user: { userId: 'voice' } },
  context: { System: { application: { applicationId: 'familygest-voice' }, user: { userId: 'voice' }, device: { deviceId: 'voice', supportedInterfaces: {} } } },
  request: {
    type: 'IntentRequest',
    requestId: `voice-${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    locale: lang === 'fr' ? 'fr-FR' : lang,
    ...(dialogState ? { dialogState } : {}),
    intent
  }
})

// Retire les suites de un à quatre mots dites deux fois de suite (hésitation de la dictée)
export const collapseRepeats = (text) => {
  const words = String(text).trim().split(/\s+/)
  const key = (w) => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9']/g, '')
  for (let n = 4; n >= 1; n--) {
    for (let i = 0; i + 2 * n <= words.length; i++) {
      const same = words.slice(i, i + n).every((w, k) => key(w) && key(w) === key(words[i + n + k]))
      if (same) {
        words.splice(i + n, n)
        i--
      }
    }
  }
  return words.join(' ')
}

const plainSpeech = (outputSpeech) => String(outputSpeech?.ssml || outputSpeech?.text || '').replace(/<[^>]+>/g, '').trim()

// Traite une phrase : compréhension, questions obligatoires, puis dialogue de la skill.
// Fonction sans accès direct à la base (api, nlu fournis) : testable isolément.
export const processVoiceCommand = async ({ text, session, pending, nlu, api, lang, today, t }) => {
  const attributes = session || {}

  // Question en attente : la phrase y répond (« mardi », « pour Paul »), sauf si c'est une
  // réponse de contrôle (« oui », « stop », « je ne sais pas ») ou une nouvelle demande complète
  let intent = null
  let answering = false
  const pendingIntent = pending?.intent ? sanitizeIntent(nlu, pending.intent) : null
  const control = nlu.matchControl(text, today)
  if (control) {
    intent = buildIntent(nlu, control.intent, control.slots)
  } else if (pendingIntent && pending.slot && nlu.slotNames(pendingIntent.name).includes(pending.slot)) {
    const answer = nlu.matchSlotAnswer(pendingIntent.name, pending.slot, text, today)
    if (answer) {
      intent = pendingIntent
      for (const [name, value] of Object.entries(answer)) intent.slots[name] = toSlot(name, value)
      answering = true
    }
  }
  if (!intent) {
    // Dictée qui bégaie (« les prochaines les prochaines absences ») : second essai sans la répétition
    const collapsed = collapseRepeats(text)
    const found = nlu.match(text, today) || (collapsed !== text ? nlu.match(collapsed, today) : null)
    if (found) {
      intent = buildIntent(nlu, found.intent, found.slots)
    } else if (pending?.prompt) {
      // Réponse incomprise : on repose la même question
      console.debug(`[Voice] Réponse non comprise (question en attente sur ${pending.slot || 'oui/non'})`)
      return {
        speech: `${t('messages.voiceNotUnderstood')} ${pending.prompt}`,
        ended: false,
        session: attributes,
        pending,
        changed: false
      }
    } else {
      console.debug('[Voice] Phrase non comprise')
      intent = buildIntent(nlu, 'AMAZON.FallbackIntent')
    }
  }

  // Informations obligatoires manquantes : Alexa les demanderait avant d'appeler la skill
  const missing = nlu.missingRequired(intent.name, intent.slots || {})
  if (missing) {
    return {
      speech: missing.prompt,
      ended: false,
      session: attributes,
      pending: { intent, slot: missing.slot, prompt: missing.prompt },
      changed: false
    }
  }

  const strategy = nlu.delegation(intent.name)
  const dialogState = strategy === 'SKILL_RESPONSE' ? (answering ? 'IN_PROGRESS' : 'STARTED') : strategy ? 'COMPLETED' : null

  // Les écritures sont signalées à l'application, qui recharge alors ses données
  let changed = false
  for (const [name, fn] of Object.entries(api)) {
    if (typeof fn === 'function' && /^(add|declare)/.test(name)) {
      api[name] = async (...args) => { changed = true; return fn.apply(api, args) }
    }
  }

  console.debug(`[Voice] ${intent.name}${dialogState ? ` (${dialogState})` : ''}, reçu ${Object.entries(intent.slots || {}).filter(([, v]) => v.value).map(([k]) => k).join(', ') || 'rien'}`)
  const result = await buildSkill(api).invoke(envelope({ intent, dialogState, attributes, isNew: Object.keys(attributes).length === 0, lang }))
  const response = result.response || {}
  const speech = plainSpeech(response.outputSpeech)
  const elicit = (response.directives || []).find(d => d.type === 'Dialog.ElicitSlot')
  const ended = response.shouldEndSession === true

  return {
    speech,
    ended,
    session: ended ? {} : (result.sessionAttributes || {}),
    pending: ended
      ? null
      : elicit
        ? { intent: elicit.updatedIntent || intent, slot: elicit.slotToElicit, prompt: plainSpeech(response.reprompt?.outputSpeech) || speech }
        : { intent: null, slot: null, prompt: plainSpeech(response.reprompt?.outputSpeech) || speech },
    changed
  }
}

export const mountVoiceAssistant = (app, ctx, { requireAuth, attachFamilyContext }) => {
  app.post('/api/voice/command', voiceRateLimiter, requireAuth, attachFamilyContext, async (req, res) => {
    try {
      const text = String(req.body?.text || '').trim().slice(0, 300)
      if (!text) return res.status(400).json({ error: req.t('errors.voiceEmpty') })
      recordChannelUsage(req.family._id, 'voice')
      const session = req.body?.session && typeof req.body.session === 'object' && JSON.stringify(req.body.session).length < 8000
        ? req.body.session
        : {}
      const pending = req.body?.pending && typeof req.body.pending === 'object' ? req.body.pending : null

      req.alexaActor = await User.findOne({ id: req.user.id }).select('-password')
      res.json(await processVoiceCommand({
        text,
        session,
        pending,
        nlu: await getNlu(req.family),
        api: createAlexaApi(req, ctx, req.lang, { channel: 'voice' }),
        lang: req.lang,
        today: todayStr(),
        t: req.t
      }))
    } catch (err) {
      console.error('[Voice] Erreur de traitement :', err.message)
      res.status(500).json({ error: req.t('errors.voiceFailed') })
    }
  })
}
