<template>
  <div class="tasks-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <CheckSquare :size="28" class="text-indigo" />
          <span>Tâches</span>
        </h1>
        <p class="page-subtitle">Organisez et répartissez les tâches ménagères.</p>
      </div>

      <button @click="showAddModal = true" class="btn btn-primary">
        <Plus :size="18" />
        <span>Ajouter une Tâche</span>
      </button>
    </div>

    <!-- Filters Bar -->
    <div class="glass-card filters-bar margin-bottom-lg">
      <div class="filter-group">
        <span class="filter-label">Statut :</span>
        <button 
          @click="statusFilter = 'all'" 
          class="filter-pill"
          :class="{ active: statusFilter === 'all' }"
        >
          Toutes ({{ store.tasks.length }})
        </button>
        <button 
          @click="statusFilter = 'pending'" 
          class="filter-pill"
          :class="{ active: statusFilter === 'pending' }"
        >
          À faire ({{ store.pendingTasksCount }})
        </button>
        <button 
          @click="statusFilter = 'completed'" 
          class="filter-pill"
          :class="{ active: statusFilter === 'completed' }"
        >
          Terminées ({{ store.completedTasksCount }})
        </button>
      </div>

      <div class="filter-group">
        <span class="filter-label">Membre :</span>
        <select v-model="memberFilter" class="form-select select-sm">
          <option value="all">Tous les membres</option>
          <option v-for="m in store.members" :key="m.id" :value="m.id">
            {{ m.avatar }} {{ m.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Tasks Grid / Cards -->
    <div class="tasks-grid">
      <div 
        v-for="task in filteredTasks" 
        :key="task.id"
        class="glass-card task-card"
        :class="{ completed: task.completed }"
      >
        <div class="task-card-header">
          <span class="badge" :class="getPriorityClass(task.priority)">
            {{ task.priority }}
          </span>
          <span class="badge badge-purple">{{ task.category }}</span>

          <button @click="store.deleteTask(task.id)" class="btn-icon-delete" title="Supprimer">
            <Trash2 :size="16" />
          </button>
        </div>

        <div class="task-card-body">
          <label class="task-checkbox-wrapper">
            <input 
              type="checkbox" 
              :checked="task.completed" 
              @change="store.toggleTask(task.id)"
              class="custom-checkbox-lg"
            />
            <span class="task-title-text">{{ task.title }}</span>
          </label>
        </div>

        <div class="task-card-footer">
          <div class="assignee-info">
            <span class="avatar-sm">{{ getMemberAvatar(task.assignedTo) }}</span>
            <span class="assignee-name">{{ getMemberName(task.assignedTo) }}</span>
          </div>


        </div>
      </div>
    </div>

    <div v-if="filteredTasks.length === 0" class="glass-card empty-card">
      <p>Aucune tâche trouvée avec ces filtres.</p>
    </div>

    <!-- Modal Ajouter une Tâche -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Nouvelle Tâche</h3>
          <button @click="showAddModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleAddTask">
          <div class="form-group">
            <label class="form-label">Titre de la tâche</label>
            <input 
              v-model="newTask.title" 
              type="text" 
              required 
              placeholder="ex: Nettoyer la cuisine..."
              class="form-input" 
            />
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Catégorie</label>
              <select v-model="newTask.category" class="form-select">
                <option value="Maison">Maison</option>
                <option value="Cuisine">Cuisine</option>
                <option value="Jardin">Jardin</option>
                <option value="Chambre">Chambre</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Attribuer à</label>
              <select v-model="newTask.assignedTo" class="form-select">
                <option v-for="m in store.members" :key="m.id" :value="m.id">
                  {{ m.avatar }} {{ m.name }} ({{ m.role }})
                </option>
              </select>
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Priorité</label>
              <select v-model="newTask.priority" class="form-select">
                <option value="Basse">Basse</option>
                <option value="Moyenne">Moyenne</option>
                <option value="Haute">Haute</option>
              </select>
            </div>


          </div>

          <div class="modal-footer">
            <button type="button" @click="showAddModal = false" class="btn btn-secondary">Annuler</button>
            <button type="submit" class="btn btn-primary">Créer la tâche</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFamilyStore } from '../stores/familyStore'
import { CheckSquare, Plus, Trash2 } from '@lucide/vue'

const store = useFamilyStore()

const statusFilter = ref('all')
const memberFilter = ref('all')
const showAddModal = ref(false)

const newTask = ref({
  title: '',
  category: 'Maison',
  assignedTo: store.members[0]?.id || 1,
  priority: 'Moyenne'
})

const filteredTasks = computed(() => {
  return store.tasks.filter(t => {
    // Status filter
    if (statusFilter.value === 'pending' && t.completed) return false
    if (statusFilter.value === 'completed' && !t.completed) return false

    // Member filter
    if (memberFilter.value !== 'all' && t.assignedTo !== Number(memberFilter.value)) return false

    return true
  })
})

const getMemberName = (id) => {
  const m = store.members.find(m => m.id === id)
  return m ? m.name : 'Inconnu'
}

const getMemberAvatar = (id) => {
  const m = store.members.find(m => m.id === id)
  return m ? m.avatar : '👤'
}

const getPriorityClass = (priority) => {
  switch (priority) {
    case 'Haute': return 'badge-rose'
    case 'Moyenne': return 'badge-amber'
    default: return 'badge-emerald'
  }
}

const handleAddTask = () => {
  if (!newTask.value.title.trim()) return
  store.addTask(newTask.value)
  showAddModal.value = false
  newTask.value = {
    title: '',
    category: 'Maison',
    assignedTo: store.members[0]?.id || 1,
    priority: 'Moyenne'
  }
}
</script>

<style scoped>
.text-indigo { color: var(--accent-primary); }
.margin-bottom-lg { margin-bottom: 2rem; }

.filters-bar {
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.filter-pill {
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.825rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-pill.active {
  background: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
}

.select-sm {
  width: auto;
  padding: 0.35rem 0.85rem;
}

/* Tasks Grid */
.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
}

.task-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
}

.task-card.completed {
  opacity: 0.6;
}

.task-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-icon-delete {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);
}
.btn-icon-delete:hover {
  color: var(--accent-rose);
}

.task-checkbox-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
}

.custom-checkbox-lg {
  width: 22px;
  height: 22px;
  margin-top: 0.15rem;
  accent-color: var(--accent-primary);
}

.task-title-text {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.task-card.completed .task-title-text {
  text-decoration: line-through;
}

.task-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.assignee-info {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.avatar-sm { font-size: 1.1rem; }
.assignee-name { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }



/* Modal */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
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

.empty-card {
  padding: 3rem;
  text-align: center;
  color: var(--text-muted);
}
</style>
