<template>
  <div class="shopping-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <ShoppingCart :size="28" class="text-amber" />
          <span>Liste de courses</span>
        </h1>
        <p class="page-subtitle">Ajoutez les produits manquants et cochez-les en magasin en temps réel.</p>
      </div>
    </div>

    <!-- Quick Add Bar Card -->
    <div class="glass-card add-bar-card margin-bottom-lg">
      <form @submit.prevent="handleAddItem" class="quick-add-form">
        <div class="input-with-icon">
          <Plus :size="20" class="input-icon" />
          <input 
            v-model="newItem.name" 
            type="text" 
            required
            placeholder="Ajouter un article (ex: Lait, Pommes, Pain...)" 
            class="form-input quick-input" 
          />
        </div>

        <select v-model="newItem.category" class="form-select select-cat">
          <option v-for="cat in availableCategories" :key="cat.id || cat.name" :value="cat.name">
            {{ cat.icon }} {{ cat.name }}
          </option>
        </select>

        <input 
          v-model.number="newItem.quantity" 
          type="number" 
          step="0.5" 
          min="0.5" 
          placeholder="Qté" 
          class="form-input qty-input" 
        />

        <label class="urgent-toggle">
          <input type="checkbox" v-model="newItem.urgent" />
          <span>Urgent 🔥</span>
        </label>

        <button type="submit" class="btn btn-primary">Ajouter</button>
      </form>
    </div>

    <!-- À acheter — groupés par catégorie -->
    <div class="section-title-bar">
      <h2>
        À acheter
        <span class="count-pill">{{ pendingItems.length }}</span>
      </h2>
      <span class="badge badge-amber" v-if="urgentCount > 0">{{ urgentCount }} Urgent(s) 🔥</span>
    </div>

    <div v-if="pendingItems.length === 0" class="glass-card empty-state">
      ✨ La liste de courses est vide ! Tout est sous contrôle.
    </div>

    <div v-else class="categories-wrapper">
      <div 
        v-for="group in pendingCategoryGroups" 
        :key="group.id"
        class="glass-card category-block"
      >
        <div class="category-header">
          <span class="category-icon">{{ group.icon }}</span>
          <span class="category-name">{{ group.name }}</span>
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
                <span class="qty-tag">Qté : {{ item.quantity }}</span>
                <span v-if="item.urgent" class="badge badge-rose">Urgent 🔥</span>
              </div>
            </div>

            <div class="item-actions">
              <button @click="openEditModal(item)" class="btn-action edit" title="Modifier">
                <Pencil :size="15" />
              </button>
              <button @click="confirmDelete(item)" class="btn-action delete" title="Supprimer">
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
        Déjà dans le chariot
        <span class="count-pill emerald">{{ completedItems.length }}</span>
      </h2>
    </div>

    <div v-if="completedItems.length === 0" class="glass-card empty-state">
      Aucun article n'a encore été coché.
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
            <span class="qty-tag">Qté : {{ item.quantity }}</span>
          </div>
          <div class="item-actions">
            <button @click="confirmDelete(item)" class="btn-action delete" title="Supprimer">
              <Trash2 :size="15" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== Modal Confirmation Suppression ===== -->
    <div v-if="itemToDelete" class="modal-overlay" @click.self="itemToDelete = null">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h3>Supprimer l'article</h3>
          <button @click="itemToDelete = null" class="btn-close">&times;</button>
        </div>
        <p class="confirm-text">
          Voulez-vous vraiment supprimer <strong>« {{ itemToDelete.name }} »</strong> ?<br>
          Cette action est irréversible.
        </p>
        <div class="modal-footer">
          <button @click="itemToDelete = null" class="btn btn-secondary">Annuler</button>
          <button @click="executeDelete" class="btn btn-danger">Supprimer</button>
        </div>
      </div>
    </div>

    <!-- ===== Modal Édition ===== -->
    <div v-if="editingItem" class="modal-overlay" @click.self="editingItem = null">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Modifier l'article</h3>
          <button @click="editingItem = null" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleEditSave">
          <div class="form-group">
            <label class="form-label">Nom</label>
            <input v-model="editForm.name" type="text" required class="form-input" />
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Catégorie</label>
              <select v-model="editForm.category" class="form-select">
                <option v-for="cat in availableCategories" :key="cat.id || cat.name" :value="cat.name">
                  {{ cat.icon }} {{ cat.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Quantité</label>
              <input v-model.number="editForm.quantity" type="number" step="0.5" min="0.5" class="form-input" />
            </div>
          </div>

          <div class="form-group">
            <label class="urgent-toggle">
              <input type="checkbox" v-model="editForm.urgent" />
              <span>Urgent 🔥</span>
            </label>
          </div>

          <div class="modal-footer">
            <button type="button" @click="editingItem = null" class="btn btn-secondary">Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useFamilyStore } from '../stores/familyStore'
import { ShoppingCart, Plus, Trash2, Pencil } from '@lucide/vue'

const store = useFamilyStore()

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
const itemToDelete = ref(null)
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

const confirmDelete = (item) => {
  itemToDelete.value = item
}

const executeDelete = () => {
  if (itemToDelete.value) {
    store.deleteShoppingItem(itemToDelete.value.id)
    itemToDelete.value = null
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

/* ---- Modal ---- */
.modal-sm .modal-content {
  max-width: 420px;
}

.confirm-text {
  margin: 1rem 0 1.5rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

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

.btn-danger {
  background: var(--accent-rose);
  color: white;
  border: none;
  padding: 0.55rem 1.25rem;
  border-radius: var(--radius-md);
  font-weight: 700;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.btn-danger:hover { opacity: 0.85; }

.empty-state {
  padding: 2.5rem;
  text-align: center;
  color: var(--text-muted);
}
</style>
