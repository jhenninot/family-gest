import { t, te } from './index.js'

// Certaines valeurs sont enregistrées en base en français (priorités de tâches, rôles,
// catégories par défaut…). On ne les migre pas : on les traduit seulement à l'affichage.
// Une valeur connue a une clé values.<type>.<valeur normalisée> ; une valeur saisie librement
// par l'utilisateur (catégorie personnalisée…) s'affiche telle quelle.
export const valueKey = (value) => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

// Rôles familiaux proposés dans les formulaires (valeurs enregistrées en base)
export const FAMILY_ROLE_VALUES = ['Papa', 'Maman', 'Fils', 'Fille', 'Grand-Parent', 'Oncle / Tante', 'Baby-Sitter', 'Autre']

// Catégories et priorités de tâches proposées dans le formulaire (valeurs enregistrées en base)
export const TASK_CATEGORY_VALUES = ['Maison', 'Cuisine', 'Jardin', 'Chambre', 'Autre']
export const TASK_PRIORITY_VALUES = ['Basse', 'Moyenne', 'Haute']

// Catégories d'événements proposées dans le formulaire (valeurs enregistrées en base)
export const EVENT_CATEGORY_VALUES = ['Fête', 'Santé', 'Famille', 'Scolaire', 'Loisirs']

export function translateValue(kind, value) {
  if (value === null || value === undefined || value === '') return value
  const key = `values.${kind}.${valueKey(value)}`
  return te(key) ? t(key) : value
}
