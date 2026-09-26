// Interprétation des valeurs envoyées par Alexa (dates, heures, créneaux, listes dictées, prénoms).
// Fonctions pures, sans accès à la base : testables isolément.

// Date du jour (AAAA-MM-JJ) dans le fuseau de la famille — même réglage que le récapitulatif.
export const todayStr = (timezone = process.env.DIGEST_TIMEZONE || 'Europe/Paris', now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const lookup = Object.fromEntries(parts.map(p => [p.type, p.value]))
  return `${lookup.year}-${lookup.month}-${lookup.day}`
}

// AMAZON.DATE : on n'accepte qu'un jour précis (« 2026-10-02 »). Les semaines (« 2026-W40 »),
// week-ends, mois ou saisons sont trop vagues pour un agenda : l'appelant redemandera le jour.
export const parseAlexaDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim())
  if (!match) return null
  const [, y, m, d] = match.map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? match[0] : null
}

// AMAZON.TIME : « 15:00 » ; les moments vagues (MO, AF, EV, NI) sont ignorés.
export const parseAlexaTime = (value) => {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || '').trim())
  if (!match) return null
  return Number(match[1]) < 24 && Number(match[2]) < 60 ? match[0] : null
}

const normalize = (s) => String(s ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9' -]/g, ' ').replace(/\s+/g, ' ').trim()

// Créneau d'un repas / d'une présence : identifiant de la valeur du modèle (LUNCH, DINNER, NIGHT,
// ALL_DAY) quand Alexa l'a résolue, sinon le mot entendu.
const SLOT_WORDS = {
  LUNCH: ['midi', 'ce midi', 'le midi', 'dejeuner', 'au dejeuner', 'lunch', 'noon', 'comida', 'almuerzo', 'mediodia'],
  DINNER: ['soir', 'ce soir', 'le soir', 'diner', 'au diner', 'dinner', 'tonight', 'evening', 'cena', 'esta noche'],
  NIGHT: ['nuit', 'la nuit', 'cette nuit', 'dormir', 'night', 'sleep', 'noche', 'dormir'],
  ALL_DAY: ['toute la journee', 'la journee', 'journee', 'all day', 'todo el dia']
}
export const parseMealSlot = (id, word) => {
  if (id && SLOT_WORDS[id]) return id
  const w = normalize(word)
  if (!w) return null
  for (const [key, words] of Object.entries(SLOT_WORDS)) {
    if (words.includes(w)) return key
  }
  return null
}

// Créneaux lunch/dinner/night cochés à partir d'une liste de créneaux (ALL_DAY = les trois)
export const slotsToFlags = (slots) => {
  const all = slots.includes('ALL_DAY')
  return {
    lunch: all || slots.includes('LUNCH'),
    dinner: all || slots.includes('DINNER'),
    night: all || slots.includes('NIGHT')
  }
}

// « du lait, des œufs et du pain » -> ['du lait', 'des œufs', 'du pain']
export const splitSpokenList = (text) => String(text || '')
  .split(/\s*,\s*|\s+(?:et|puis|plus|and|y)\s+/i)
  .map(s => s.trim())
  .filter(Boolean)

const NUMBER_WORDS = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, douze: 12,
  one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10, twelve: 12,
  uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, doce: 12
}
// Article en tête (suivi d'une espace, ou élidé : « l' », « d' ») — jamais le début d'un mot (« lait »)
const ARTICLES = /^(?:de l'|d'|l'|(?:du|de la|des|de|le|la|les|some|the|a|an|el|los|las|unos|unas)\s+)/i

const UNIT = /^((?:kilo|kilogramme|kg|gramme|g|litre|l|paquet|boîte|boite|bouteille|pack|sachet|pot|barquette|tranche|kilo|pound|pack|bottle|can|box|kilo|paquete|botella|lata|caja)s?)\s+(?:de\s+|d'|of\s+)?(.+)$/i

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

// « deux baguettes » -> { name: 'Baguettes', quantity: 2 } ; « du lait » -> { name: 'Lait', quantity: 1 }
export const parseShoppingEntry = (text) => {
  let rest = String(text || '').trim()
  let quantity = 1
  const numberMatch = /^(\d+)\s+(.*)$/.exec(rest)
  if (numberMatch) {
    quantity = Number(numberMatch[1]) || 1
    rest = numberMatch[2]
  } else {
    const [first, ...others] = rest.split(/\s+/)
    const n = NUMBER_WORDS[normalize(first)]
    // « une » / « un » seuls sont des articles : quantité 1, on les retire simplement
    if (n && others.length > 0) {
      quantity = n
      rest = others.join(' ')
    }
  }
  // « 3 kilos de pommes » -> « Pommes (3 kilos) » : la quantité porte sur l'unité, pas sur l'article
  const unitMatch = UNIT.exec(rest)
  if (unitMatch && quantity > 0) {
    const name = unitMatch[2].replace(ARTICLES, '').trim()
    if (name) return { name: `${capitalize(name)} (${quantity} ${unitMatch[1]})`, quantity: 1 }
  }
  rest = rest.replace(ARTICLES, '').trim()
  return rest ? { name: capitalize(rest), quantity } : null
}

// « Mamie et Papi », « les Dupont » -> ['Mamie', 'Papi'], ['Les Dupont']
export const parseGuestNames = (text) => splitSpokenList(text).map(capitalize)

// Distance d'édition (tolérance aux petites erreurs de reconnaissance vocale sur les prénoms)
const levenshtein = (a, b) => {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return dp[a.length][b.length]
}

// Membre de la famille désigné par le prénom entendu : { member } si un seul correspond,
// { candidates } si plusieurs, {} si aucun. Le prénom exact prime sur l'approximation.
export const matchMember = (members, spoken, resolvedId = null) => {
  if (resolvedId != null) {
    const byId = members.find(m => String(m.id) === String(resolvedId))
    if (byId) return { member: byId }
  }
  const query = normalize(spoken)
  if (!query) return {}
  const pick = (list) => (list.length === 1 ? { member: list[0] } : list.length > 1 ? { candidates: list } : null)

  const exact = members.filter(m => normalize(m.firstName) === query || normalize(m.name) === query)
  const prefix = members.filter(m => normalize(m.firstName).startsWith(query) || query.startsWith(normalize(m.firstName)))
  const tolerance = query.length >= 7 ? 2 : query.length >= 4 ? 1 : 0
  const close = members.filter(m => levenshtein(normalize(m.firstName), query) <= tolerance)
  return pick(exact) || pick(prefix) || pick(close) || {}
}
