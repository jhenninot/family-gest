<template>
  <div class="mealie-search">
    <div class="mealie-search-input-wrap">
      <Search :size="16" class="mealie-search-icon" />
      <input
        v-model="query"
        type="search"
        class="form-input mealie-search-input"
        placeholder="Chercher une recette dans Mealie..."
        @keydown.enter.prevent
      />
      <Loader2 v-if="searching" :size="16" class="spin mealie-search-spinner" />
    </div>

    <p v-if="errorMessage" class="mealie-search-error">{{ errorMessage }}</p>

    <ul v-else-if="results.length > 0" class="mealie-results">
      <li v-for="recipe in results" :key="recipe.slug">
        <button
          type="button"
          class="mealie-result"
          :disabled="loadingSlug !== null"
          @click="pickRecipe(recipe)"
        >
          <img
            v-if="recipe.imageUrl && !brokenImages.has(recipe.slug)"
            :src="recipe.imageUrl"
            alt=""
            class="mealie-result-thumb"
            loading="lazy"
            @error="brokenImages.add(recipe.slug)"
          />
          <span v-else class="mealie-result-thumb mealie-result-thumb-empty"><ChefHat :size="16" /></span>
          <span class="mealie-result-text">
            <span class="mealie-result-name">{{ recipe.name }}</span>
            <span v-if="recipe.description" class="mealie-result-desc">{{ recipe.description }}</span>
          </span>
          <Loader2 v-if="loadingSlug === recipe.slug" :size="16" class="spin" />
        </button>
      </li>
    </ul>

    <p v-else-if="hasSearched && !searching" class="mealie-search-empty">
      Aucune recette trouvée pour « {{ lastSearch }} ».
    </p>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onBeforeUnmount } from 'vue'
import { Search, Loader2, ChefHat } from '@lucide/vue'
import { useFamilyStore } from '../stores/familyStore'

// Recherche de recettes sur le serveur Mealie de la famille. Émet `select` avec le détail de la
// recette choisie (nom, lien, ingrédients convertis en libellés d'articles de courses).
const emit = defineEmits(['select'])

const store = useFamilyStore()

const SEARCH_DEBOUNCE_MS = 350

const query = ref('')
const results = ref([])
const searching = ref(false)
const hasSearched = ref(false)
const lastSearch = ref('')
const errorMessage = ref('')
const loadingSlug = ref(null)
const brokenImages = reactive(new Set())

let debounceTimer = null
let inFlight = null

const runSearch = async (search) => {
  // Une frappe rapide peut laisser partir plusieurs requêtes : seule la dernière doit s'afficher.
  inFlight?.abort()
  const controller = new AbortController()
  inFlight = controller

  searching.value = true
  errorMessage.value = ''
  try {
    results.value = await store.searchMealieRecipes(search, { signal: controller.signal })
    lastSearch.value = search
    hasSearched.value = true
  } catch (err) {
    if (err.name === 'AbortError') return
    results.value = []
    errorMessage.value = err.message
  } finally {
    if (inFlight === controller) {
      searching.value = false
      inFlight = null
    }
  }
}

watch(query, (value) => {
  clearTimeout(debounceTimer)
  const search = value.trim()
  if (search.length < 2) {
    inFlight?.abort()
    searching.value = false
    results.value = []
    hasSearched.value = false
    errorMessage.value = ''
    return
  }
  debounceTimer = setTimeout(() => runSearch(search), SEARCH_DEBOUNCE_MS)
})

const pickRecipe = async (recipe) => {
  loadingSlug.value = recipe.slug
  errorMessage.value = ''
  try {
    const detail = await store.getMealieRecipe(recipe.slug)
    emit('select', detail)
    query.value = ''
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    loadingSlug.value = null
  }
}

onBeforeUnmount(() => {
  clearTimeout(debounceTimer)
  inFlight?.abort()
})
</script>

<style scoped>
.mealie-search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.mealie-search-icon {
  position: absolute;
  left: 0.75rem;
  color: var(--text-muted);
  pointer-events: none;
}

.mealie-search-input {
  padding-left: 2.25rem;
  padding-right: 2.25rem;
}

.mealie-search-spinner {
  position: absolute;
  right: 0.75rem;
  color: var(--text-muted);
}

.mealie-results {
  list-style: none;
  margin: 0.5rem 0 0 0;
  padding: 0.25rem;
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
}

.mealie-result {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.45rem 0.5rem;
  border: none;
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.mealie-result:hover:not(:disabled) {
  background: var(--accent-amber-light);
}

.mealie-result:disabled {
  cursor: wait;
}

.mealie-result-thumb {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm, 6px);
  object-fit: cover;
}

.mealie-result-thumb-empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  color: var(--text-muted);
}

.mealie-result-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.mealie-result-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.mealie-result-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mealie-search-error,
.mealie-search-empty {
  margin: 0.4rem 0 0 0;
  font-size: 0.8rem;
}

.mealie-search-error {
  color: var(--accent-rose);
}

.mealie-search-empty {
  color: var(--text-muted);
}

.spin {
  animation: mealie-spin 1s linear infinite;
}

@keyframes mealie-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
