// Dates et heures dites en français, converties au format des créneaux Alexa (AMAZON.DATE,
// AMAZON.TIME) pour réutiliser tels quels les dialogues de la skill : « 2026-10-02 », semaine
// « 2026-W40 », week-end « 2026-W40-WE », heure « 15:30 ».
//
// Les expressions régulières travaillent sur un texte normalisé (voir normalizeChars dans nlu.js) :
// minuscules, sans accents, tirets remplacés par des espaces.

export const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
export const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']

const NUMBER_WORDS = {
  un: 1, une: 1, premier: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, 'dix sept': 17, 'dix huit': 18,
  'dix neuf': 19, vingt: 20, 'vingt et un': 21, 'vingt deux': 22, 'vingt trois': 23, 'vingt quatre': 24,
  'vingt cinq': 25, 'vingt six': 26, 'vingt sept': 27, 'vingt huit': 28, 'vingt neuf': 29, trente: 30,
  'trente et un': 31, 'trente cinq': 35, quarante: 40, 'quarante cinq': 45, cinquante: 50, 'cinquante cinq': 55
}
// Les plus longs d'abord, pour que « dix sept » passe avant « dix »
const NUMBER_ALT = Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length).join('|')

export const toNumber = (text) => {
  const t = String(text).trim().replace(/^(\d+)er$/, '$1')
  if (/^\d+$/.test(t)) return Number(t)
  return NUMBER_WORDS[t] ?? null
}

const W = WEEKDAYS.join('|')
const M = MONTHS.join('|')
const DAY_NUM = `(?:\\d{1,2}(?:er)?|${NUMBER_ALT})`
const WEEKEND = 'week ?end'

// --- Dates ---

export const DATE_SOURCE = [
  "aujourd'hui", 'apres demain', 'avant hier', 'demain', 'hier',
  `(?:(?:ce|le) )?(?:${W})(?: (?:prochain|qui vient))?(?: ${DAY_NUM}(?: (?:${M}))?(?: \\d{4})?)?`,
  `(?:le )?${DAY_NUM} (?:${M})(?: \\d{4})?`,
  `le ${DAY_NUM}`,
  'cette semaine', '(?:la )?semaine prochaine', '(?:la )?semaine d\'apres',
  `(?:ce )?${WEEKEND}(?: prochain)?`, `le ${WEEKEND}(?: prochain)?`, `(?:le )?${WEEKEND} prochain`,
  `dans (?:\\d+|${NUMBER_ALT}) (?:jours?|semaines?)`
].map(s => `(?:${s})`).join('|')

const pad = (n) => String(n).padStart(2, '0')
const toStr = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const fromStr = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const addDays = (s, n) => { const d = fromStr(s); d.setDate(d.getDate() + n); return toStr(d) }
const weekdayIndex = (s) => (fromStr(s).getDay() + 6) % 7

// Semaine ISO (lundi à dimanche) contenant une date : « 2026-W40 »
const isoWeek = (s) => {
  const date = fromStr(s)
  const thursday = new Date(date)
  thursday.setDate(date.getDate() - ((date.getDay() + 6) % 7) + 3)
  const firstThursday = new Date(thursday.getFullYear(), 0, 4)
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3)
  const week = 1 + Math.round((thursday - firstThursday) / (7 * 86400000))
  return `${thursday.getFullYear()}-W${pad(week)}`
}

const validDate = (y, m, d) => {
  const date = new Date(y, m - 1, d)
  return date.getMonth() === m - 1 && date.getDate() === d ? toStr(date) : null
}

// Texte normalisé déjà reconnu par DATE_SOURCE -> valeur AMAZON.DATE (ou null)
export const parseFrenchDate = (text, today) => {
  const t = String(text).trim().replace(/\s+/g, ' ')
  if (t === "aujourd'hui") return today
  if (t === 'demain') return addDays(today, 1)
  if (t === 'apres demain') return addDays(today, 2)
  if (t === 'hier') return addDays(today, -1)
  if (t === 'avant hier') return addDays(today, -2)
  if (t === 'cette semaine') return isoWeek(today)
  if (/semaine (prochaine|d'apres)/.test(t)) return isoWeek(addDays(today, 7))
  if (new RegExp(WEEKEND).test(t)) {
    // Le dimanche, « ce week-end » est celui du jour ; « prochain » passe au suivant
    return `${isoWeek(/prochain/.test(t) ? addDays(today, 7) : today)}-WE`
  }
  const dans = /^dans (\S+(?: \S+)*) (jours?|semaines?)$/.exec(t)
  if (dans) {
    const n = toNumber(dans[1])
    return n == null ? null : addDays(today, n * (dans[2].startsWith('semaine') ? 7 : 1))
  }

  const year = Number(/(\d{4})$/.exec(t)?.[1]) || null
  const monthName = MONTHS.find(m => new RegExp(`\\b${m}\\b`).test(t))
  const dayMatch = new RegExp(`(?:^|\\s)(${DAY_NUM})(?:\\s|$)`).exec(t.replace(/\d{4}$/, ''))
  const day = dayMatch ? toNumber(dayMatch[1]) : null
  const [ty, tm] = today.split('-').map(Number)

  if (monthName && day) {
    const m = MONTHS.indexOf(monthName) + 1
    if (year) return validDate(year, m, day)
    // Sans année : cette année, ou l'an prochain si la date est déjà passée depuis plus d'un mois
    const thisYear = validDate(ty, m, day)
    if (thisYear && thisYear < addDays(today, -31)) return validDate(ty + 1, m, day)
    return thisYear
  }
  if (day && !monthName) {
    // « le 12 » : ce mois-ci, ou le mois suivant si le jour est passé
    const thisMonth = validDate(ty, tm, day)
    if (thisMonth && thisMonth >= today) return thisMonth
    return tm === 12 ? validDate(ty + 1, 1, day) : validDate(ty, tm + 1, day)
  }
  const weekday = WEEKDAYS.find(w => new RegExp(`\\b${w}\\b`).test(t))
  if (weekday) {
    const target = WEEKDAYS.indexOf(weekday)
    let diff = (target - weekdayIndex(today) + 7) % 7
    // « mardi » : le prochain mardi (aujourd'hui compris) ; « mardi prochain » : jamais aujourd'hui
    if (diff === 0 && /prochain|qui vient/.test(t)) diff = 7
    return addDays(today, diff)
  }
  return null
}

// --- Heures ---

const HOUR = `(?:\\d{1,2}|${NUMBER_ALT})`
const MINUTES = `(?:\\d{1,2}|${NUMBER_ALT})`
const PERIOD = "(?: (?:du matin|de l'apres midi|du soir|de l'apres-midi))?"
export const TIME_SOURCE = [
  `${HOUR} ?(?:heures?|h)(?: ?(?:${MINUTES}|et demie?|et quart|moins le quart|moins ${MINUTES}))?${PERIOD}`,
  '\\d{1,2}:\\d{2}',
  'midi(?: et demie?| et quart| moins le quart)?',
  'minuit(?: et demie?| et quart)?'
].map(s => `(?:${s})`).join('|')

// Texte normalisé déjà reconnu par TIME_SOURCE -> « HH:MM » (ou null)
export const parseFrenchTime = (text) => {
  const full = String(text).trim().replace(/\s+/g, ' ')
  let t = full
  let hours = null
  let minutes = 0
  const colon = /^(\d{1,2}):(\d{2})$/.exec(t)
  if (colon) {
    hours = Number(colon[1])
    minutes = Number(colon[2])
    t = ''
  } else if (t.startsWith('midi') || t.startsWith('minuit')) {
    hours = t.startsWith('midi') ? 12 : 0
    t = t.replace(/^(midi|minuit)/, '')
  } else {
    const m = new RegExp(`^(${HOUR}) ?(?:heures?|h)(.*)$`).exec(t)
    if (!m) return null
    hours = toNumber(m[1])
    t = m[2]
  }
  if (hours == null) return null
  const rest = t.replace(/(du matin|de l'apres[ -]midi|du soir)/, '').trim()
  if (/^et demie?$/.test(rest)) minutes = 30
  else if (rest === 'et quart') minutes = 15
  else if (rest === 'moins le quart') { hours -= 1; minutes = 45 }
  else if (/^moins /.test(rest)) {
    const n = toNumber(rest.slice(6))
    if (n == null) return null
    hours -= 1
    minutes = 60 - n
  } else if (rest) {
    const n = toNumber(rest)
    if (n == null) return null
    minutes = n
  }
  if (/de l'apres[ -]midi|du soir/.test(full) && hours < 12) hours += 12
  if (hours < 0) hours += 24
  if (hours > 23 || minutes > 59) return null
  return `${pad(hours)}:${pad(minutes)}`
}
