import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Langues prises en charge (identiques à celles de l'interface, voir src/i18n/index.js).
// Le français est la langue par défaut des comptes qui n'ont pas encore choisi leur langue.
export const SUPPORTED_LANGUAGES = ['fr', 'en', 'es']
export const DEFAULT_LANGUAGE = 'fr'

// Locale Intl utilisée pour les dates dans les emails et notifications (même choix que l'interface)
const INTL_LOCALES = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES' }

export function normalizeLanguage(value) {
  if (!value) return null
  const short = String(value).toLowerCase().split(/[-_]/)[0]
  return SUPPORTED_LANGUAGES.includes(short) ? short : null
}

export const resolveLanguage = (value) => normalizeLanguage(value) || DEFAULT_LANGUAGE
export const intlLocale = (lang) => INTL_LOCALES[resolveLanguage(lang)]

// Textes chargés au démarrage depuis server/locales/<langue>/<espace>.json, à plat :
// { fr: { 'errors.familyNotFound': '…' } }. Même syntaxe que vue-i18n côté interface
// ({nom}, {'littéral'}, formes plurielles séparées par « | »), vérifiée par npm run i18n:check.
const LOCALES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../locales')

const flatten = (obj, prefix, out) => {
  for (const [key, value] of Object.entries(obj)) {
    const full = `${prefix}.${key}`
    if (value && typeof value === 'object') flatten(value, full, out)
    else out[full] = value
  }
  return out
}

const messages = Object.fromEntries(SUPPORTED_LANGUAGES.map(lang => {
  const dir = path.join(LOCALES_DIR, lang)
  const flat = {}
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      flatten(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')), file.replace(/\.json$/, ''), flat)
    }
  }
  return [lang, flat]
}))

// Choix de la forme plurielle, comme vue-i18n : 2 formes = singulier | pluriel,
// 3 formes = zéro | un | plusieurs. En français, 0 et 1 sont au singulier.
const pickPlural = (forms, count, lang) => {
  const n = Math.abs(Number(count) || 0)
  if (forms.length >= 3) return forms[n === 0 ? 0 : n === 1 ? 1 : 2]
  const singular = lang === 'fr' ? n <= 1 : n === 1
  return forms[singular ? 0 : 1]
}

const interpolate = (msg, params) => msg
  .replace(/\{\s*'([^']*)'\s*\}/g, (_, literal) => literal)
  .replace(/\{\s*(\w+)\s*\}/g, (_, name) => (params[name] ?? ''))

export function t(lang, key, params = {}) {
  const language = resolveLanguage(lang)
  let msg = messages[language][key] ?? messages[DEFAULT_LANGUAGE][key]
  if (msg === undefined) return key
  const count = params.count ?? params.n
  if (count !== undefined && msg.includes('|')) {
    msg = pickPlural(msg.split('|').map(s => s.trim()), count, language)
  }
  return interpolate(msg, params)
}

// Traducteur lié à une langue : t('clé', { … }), avec t.lang pour les formats de date.
export const translator = (lang) => {
  const language = resolveLanguage(lang)
  const bound = (key, params) => t(language, key, params)
  bound.lang = language
  return bound
}

// Date « AAAA-MM-JJ » mise en forme dans la langue voulue (sans décalage de fuseau).
export const formatDateOnly = (lang, dateStr, options) => {
  try {
    const [y, m, d] = String(dateStr).split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(intlLocale(lang), { ...options, timeZone: 'UTC' })
  } catch {
    return dateStr
  }
}

// Date d'un jour lisible pour un destinataire (« vendredi 25 septembre »), t étant son traducteur
export const readableDate = (t, dateStr) => {
  const text = formatDateOnly(t.lang, dateStr, { weekday: 'long', day: 'numeric', month: 'long' })
  // « jeudi 1er octobre » : Intl écrit « 1 octobre »
  return t.lang === 'fr' ? text.replace(/(^|\s)1(\s)/, '$11er$2') : text
}

// Middleware : langue de la réponse. L'interface envoie la sienne dans l'en-tête X-Lang ;
// à défaut, on prend celle du compte connecté (connue après requireAuth), sinon le français.
export const languageMiddleware = (req, res, next) => {
  const requested = normalizeLanguage(req.get('x-lang'))
  Object.defineProperty(req, 'lang', { get: () => requested || normalizeLanguage(req.user?.language) || DEFAULT_LANGUAGE })
  req.t = (key, params) => t(req.lang, key, params)
  next()
}

// Erreur métier levée par une fonction utilitaire sans accès à la requête : son message est en
// français (journaux, connecteur MCP) et la route la traduit dans la langue de la réponse.
export class TranslatableError extends Error {
  constructor(key, params = {}) {
    super(t(DEFAULT_LANGUAGE, key, params))
    this.i18nKey = key
    this.i18nParams = params
  }
}

export const localizeError = (req, err) => (err?.i18nKey ? req.t(err.i18nKey, err.i18nParams) : err?.message)

// Texte d'une notification : chaîne fixe, ou fonction (t) => chaîne rédigée dans la langue du destinataire
export const localize = (value, t) => (typeof value === 'function' ? value(t) : value)

// Valeurs enregistrées en français en base (priorités, catégories de tâches…), traduites à
// l'affichage comme dans l'interface : clé values.<type>.<valeur normalisée>, sinon valeur telle quelle.
const valueKey = (value) => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

export const translateValue = (t, kind, value) => {
  if (value === null || value === undefined || value === '') return value
  const key = `values.${kind}.${valueKey(value)}`
  const translated = t(key)
  return translated === key ? value : translated
}
