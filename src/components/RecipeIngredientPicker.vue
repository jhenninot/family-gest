<template>
  <div class="recipe-ing-picker">
    <div class="recipe-ing-header">
      <span>{{ t('meals.picker.header', { selected: selectedCount, total: ingredients.length }) }}</span>
      <button type="button" class="recipe-ing-toggle-all" @click="toggleAll">
        {{ allSelected ? t('meals.picker.uncheckAll') : t('meals.picker.checkAll') }}
      </button>
    </div>
    <div class="recipe-ing-scale">
      <template v-if="baseServings && headcount > 0">
        {{ t('meals.picker.scaledFor', { n: headcount, base: baseServings }, headcount) }}
      </template>
      <template v-else-if="!baseServings">
        {{ t('meals.picker.unknownServings') }}
      </template>
      <template v-else>
        {{ t('meals.picker.nobodyAtTable') }}
      </template>
    </div>
    <label
      v-for="(ing, idx) in ingredients"
      :key="idx"
      class="recipe-ing-item"
      :class="{ selected: ing.selected }"
    >
      <input v-model="ing.selected" type="checkbox" />
      <span>{{ formatRecipeIngredient(ing, scaleFactor) }}</span>
    </label>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatRecipeIngredient, getRecipeScaleFactor } from '../utils/recipeIngredients'

// Liste à cocher des ingrédients d'une recette Mealie. `ingredients` vient de
// toSelectableIngredients() : le composant coche / décoche directement leur champ `selected`,
// le parent lit ensuite la sélection.
const props = defineProps({
  ingredients: { type: Array, required: true },
  baseServings: { type: Number, default: null },
  headcount: { type: Number, default: 0 }
})

const { t } = useI18n()

const scaleFactor = computed(() => getRecipeScaleFactor(props.baseServings, props.headcount))
const selectedCount = computed(() => props.ingredients.filter(ing => ing.selected).length)
const allSelected = computed(() => props.ingredients.length > 0 && selectedCount.value === props.ingredients.length)

const toggleAll = () => {
  const selected = !allSelected.value
  props.ingredients.forEach(ing => { ing.selected = selected })
}
</script>

<style scoped>
.recipe-ing-picker {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  max-height: 14rem;
  overflow-y: auto;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
}

.recipe-ing-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.25rem 0.35rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.recipe-ing-toggle-all {
  background: transparent;
  border: none;
  color: var(--accent-amber);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
}

.recipe-ing-scale {
  padding: 0 0.25rem 0.35rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.recipe-ing-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.25rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.recipe-ing-item:hover {
  background: var(--bg-secondary);
}

.recipe-ing-item.selected {
  color: var(--text-primary);
}

.recipe-ing-item input {
  accent-color: var(--accent-amber);
  flex-shrink: 0;
}
</style>
