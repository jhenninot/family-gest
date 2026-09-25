import { createI18n } from 'vue-i18n'
import { ref } from 'vue'

// Langues de l'interface. Le français est la langue de référence et de secours : un texte absent
// d'une autre langue s'affiche en français, jamais vide.
export const SUPPORTED_LOCALES = ['fr', 'en', 'es']
export const DEFAULT_LOCALE = 'fr'
export const LOCALE_LABELS = { fr: 'Français', en: 'English', es: 'Español' }

// Tant que toutes les traductions ne sont pas terminées, l'interface reste en français pour tout
// le monde et le sélecteur de langue est masqué. Pour prévisualiser les autres langues sur un
// appareil : localStorage.setItem('familygest_i18n_preview', '1') puis recharger.
export const LANGUAGE_SELECTOR_ENABLED = false

const LOCALE_STORAGE_KEY = 'familygest_lang'
const PREVIEW_STORAGE_KEY = 'familygest_i18n_preview'

export function isI18nActive() {
  if (LANGUAGE_SELECTOR_ENABLED) return true
  try {
    return localStorage.getItem(PREVIEW_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

// Un fichier JSON par espace de noms et par langue : src/locales/<langue>/<espace>.json.
// Le français est embarqué dans le bundle ; les autres langues sont chargées à la demande.
const frModules = import.meta.glob('../locales/fr/*.json', { eager: true, import: 'default' })
const lazyModules = import.meta.glob(['../locales/*/*.json', '!../locales/fr/*.json'], { import: 'default' })

const namespaceOf = (path) => path.match(/\/([\w-]+)\.json$/)[1]

function buildMessages(entries) {
  const messages = {}
  for (const [path, content] of entries) messages[namespaceOf(path)] = content
  return messages
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: { [DEFAULT_LOCALE]: buildMessages(Object.entries(frModules)) },
  missingWarn: false,
  fallbackWarn: false
})

const loadedLocales = new Set([DEFAULT_LOCALE])

async function loadLocaleMessages(locale) {
  if (loadedLocales.has(locale)) return
  const entries = await Promise.all(
    Object.entries(lazyModules)
      .filter(([path]) => path.includes(`/locales/${locale}/`))
      .map(async ([path, load]) => [path, await load()])
  )
  i18n.global.setLocaleMessage(locale, buildMessages(entries))
  loadedLocales.add(locale)
}

export function normalizeLocale(value) {
  if (!value) return null
  const short = String(value).toLowerCase().split(/[-_]/)[0]
  return SUPPORTED_LOCALES.includes(short) ? short : null
}

// Langue de l'appareil : dernier choix mémorisé, sinon langue du navigateur, sinon français.
export function detectLocale() {
  try {
    const stored = normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY))
    if (stored) return stored
  } catch { /* stockage indisponible */ }
  const candidates = typeof navigator !== 'undefined' ? (navigator.languages || [navigator.language]) : []
  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate)
    if (locale) return locale
  }
  return DEFAULT_LOCALE
}

// Langue effectivement affichée (réactive), utilisable hors des composants
export const currentLocale = ref(DEFAULT_LOCALE)

export async function setLocale(value) {
  let locale = normalizeLocale(value) || DEFAULT_LOCALE
  if (!isI18nActive()) locale = DEFAULT_LOCALE
  try {
    await loadLocaleMessages(locale)
  } catch (err) {
    console.error('Chargement de la langue impossible', locale, err)
    locale = DEFAULT_LOCALE
  }
  i18n.global.locale.value = locale
  currentLocale.value = locale
  document.documentElement.setAttribute('lang', locale)
  if (isI18nActive()) {
    try { localStorage.setItem(LOCALE_STORAGE_KEY, locale) } catch { /* stockage indisponible */ }
  }
  return locale
}

// Raccourcis pour le code hors composants (stores, utilitaires)
export const t = (...args) => i18n.global.t(...args)
export const te = (...args) => i18n.global.te(...args)
