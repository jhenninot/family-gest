<template>
  <div class="shopping-view">
    <!-- Quick Add Bar Card -->
    <div class="glass-card add-bar-card margin-bottom-lg">
      <form @submit.prevent="handleAddItem" class="quick-add-form">
        <div class="input-with-icon">
          <Plus :size="20" class="input-icon" />
          <input 
            v-model="newItem.name" 
            type="text" 
            required
            :placeholder="t('shopping.addPlaceholder')" 
            class="form-input quick-input" 
          />
        </div>

        <select v-model="newItem.category" class="form-select select-cat">
          <option v-for="cat in availableCategories" :key="cat.id || cat.name" :value="cat.name">
            {{ cat.icon }} {{ translateValue('shoppingCategory', cat.name) }}
          </option>
        </select>

        <input 
          v-model.number="newItem.quantity" 
          type="number" 
          step="0.5" 
          min="0.5" 
          :placeholder="t('shopping.qtyShort')" 
          class="form-input qty-input" 
        />

        <label class="urgent-toggle">
          <input type="checkbox" v-model="newItem.urgent" />
          <span>{{ t('shopping.urgent') }} 🔥</span>
        </label>

        <button type="submit" class="btn btn-primary">{{ t('common.add') }}</button>
      </form>
    </div>

    <!-- À acheter — groupés par catégorie -->
    <div class="section-title-bar">
      <h2>
        {{ t('shopping.toBuy') }}
        <span class="count-pill">{{ pendingItems.length }}</span>
      </h2>
      <span class="badge badge-amber" v-if="urgentCount > 0">{{ t('shopping.urgentCount', { n: urgentCount }, urgentCount) }} 🔥</span>
    </div>

    <div v-if="pendingItems.length === 0" class="glass-card empty-state">
      ✨ {{ t('shopping.emptyPending') }}
    </div>

    <div v-else class="categories-wrapper">
      <div 
        v-for="group in pendingCategoryGroups" 
        :key="group.id"
        class="glass-card category-block"
      >
        <div class="category-header">
          <span class="category-icon">{{ group.icon }}</span>
          <span class="category-name">{{ translateValue('shoppingCategory', group.name) }}</span>
          <span class="category-count">{{ group.items.length }}</span>
        </div>

        <div class="shopping-list">
          <div 
            v-for="item in group.items" 
            :key="item.id"
            class="shopping-item-row"
            :class="{ urgent: item.urgent }"
          >
            <input 
              type="checkbox" 
              :checked="item.checked" 
              @change="store.toggleShoppingItem(item.id)" 
              class="custom-checkbox-lg" 
            />

            <div class="item-info">
              <span class="item-name">{{ item.name }}</span>
              <div class="item-tags">
                <span class="qty-tag">{{ t('shopping.qty', { n: item.quantity }) }}</span>
                <span v-if="item.urgent" class="badge badge-rose">{{ t('shopping.urgent') }} 🔥</span>
                <span v-if="getLinkedMeal(item.mealId)" class="badge badge-purple" :title="getMealTooltip(item.mealId)">
                  🍲 {{ getMealName(item.mealId) }}
                  <span class="meal-badge-date">· {{ formatMealShortDate(getLinkedMeal(item.mealId)) }}</span>
                </span>
              </div>
            </div>

            <div class="item-actions">
              <button @click="openEditModal(item)" class="btn-action edit" :title="t('common.edit')">
                <Pencil :size="15" />
              </button>
              <button @click="confirmDelete(item)" class="btn-action delete" :title="t('common.delete')">
                <Trash2 :size="15" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Déjà dans le chariot -->
    <div class="section-title-bar margin-top-lg">
      <h2>
        {{ t('shopping.inCart') }}
        <span class="count-pill emerald">{{ completedItems.length }}</span>
      </h2>
    </div>

    <div v-if="completedItems.length === 0" class="glass-card empty-state">
      {{ t('shopping.emptyCart') }}
    </div>

    <div v-else class="glass-card category-block">
      <div class="shopping-list">
        <div 
          v-for="item in completedItems" 
          :key="item.id"
          class="shopping-item-row completed"
        >
          <input 
            type="checkbox" 
            :checked="item.checked" 
            @change="store.toggleShoppingItem(item.id)" 
            class="custom-checkbox-lg" 
          />
          <div class="item-info">
            <span class="item-name">{{ item.name }}</span>
            <div class="item-tags">
              <span class="qty-tag">{{ t('shopping.qty', { n: item.quantity }) }}</span>
              <span v-if="getLinkedMeal(item.mealId)" class="badge badge-purple" :title="getMealTooltip(item.mealId)">
                🍲 {{ getMealName(item.mealId) }}
                <span class="meal-badge-date">· {{ formatMealShortDate(getLinkedMeal(item.mealId)) }}</span>
              </span>
            </div>
          </div>
          <div class="item-actions">
            <button @click="confirmDelete(item)" class="btn-action delete" :title="t('common.delete')">
              <Trash2 :size="15" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== Modal Édition ===== -->
    <div v-if="editingItem" class="modal-overlay" @click.self="editingItem = null">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ t('shopping.editItem') }}</h3>
          <button @click="editingItem = null" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleEditSave">
          <div class="form-group">
            <label class="form-label">{{ t('shopping.name') }}</label>
            <input v-model="editForm.name" type="text" required class="form-input" />
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">{{ t('tasks.form.category') }}</label>
              <select v-model="editForm.category" class="form-select">
                <option v-for="cat in availableCategories" :key="cat.id || cat.name" :value="cat.name">
                  {{ cat.icon }} {{ translateValue('shoppingCategory', cat.name) }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('shopping.quantity') }}</label>
              <input v-model.number="editForm.quantity" type="number" step="0.5" min="0.5" class="form-input" />
            </div>
          </div>

          <div class="form-group">
            <label class="urgent-toggle">
              <input type="checkbox" v-model="editForm.urgent" />
              <span>{{ t('shopping.urgent') }} 🔥</span>
            </label>
          </div>

          <div class="modal-footer">
            <button type="button" @click="editingItem = null" class="btn btn-secondary">{{ t('common.cancel') }}</button>
            <button type="submit" class="btn btn-primary">{{ t('common.save') }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useFamilyStore } from '../stores/familyStore'
import { useI18n } from 'vue-i18n'
import { formatDate } from '../i18n/format'
import { translateValue } from '../i18n/values'
import { ShoppingCart, Plus, Trash2, Pencil } from '@lucide/vue'
import { useConfirm } from '../composables/useConfirm'
import { escapeHtml } from '../utils/escapeHtml'

const store = useFamilyStore()
const { t } = useI18n()
const { confirm } = useConfirm()

const availableCategories = computed(() => {
  if (store.shoppingCategories && store.shoppingCategories.length > 0) {
    return [...store.shoppingCategories].sort((a, b) => a.rank - b.rank)
  }
  return [
    { id: 1, name: 'Frais', icon: '🧀', rank: 1 },
    { id: 2, name: 'Épicerie', icon: '🥫', rank: 2 },
    { id: 3, name: 'Fruits & Légumes', icon: '🥦', rank: 3 },
    { id: 4, name: 'Boulangerie', icon: '🥖', rank: 4 },
    { id: 5, name: 'Boissons', icon: '🧃', rank: 5 },
    { id: 6, name: 'Maison', icon: '🏠', rank: 6 },
    { id: 7, name: 'Autre', icon: '🛒', rank: 7 }
  ]
})

// --- États ---
const newItem = ref({ name: '', category: 'Frais', quantity: 1, urgent: false })
const editingItem = ref(null)
const editForm = ref({})

// Ajuster la catégorie par défaut
watch(availableCategories, (cats) => {
  if (cats.length > 0 && !cats.some(c => c.name === newItem.value.category)) {
    newItem.value.category = cats[0].name
  }
}, { immediate: true })

// --- Computed ---
const pendingItems = computed(() =>
  store.shoppingList.filter(item => !item.checked)
)

const completedItems = computed(() =>
  store.shoppingList.filter(item => item.checked)
)

const urgentCount = computed(() =>
  pendingItems.value.filter(item => item.urgent).length
)

const getLinkedMeal = (mealId) => {
  if (!mealId) return null
  return (store.meals || []).find(meal => meal.id === Number(mealId)) || null
}

const getMealName = (mealId) => {
  const m = getLinkedMeal(mealId)
  return m ? m.dish : null
}

// Libellé court du badge : « mar. 24 sept. · midi ».
const formatMealShortDate = (meal) => {
  if (!meal || !meal.date) return ''
  const slotLabel = meal.slot === 'dinner' ? t('meals.slots.dinnerShort') : t('meals.slots.lunchShort')
  const [year, month, day] = meal.date.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  if (Number.isNaN(d.getTime())) return `${meal.date} · ${slotLabel}`
  const dayFormatted = formatDate(d, { weekday: 'short', day: 'numeric', month: 'short' })
  return `${dayFormatted} · ${slotLabel}`
}

const getMealTooltip = (mealId) => {
  const meal = getLinkedMeal(mealId)
  return meal ? t('shopping.linkedMealTooltip', { dish: meal.dish, date: formatMealDate(meal) }) : ''
}

const formatMealDate = (meal) => {
  if (!meal || !meal.date) return ''
  const slotLabel = meal.slot === 'dinner' ? t('meals.slots.dinnerLong') : t('meals.slots.lunchLong')
  try {
    const parts = meal.date.split('-')
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    const dayFormatted = formatDate(d, { weekday: 'long', day: 'numeric', month: 'long' })
    return `${dayFormatted} • ${slotLabel}`
  } catch {
    return `${meal.date} • ${slotLabel}`
  }
}

/** Articles à acheter groupés par catégorie, ordonnés par le rang de la catégorie */
const pendingCategoryGroups = computed(() => {
  const groups = []
  const cats = availableCategories.value
  const knownNames = cats.map(c => c.name)

  for (const cat of cats) {
    const items = pendingItems.value.filter(i => i.category === cat.name)
    if (items.length > 0) {
      groups.push({
        id: cat.id || cat.name,
        name: cat.name,
        icon: cat.icon || '🛒',
        rank: cat.rank,
        items
      })
    }
  }

  // Articles de catégories orphelines/inconnues
  const unknownItems = pendingItems.value.filter(i => !knownNames.includes(i.category))
  if (unknownItems.length > 0) {
    const extraMap = {}
    for (const item of unknownItems) {
      const cName = item.category || 'Autre'
      if (!extraMap[cName]) extraMap[cName] = []
      extraMap[cName].push(item)
    }
    for (const [name, items] of Object.entries(extraMap)) {
      groups.push({
        id: `extra-${name}`,
        name,
        icon: '🛒',
        rank: 9999,
        items
      })
    }
  }

  return groups
})

// --- Actions ---
const handleAddItem = () => {
  if (!newItem.value.name.trim()) return
  store.addShoppingItem(newItem.value)
  const defaultCat = availableCategories.value[0]?.name || 'Frais'
  newItem.value = { name: '', category: defaultCat, quantity: 1, urgent: false }
}

const confirmDelete = async (item) => {
  const meal = getLinkedMeal(item.mealId)
  const ok = await confirm({
    title: t('shopping.delete.title'),
    message: t('shopping.delete.message', { name: escapeHtml(item.name) }),
    description: t('common.irreversible'),
    warning: meal
      ? `${t('shopping.delete.linkedMeal')}<br><strong>🍲 ${escapeHtml(meal.dish)}</strong><br>${escapeHtml(formatMealDate(meal))}`
      : '',
    confirmText: t('common.delete'),
    type: 'danger'
  })
  if (ok) {
    store.deleteShoppingItem(item.id)
  }
}

const openEditModal = (item) => {
  editingItem.value = item
  editForm.value = { ...item }
}

const handleEditSave = () => {
  if (!editForm.value.name.trim()) return
  store.updateShoppingItem(editingItem.value.id, editForm.value)
  editingItem.value = null
}
</script>

<style scoped>
.meal-badge-date {
  font-weight: 500;
  opacity: 0.85;
}

.text-amber { color: var(--accent-amber); }
.margin-bottom-lg { margin-bottom: 2rem; }
.margin-top-lg { margin-top: 2rem; }

/* ---- Quick add bar ---- */
.add-bar-card { padding: 1.25rem; }

.quick-add-form {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-wrap: wrap;
}

.input-with-icon {
  position: relative;
  flex: 1;
  min-width: 240px;
}

.input-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.quick-input { padding-left: 2.75rem; }
.select-cat { width: auto; }
.qty-input { width: 80px; }

.urgent-toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-rose);
  cursor: pointer;
  user-select: none;
}

/* ---- Section title bars ---- */
.section-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.section-title-bar h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 800;
}

.count-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.4rem;
  border-radius: var(--radius-full);
  background: var(--accent-primary);
  color: white;
  font-size: 0.75rem;
  font-weight: 800;
}

.count-pill.emerald {
  background: var(--accent-emerald, #10b981);
}

/* ---- Categories layout ---- */
.categories-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.category-block { padding: 1.25rem; }

.category-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid var(--border-color);
}

.category-icon { font-size: 1.2rem; }

.category-name {
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--text-primary);
  flex: 1;
}

.category-count {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  padding: 0.1rem 0.5rem;
}

/* ---- Shopping list items ---- */
.shopping-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.shopping-item-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.65rem 0.85rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  transition: background var(--transition-fast);
}

.shopping-item-row.urgent {
  border-left: 4px solid var(--accent-rose);
}

.shopping-item-row.completed {
  opacity: 0.55;
}

.shopping-item-row.completed .item-name {
  text-decoration: line-through;
}

.custom-checkbox-lg {
  width: 20px;
  height: 20px;
  accent-color: var(--accent-primary);
  cursor: pointer;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.item-name {
  font-weight: 700;
  font-size: 0.95rem;
}

.item-tags {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.qty-tag {
  font-size: 0.775rem;
  color: var(--text-secondary);
  font-weight: 600;
}

/* ---- Action buttons ---- */
.item-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.btn-action {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 0.3rem;
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.btn-action.edit:hover {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  background: var(--accent-primary-light, rgba(99,102,241,0.1));
}

.btn-action.delete:hover {
  color: var(--accent-rose);
  border-color: var(--accent-rose);
  background: var(--accent-rose-light);
}

/* ---- Modal (edition) ---- */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-muted);
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.empty-state {
  padding: 2.5rem;
  text-align: center;
  color: var(--text-muted);
}
</style>
