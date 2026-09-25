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
