// Langues prises en charge (identiques à celles de l'interface, voir src/i18n/index.js).
// Le français est la langue par défaut des comptes qui n'ont pas encore choisi leur langue.
export const SUPPORTED_LANGUAGES = ['fr', 'en', 'es']
export const DEFAULT_LANGUAGE = 'fr'

export function normalizeLanguage(value) {
  if (!value) return null
  const short = String(value).toLowerCase().split(/[-_]/)[0]
  return SUPPORTED_LANGUAGES.includes(short) ? short : null
}
