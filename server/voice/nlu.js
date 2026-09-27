import { buildInteractionModel } from '../alexa/interactionModel.js'
import { DATE_SOURCE, TIME_SOURCE, parseFrenchDate, parseFrenchTime } from './frenchTime.js'

// Compréhension des commandes vocales de l'application, sans IA : les phrases du modèle de
// dialogue de la skill Alexa (server/alexa/interactionModel.js) deviennent des expressions
// régulières, et les valeurs dites (dates, heures, créneaux, prénoms) sont converties au format
// qu'Alexa enverrait. La requête obtenue passe ensuite par les mêmes dialogues que la skill.
//
// Les phrases et le texte dicté sont comparés sous une forme normalisée de même longueur
// (minuscules, sans accents, ponctuation et tirets en espaces) : les positions trouvées dans le
// texte normalisé désignent les mêmes caractères dans le texte d'origine, dont on garde les accents.

export const normalizeChars = (text) => {
  let out = ''
  for (const c of String(text)) {
    let n = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    if (c === '’' || c === '`' || c === 'ʼ') n = "'"
    else if (/[-–—_]/.test(c)) n = ' '
    else if (/[.,!?;«»"()…]/.test(c)) n = ' '
    // Un caractère d'origine donne exactement un caractère (ou deux pour ceux hors BMP, inchangés)
    if (n.length !== c.length) n = c.length === 2 ? c : (n[0] || ' ')
    out += n
  }
  return out
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Partie littérale d'une phrase : espaces souples, apostrophes tolérantes (« l'agenda », « l agenda »)
const literalSource = (text) => escapeRegex(text)
  .replace(/\s+/g, '\\s+')
  .replace(/'/g, "\\s*'?\\s*")

const FREE_TEXT = '.+?'
const STRUCTURED = new Set(['AMAZON.DATE', 'AMAZON.TIME', 'MealSlot', 'MemberName'])

// Réponses courtes propres à l'application (Alexa les comprend sans qu'on les liste)
const BUILTIN_SAMPLES = {
  'AMAZON.YesIntent': ['oui', 'ouais', 'oui oui', 'ok', 'okay', 'exactement', "c'est ça", 'volontiers', 'bien sûr', 'oui merci', "d'accord", 'vas-y', 'oui vas-y', 'go'],
  'AMAZON.NoIntent': ['non', 'non merci', 'pas besoin', 'non pas besoin', 'surtout pas', "c'est tout", 'rien', "c'est bon", 'non c\'est bon', 'ça ira'],
  'AMAZON.StopIntent': ['stop', 'arrête', 'annule', 'laisse tomber', 'au revoir', 'termine', 'ferme', 'oublie', 'annuler'],
  'AMAZON.HelpIntent': ['aide', 'de l\'aide', 'aide-moi', 'que puis-je dire', "qu'est-ce que je peux dire", 'exemples', 'des exemples', "qu'est-ce que tu sais faire", 'que sais-tu faire']
}
const CONTROL_INTENTS = new Set(['AMAZON.YesIntent', 'AMAZON.NoIntent', 'AMAZON.StopIntent', 'AMAZON.CancelIntent', 'AMAZON.HelpIntent', 'EventSkipIntent'])

export const buildNlu = ({ members = [] } = {}) => {
  const model = buildInteractionModel({ members }).interactionModel
  const { intents, types } = model.languageModel

  // Valeurs des types à liste (créneaux, prénoms) : forme normalisée -> identifiant
  const valueIds = {}
  for (const type of types) {
    if (!['MealSlot', 'MemberName'].includes(type.name)) continue
    const map = new Map()
    for (const v of type.values) {
      for (const word of [v.name.value, ...(v.name.synonyms || [])]) map.set(normalizeChars(word).trim(), v.id || null)
    }
    valueIds[type.name] = map
  }
  // Prénoms et noms complets de la famille, reconnus même s'ils ont été ajoutés après le modèle
  for (const m of members) {
    for (const word of [m.firstName, m.name].filter(Boolean)) valueIds.MemberName.set(normalizeChars(word).trim(), String(m.id))
  }

  const alternation = (words) => [...words].filter(Boolean).sort((a, b) => b.length - a.length).map(literalSource).join('|')
  const slotSource = (type) => {
    if (type === 'AMAZON.DATE') return DATE_SOURCE
    if (type === 'AMAZON.TIME') return TIME_SOURCE
    if (type === 'MealSlot') return alternation(valueIds.MealSlot.keys())
    // Prénom connu, ou un à deux mots (le dialogue signalera un prénom inconnu)
    if (type === 'MemberName') return `${alternation(valueIds.MemberName.keys())}|[a-z][a-z']*(?:\\s+[a-z][a-z']*)?`
    return FREE_TEXT
  }

  const slotTypes = Object.fromEntries(intents.map(i => [i.name, Object.fromEntries((i.slots || []).map(s => [s.name, s.type]))]))

  // Phrase « ajoute {title} {date} à {time} » -> expression régulière à groupes nommés
  const compile = (intentName, sample) => {
    // Les noms de créneaux ({mealSlot}) gardent leur casse : seul le texte fixe est normalisé
    const parts = sample.trim().split(/(\{\w+\})/)
    let source = ''
    let literalLength = 0
    const slots = []
    const words = []
    for (const part of parts) {
      const slot = /^\{(\w+)\}$/.exec(part)
      if (slot) {
        const type = slotTypes[intentName]?.[slot[1]] || 'AMAZON.SearchQuery'
        slots.push({ name: slot[1], type })
        source += `(?<${slot[1]}>${slotSource(type)})`
      } else if (part) {
        const literal = normalizeChars(part)
        literalLength += literal.replace(/\s+/g, '').length
        source += literalSource(literal)
        words.push(...literal.split(/[\s']+/).filter(w => w.length >= 3))
      }
    }
    // Pré-filtre : les mots fixes doivent tous figurer dans la phrase avant de tenter l'expression
    return { intent: intentName, regex: new RegExp(`^\\s*${source}\\s*$`, 'd'), slots, literalLength, words }
  }

  const patterns = []
  const controlPatterns = []
  for (const intent of intents) {
    const samples = new Set([...(intent.samples || []), ...(BUILTIN_SAMPLES[intent.name] || [])])
    for (const sample of samples) {
      const pattern = compile(intent.name, sample)
      patterns.push(pattern)
      if (CONTROL_INTENTS.has(intent.name)) controlPatterns.push(pattern)
    }
  }

  // Valeur d'un créneau trouvé (au format Alexa), ou null si elle ne se convertit pas
  const slotValue = (type, original, normalized, today) => {
    const value = original.trim().replace(/^[\s,]+|[\s,]+$/g, '')
    const key = normalized.trim().replace(/\s+/g, ' ')
    if (type === 'AMAZON.DATE') {
      const date = parseFrenchDate(key, today)
      return date ? { value: date } : null
    }
    if (type === 'AMAZON.TIME') {
      const time = parseFrenchTime(key)
      return time ? { value: time } : null
    }
    if (type === 'MealSlot' || type === 'MemberName') return { value, id: valueIds[type].get(key) || null }
    return value ? { value } : null
  }

  // Essaie une liste de phrases compilées ; renvoie la meilleure correspondance
  const bestMatch = (list, text, today) => {
    const normalized = normalizeChars(text)
    let best = null
    for (const pattern of list) {
      if (!pattern.words.every(w => normalized.includes(w))) continue
      const m = pattern.regex.exec(normalized)
      if (!m) continue
      const slots = {}
      let structured = 0
      let freeLength = 0
      let valid = true
      for (const { name, type } of pattern.slots) {
        const range = m.indices.groups?.[name]
        if (!range) continue
        const value = slotValue(type, text.slice(range[0], range[1]), normalized.slice(range[0], range[1]), today)
        if (!value) { valid = false; break }
        slots[name] = value
        if (STRUCTURED.has(type)) structured += type === 'MemberName' && !value.id ? 0.5 : 1
        else freeLength += range[1] - range[0]
      }
      if (!valid) continue
      // Préférence : plus de mots fixes reconnus, plus de valeurs précises, moins de texte libre
      const score = pattern.literalLength * 2 + structured * 6 - freeLength * 0.05
      if (!best || score > best.score) best = { intent: pattern.intent, slots, score }
    }
    return best
  }

  const match = (text, today) => bestMatch(patterns, text, today)
  const matchControl = (text, today) => bestMatch(controlPatterns, text, today)

  // Réponse à une question sur un créneau précis (« Pour quel jour ? » -> « mardi »)
  const answerCache = new Map()
  const matchSlotAnswer = (intentName, slotName, text, today) => {
    const key = `${intentName}/${slotName}`
    if (!answerCache.has(key)) {
      const intent = intents.find(i => i.name === intentName)
      const slot = intent?.slots?.find(s => s.name === slotName)
      if (!slot) return null
      const samples = new Set([...(slot.samples || []), `{${slotName}}`, `le {${slotName}}`, `pour {${slotName}}`, `c'est {${slotName}}`, `à {${slotName}}`, `au {${slotName}}`])
      answerCache.set(key, [...samples].map(sample => compile(intentName, sample)))
    }
    const found = bestMatch(answerCache.get(key), text, today)
    return found?.slots?.[slotName] || null
  }

  // Questions obligatoires posées par Alexa elle-même (délégation du dialogue) : on les reproduit
  const dialogIntents = new Map((model.dialog?.intents || []).map(i => [i.name, i]))
  const prompts = new Map((model.prompts || []).map(p => [p.id, p.variations[0]?.value || '']))
  const delegation = (intentName) => dialogIntents.get(intentName)?.delegationStrategy || null
  const missingRequired = (intentName, slots) => {
    const dialog = dialogIntents.get(intentName)
    if (!dialog || dialog.delegationStrategy !== 'ALWAYS') return null
    const slot = dialog.slots.find(s => s.elicitationRequired && !slots[s.name]?.value)
    return slot ? { slot: slot.name, prompt: prompts.get(slot.prompts.elicitation) || '' } : null
  }

  return { match, matchControl, matchSlotAnswer, missingRequired, delegation, slotNames: (intentName) => Object.keys(slotTypes[intentName] || {}) }
}
