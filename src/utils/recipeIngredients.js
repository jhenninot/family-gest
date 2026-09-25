// Ingrédients de recettes Mealie : l'API renvoie des éléments structurés
// { food, quantity, unit, text } (voir GET /api/mealie/recipes/:slug) que l'on convertit ici en
// libellés d'articles de courses, avec des quantités ajustées au nombre de couverts.
import { formatNumber } from '../i18n/format'

export const recipeIngredientKey = (ing) => (ing.food || ing.text).toLowerCase()

// Liste à cocher : ingrédients dédoublonnés, tous décochés.
export const toSelectableIngredients = (ingredients = []) => {
  const known = new Set()
  const result = []
  for (const ing of ingredients) {
    const key = recipeIngredientKey(ing)
    if (known.has(key)) continue
    known.add(key)
    result.push({ ...ing, selected: false })
  }
  return result
}

// Coefficient appliqué aux quantités de la recette ; 1 si l'une des deux valeurs est inconnue.
export const getRecipeScaleFactor = (baseServings, headcount) =>
  baseServings > 0 && headcount > 0 ? headcount / baseServings : 1

// Arrondi lisible : à l'entier supérieur pour ce qui se compte (œufs...), une décimale au plus
// pour les quantités avec unité (aucune au-delà de 10).
const formatScaledQuantity = (quantity, unit) => {
  if (!unit) return String(Math.ceil(quantity - 1e-9))
  return formatNumber(quantity, { maximumFractionDigits: quantity >= 10 ? 0 : 1 })
}

// Libellé d'article de courses : « Farine (250 g) » avec la quantité ajustée, ou le texte libre
// de Mealie (non ajustable) pour les ingrédients non structurés.
export const formatRecipeIngredient = (ing, scaleFactor = 1) => {
  if (!ing.food) return ing.text
  if (!ing.quantity) return ing.food
  const amount = [formatScaledQuantity(ing.quantity * scaleFactor, ing.unit), ing.unit]
    .filter(Boolean)
    .join(' ')
  return `${ing.food} (${amount})`
}

// Vrai si un article de courses correspond déjà à cet ingrédient (même libellé, ou même
// aliment avec une autre quantité : « Farine (200 g) » pour l'ingrédient Farine).
export const isIngredientInList = (ing, itemNames) => {
  const key = recipeIngredientKey(ing)
  return itemNames.some(name => {
    const lower = name.toLowerCase()
    return lower === key || lower.startsWith(`${key} (`)
  })
}

// Slug d'une recette à partir de son lien Mealie (/g/<groupe>/r/<slug> ou /recipe/<slug>).
export const parseMealieRecipeSlug = (url) => {
  try {
    const match = new URL(url).pathname.match(/\/(?:r|recipe)\/([^/]+)\/?$/)
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}
