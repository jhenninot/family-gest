// Repli « langage naturel » de l'assistant vocal de l'application. Quand les phrases du modèle
// Alexa (nlu.js) ne comprennent rien, la phrase dite est envoyée à un petit modèle de Mistral
// (hébergé dans l'UE) qui choisit UNE intention de la liste et en extrait les valeurs. Il ne
// répond jamais à la personne : l'intention et les valeurs repassent par nlu.fromAi (mêmes
// conversions, mêmes vérifications) puis par les dialogues de la skill, qui lisent les vraies
// données et posent leurs questions habituelles (dont « noter l'absence au repas ? »).
//
// Données envoyées : la phrase (300 caractères), la date du jour et la liste des actions. Jamais
// l'agenda, les tâches, ni les prénoms de la famille (le prénom dit est résolu côté serveur).
const API = 'https://api.mistral.ai/v1/chat/completions'
export const DEFAULT_MODEL = 'ministral-8b-latest'
export class VoiceAiError extends Error {
  constructor (code, message) {
    super(message)
    this.code = code
  }
}

// Actions proposées au modèle. group : réglage de la famille qui les autorise (null = toujours).
export const AI_INTENTS = {
  AddEventIntent: { group: 'agenda', hint: 'ajouter un événement ou un rendez-vous à l\'agenda (titre, jour, heure de début et de fin, personnes concernées ; "endDate" pour un événement sur plusieurs jours)' },
  EventsIntent: { group: 'agenda', hint: 'lire les événements ou rendez-vous de l\'agenda' },
  DaySummaryIntent: { group: 'agenda', hint: 'récapitulatif d\'un jour : agenda, présents, menu' },
  TasksIntent: { group: 'tasks', hint: 'lire les tâches à faire (de la personne qui parle ou de quelqu\'un)' },
  AddShoppingIntent: { group: null, hint: 'ajouter des articles à la liste de courses ("items" = les articles tels que dits)' },
  AddMealIntent: { group: null, hint: 'prévoir un plat au menu d\'un repas' },
  AbsenceIntent: { group: null, hint: 'noter qu\'une personne ne mange pas à la maison à un repas (jusqu\'à trois personnes)' },
  AbsenceNightIntent: { group: null, hint: 'noter qu\'une personne ne dort pas à la maison' },
  PresenceIntent: { group: null, hint: 'noter qu\'une personne sera là à un repas' },
  PresenceNightIntent: { group: null, hint: 'noter qu\'une personne dormira à la maison' },
  AddGuestIntent: { group: null, hint: 'ajouter des invités à un repas' },
  WhoIsHomeIntent: { group: null, hint: 'demander qui est là à un repas' },
  WhoIsAbsentIntent: { group: null, hint: 'demander qui est absent' },
  WhoSleepsIntent: { group: null, hint: 'demander qui dort à la maison' },
  AbsencesQueryIntent: { group: null, hint: 'lister les absences de la famille ou d\'une personne' },
  MyAbsencesQueryIntent: { group: null, hint: 'lister les absences de la personne qui parle' },
  MealsIntent: { group: null, hint: 'demander ce qu\'on mange (menu)' }
}

// Actions permises par les réglages de la famille
export const allowedIntentNames = (config) => Object.entries(AI_INTENTS)
  .filter(([, { group }]) => !group || (group === 'agenda' && config.allowAgenda) || (group === 'tasks' && config.allowPrivateTasks))
  .map(([name]) => name)

const SLOT_HINTS = {
  'AMAZON.DATE': 'date AAAA-MM-JJ si c\'est un jour précis, sinon les mots dits (« cette semaine », « ce week-end »)',
  'AMAZON.TIME': 'heure HH:MM sur 24 h',
  MealSlot: 'midi, soir, nuit ou toute la journée',
  MemberName: 'prénom tel que dit',
  EventTitle: 'texte tel que dit',
  ShoppingItems: 'articles tels que dits',
  DishName: 'plat tel que dit',
  GuestNames: 'invités tels que dits',
  'AMAZON.SearchQuery': 'texte tel que dit'
}

const buildPrompt = (catalog, today, weekday) => {
  const lines = catalog.map(({ name, slots }) => {
    const slotText = slots.map(s => `${s.name} (${SLOT_HINTS[s.type] || 'texte'})`).join(' ; ')
    return `- ${name} : ${AI_INTENTS[name].hint}${slotText ? `. Valeurs : ${slotText}` : ''}`
  })
  return `Tu aides à utiliser une application familiale par la voix. L'utilisateur a dit une phrase (parfois mal reconnue). Aujourd'hui nous sommes ${weekday} ${today}.
Choisis l'action qui correspond et extrais les valeurs dites. N'invente rien : omets une valeur qui n'a pas été dite.
Actions :
${lines.join('\n')}
Réponds uniquement en JSON : {"intent":"NomExact","slots":{"nom":"valeur"}}. Si aucune action ne correspond : {"intent":null}.`
}

async function callMistral (apiKey, model, messages, maxTokens = 200) {
  let response
  try {
    response = await fetch(API, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 0, max_tokens: maxTokens, response_format: { type: 'json_object' } }),
      signal: AbortSignal.timeout(8000)
    })
  } catch {
    throw new VoiceAiError('unreachable', 'Mistral injoignable')
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) throw new VoiceAiError('keyRejected', 'Clé refusée')
    if (response.status === 429) throw new VoiceAiError('rateLimited', 'Limite atteinte')
    throw new VoiceAiError('refused', `Erreur ${response.status}`)
  }
  return data.choices?.[0]?.message?.content ?? ''
}

// Vérifie une clé avec un appel minuscule (avant de l'enregistrer)
export const verifyKey = async (apiKey, model = DEFAULT_MODEL) => {
  await callMistral(apiKey, model, [{ role: 'user', content: 'Réponds {"ok":true} en JSON.' }], 20)
}

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

// Intention et valeurs brutes pour une phrase, ou null (rien de reconnu, appel échoué : le
// dialogue répond alors « je n'ai pas compris »). onError reçoit les échecs d'appel.
export const guessIntent = async ({ apiKey, model, text, today, catalog, onError }) => {
  if (!catalog.length) return null
  const weekday = WEEKDAYS[new Date(`${today}T12:00:00Z`).getUTCDay()]
  try {
    const raw = await callMistral(apiKey, model, [
      { role: 'system', content: buildPrompt(catalog, today, weekday) },
      { role: 'user', content: String(text).slice(0, 300) }
    ])
    const parsed = JSON.parse(raw)
    const entry = catalog.find(c => c.name === parsed?.intent)
    if (!entry) return null
    const slots = {}
    for (const slot of entry.slots) {
      const value = parsed.slots?.[slot.name]
      if (typeof value === 'string' && value.trim()) slots[slot.name] = value.trim().slice(0, 120)
    }
    return { intent: entry.name, slots }
  } catch (err) {
    onError?.(err instanceof VoiceAiError ? err : new VoiceAiError('invalid', 'Réponse inutilisable'))
    return null
  }
}

export const keyPreview = (apiKey) => `…${String(apiKey).slice(-4)}`
