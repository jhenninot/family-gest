import { buildInteractionModel, expand } from '../alexa/interactionModel.js'
import { DATE_SOURCE, TODAY_PART_SOURCE, DAY_NUM, TIME_SOURCE, parseFrenchDate, parseFrenchTime, dayBeforeEnd } from './frenchTime.js'

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
    else if (/[-–—_]/.test(c) || /\s/.test(c)) n = ' ' // dont les espaces insécables de la dictée (« 11 h »)
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
// Phrases à la première personne, propres à l'application où l'on sait qui parle : le « prénom »
// capté (« je ») est remplacé par celui de l'interlocuteur (matchMemberOrSelf, server/alexa/handlers.js)
const SELF_SAMPLES = {
  AbsenceIntent: expand([
    '{member} ne serai pas là [pour] [le] {slotOne} [et {slotTwo}] [{date}]',
    '{member} ne serai pas là [{date}] [pour] [le] {slotOne} [et {slotTwo}]',
    '{member} ne serai pas là [pour] [le] {slotOne} {date} [{slotTwo}]',
    '{member} ne serai pas là {date}',
    '{member} ne rentrerai pas [{date}] [le] {slotOne}',
    '{member} ne mangerai pas à la maison [{date}] [le] {slotOne}'
  ]),
  AbsenceNightIntent: expand(['{member} ne dormirai pas à la maison [{date}]', '{member} dormirai ailleurs [{date}]']),
  PresenceIntent: expand([
    '{member} serai là [pour] [le] {slotOne} [et {slotTwo}] [{date}]',
    '{member} serai là [{date}] [pour] [le] {slotOne} [et {slotTwo}]',
    '{member} serai là {date}'
  ]),
  PresenceNightIntent: expand(['{member} dormirai à la maison [{date}]'])
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
    for (const [index, part] of parts.entries()) {
      const slot = /^\{(\w+)\}$/.exec(part)
      if (slot) {
        const type = slotTypes[intentName]?.[slot[1]] || 'AMAZON.SearchQuery'
        // « du 20 au 27 octobre » : le premier jour peut être un simple numéro (mois du dernier jour)
        const dayOnly = type === 'AMAZON.DATE' && /^\s*(?:au|jusqu'au)\s*$/.test(parts[index + 1] || '') && parts[index + 2] === '{endDate}'
        slots.push({ name: slot[1], type, dayOnly })
        const dateSource = intentName === 'AddEventIntent' ? `${DATE_SOURCE}|${TODAY_PART_SOURCE}` : DATE_SOURCE
        source += `(?<${slot[1]}>${dayOnly ? `${dateSource}|${DAY_NUM}` : type === 'AMAZON.DATE' ? dateSource : slotSource(type)})`
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
    const samples = new Set([...(intent.samples || []), ...(BUILTIN_SAMPLES[intent.name] || []), ...(SELF_SAMPLES[intent.name] || [])])
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
    if (type === 'MealSlot') return { value, id: valueIds[type].get(key) || null }
    if (type === 'MemberName') {
      const id = valueIds.MemberName.get(key) || null
      // Prénom inconnu commençant par un article (« la semaine », « le soir ») : ce n'est pas un
      // prénom, on laisse une autre lecture de la phrase (date, créneau) l'emporter
      if (!id && /^(?:la|le|les|l'|du|de|des|ce|cette|un|une)(?:\s|$)/.test(key)) return null
      return { value, id }
    }
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
      const endRange = m.indices.groups?.endDate
      const endValue = endRange ? slotValue('AMAZON.DATE', '', normalized.slice(endRange[0], endRange[1]), today)?.value : null
      for (const { name, type, dayOnly } of pattern.slots) {
        const range = m.indices.groups?.[name]
        if (!range) continue
        const dayOnlyValue = dayOnly ? dayBeforeEnd(normalized.slice(range[0], range[1]), endValue) : null
        const value = dayOnlyValue ? { value: dayOnlyValue } : slotValue(type, text.slice(range[0], range[1]), normalized.slice(range[0], range[1]), today)
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
      if (slot.type === 'AMAZON.TIME') {
        ['vers {s}', '{s} pile', 'à {s} pile', 'aux alentours de {s}'].forEach(f => samples.add(f.replace('{s}', `{${slotName}}`)))
        // Début et fin dits d'un coup en réponse à l'heure de début
        if (slotName === 'time' && slotTypes[intentName]?.endTime) ['de {time} à {endTime}', 'de {time} jusqu\'à {endTime}', 'entre {time} et {endTime}'].forEach(f => samples.add(f))
      }
      answerCache.set(key, [...samples].map(sample => compile(intentName, sample)))
    }
    const found = bestMatch(answerCache.get(key), text, today)
    // Tous les créneaux reconnus (le demandé, plus éventuellement l'heure de fin), ou null
    return found?.slots?.[slotName] ? found.slots : null
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

  // Repli IA (server/voice/ai.js) : actions proposées au modèle avec leurs créneaux, puis conversion
  // de ce qu'il renvoie. Les valeurs passent par les mêmes conversions que la phrase dite : un
  // prénom ou un créneau que le modèle invente ne devient jamais une donnée sans vérification.
  const aiCatalog = (names) => intents
    .filter(i => names.includes(i.name))
    .map(i => ({ name: i.name, slots: (i.slots || []).map(s => ({ name: s.name, type: s.type })) }))

  const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
  const ISO_TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/
  const aiSlotValue = (type, raw, today) => {
    const text = String(raw).trim()
    if (type === 'AMAZON.DATE') {
      const iso = ISO_DATE.exec(text)
      if (iso) {
        const d = new Date(`${text}T12:00:00Z`)
        return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(text) ? { value: text } : null
      }
    }
    if (type === 'AMAZON.TIME') {
      const t = ISO_TIME.exec(text)
      if (t) return { value: `${t[1].padStart(2, '0')}:${t[2]}` }
    }
    return slotValue(type, text, normalizeChars(text), today)
  }

  const fromAi = (intentName, rawSlots, today) => {
    if (!slotTypes[intentName]) return null
    const slots = {}
    for (const [name, raw] of Object.entries(rawSlots || {})) {
      const type = slotTypes[intentName][name]
      if (!type || typeof raw !== 'string' || !raw.trim()) continue
      const value = aiSlotValue(type, raw, today)
      if (value) slots[name] = value
    }
    return { intent: intentName, slots }
  }

  return { match, matchControl, matchSlotAnswer, missingRequired, delegation, aiCatalog, fromAi, slotNames: (intentName) => Object.keys(slotTypes[intentName] || {}) }
}
