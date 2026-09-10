<template>
  <div class="shopping-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <ShoppingCart :size="28" class="text-amber" />
          <span>Liste de Courses</span>
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
          <option value="Frais">Frais</option>
          <option value="Épicerie">Épicerie</option>
          <option value="Fruits & Légumes">Fruits & Légumes</option>
          <option value="Boulangerie">Boulangerie</option>
          <option value="Boissons">Boissons</option>
          <option value="Maison">Maison</option>
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

    <!-- Shopping Items List Grouped by Category -->
    <div class="grid-2 shopping-grid">
      <!-- Pending Items Card -->
      <div class="glass-card section-card">
        <div class="section-card-header">
          <h2>À acheter ({{ pendingItems.length }})</h2>
          <span class="badge badge-amber" v-if="urgentCount > 0">
            {{ urgentCount }} Urgent(s)
          </span>
        </div>

        <div class="shopping-list">
          <div 
            v-for="item in pendingItems" 
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
                <span class="badge badge-indigo">{{ item.category }}</span>
                <span class="qty-tag">Qté: {{ item.quantity }}</span>
                <span v-if="item.urgent" class="badge badge-rose">Urgent 🔥</span>
              </div>
            </div>

            <button @click="store.deleteShoppingItem(item.id)" class="btn-delete" title="Supprimer">
              <Trash2 :size="16" />
            </button>
          </div>

          <div v-if="pendingItems.length === 0" class="empty-state">
            ✨ La liste de courses est vide ! Tout est sous contrôle.
          </div>
        </div>
      </div>

      <!-- Completed Items Card -->
      <div class="glass-card section-card">
        <div class="section-card-header">
          <h2>Déjà dans le Chariot ({{ completedItems.length }})</h2>
          <span class="badge badge-emerald">Validés</span>
        </div>

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
              <span class="qty-tag">Qté: {{ item.quantity }}</span>
            </div>

            <button @click="store.deleteShoppingItem(item.id)" class="btn-delete" title="Supprimer">
              <Trash2 :size="16" />
            </button>
          </div>

          <div v-if="completedItems.length === 0" class="empty-state">
            Aucun article n'a encore été coché.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFamilyStore } from '../stores/familyStore'
import { ShoppingCart, Plus, Trash2 } from '@lucide/vue'

const store = useFamilyStore()

const newItem = ref({
  name: '',
  category: 'Frais',
  quantity: 1,
  urgent: false
})

const pendingItems = computed(() => {
  return store.shoppingList.filter(item => !item.checked)
})

const completedItems = computed(() => {
  return store.shoppingList.filter(item => item.checked)
})

const urgentCount = computed(() => {
  return pendingItems.value.filter(item => item.urgent).length
})

const handleAddItem = () => {
  if (!newItem.value.name.trim()) return
  store.addShoppingItem(newItem.value)
  newItem.value = {
    name: '',
    category: 'Frais',
    quantity: 1,
    urgent: false
  }
}
</script>

<style scoped>
.text-amber { color: var(--accent-amber); }
.margin-bottom-lg { margin-bottom: 2rem; }

.add-bar-card {
  padding: 1.25rem;
}

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

.quick-input {
  padding-left: 2.75rem;
}

.select-cat {
  width: auto;
}

.qty-input {
  width: 80px;
}

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

.section-card { padding: 1.5rem; }

.section-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.shopping-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.shopping-item-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
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
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
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

.btn-delete {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}
.btn-delete:hover { color: var(--accent-rose); }

.empty-state { padding: 2rem; text-align: center; color: var(--text-muted); }
</style>
