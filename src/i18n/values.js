import { t, te } from './index.js'

// Certaines valeurs sont enregistrées en base en français (priorités de tâches, rôles,
// catégories par défaut…). On ne les migre pas : on les traduit seulement à l'affichage.
// Une valeur connue a une clé values.<type>.<valeur normalisée> ; une valeur saisie librement
// par l'utilisateur (catégorie personnalisée…) s'affiche telle quelle.
export const valueKey = (value) => String(value ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

export function translateValue(kind, value) {
  if (value === null || value === undefined || value === '') return value
  const key = `values.${kind}.${valueKey(value)}`
  return te(key) ? t(key) : value
}
