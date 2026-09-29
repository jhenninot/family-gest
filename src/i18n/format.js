import { currentLocale } from './index.js'

// Formats régionaux utilisés pour les dates et les nombres de chaque langue de l'interface.
// L'anglais utilise le format britannique (jour avant le mois, heures sur 24 h).
const INTL_LOCALES = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES' }

export const intlLocale = () => INTL_LOCALES[currentLocale.value] || INTL_LOCALES.fr

const toDate = (value) => (value instanceof Date ? value : new Date(value))

export function formatDate(value, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(intlLocale(), options).format(date)
}

export function formatTime(value, options = { hour: '2-digit', minute: '2-digit' }) {
  return formatDate(value, options)
}

export function formatNumber(value, options) {
  return new Intl.NumberFormat(intlLocale(), options).format(value)
}

// Temps écoulé depuis une date, dans la langue de l'interface (« il y a 3 heures », « hier »…)
export function formatRelative(value, now = Date.now()) {
  const seconds = Math.round((new Date(value).getTime() - now) / 1000)
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
  const rtf = new Intl.RelativeTimeFormat(intlLocale(), { numeric: 'auto' })
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return rtf.format(0, 'minute')
}

const capitalize = (s) => s.charAt(0).toLocaleUpperCase(intlLocale()) + s.slice(1)

// Noms des jours, du lundi au dimanche (la semaine de l'application commence le lundi).
// style : 'long' (lundi), 'short' (lun.), 'narrow' (L)
export function weekdayNames(style = 'long', { capitalized = true } = {}) {
  const fmt = new Intl.DateTimeFormat(intlLocale(), { weekday: style, timeZone: 'UTC' })
  // 2024-01-01 était un lundi
  return Array.from({ length: 7 }, (_, i) => {
    const name = fmt.format(new Date(Date.UTC(2024, 0, 1 + i)))
    return capitalized ? capitalize(name) : name
  })
}

// Noms des mois, de janvier à décembre. style : 'long' (janvier), 'short' (janv.)
export function monthNames(style = 'long', { capitalized = false } = {}) {
  const fmt = new Intl.DateTimeFormat(intlLocale(), { month: style, timeZone: 'UTC' })
  return Array.from({ length: 12 }, (_, i) => {
    const name = fmt.format(new Date(Date.UTC(2024, i, 15)))
    return capitalized ? capitalize(name) : name
  })
}
