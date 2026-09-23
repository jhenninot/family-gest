<template>
  <div class="tasks-view">
    <!-- Filters Bar -->
    <div class="glass-card filters-bar margin-bottom-lg">
      <div class="filters-group-wrap">
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
              {{ getAvatarTextFallback(m.avatar) }} {{ m.name }}
            </option>
          </select>
        </div>
      </div>

      <button @click="openAddModal" class="btn btn-primary">
        <Plus :size="18" />
        <span>Ajouter une Tâche</span>
      </button>
    </div>

    <!-- Tasks Grid / Cards -->
    <div class="tasks-grid">
      <div 
        v-for="task in filteredTasks" 
        :key="task.id"
        class="glass-card task-card"
        :class="{ completed: task.completed, urgent: isTaskUrgent(task) }"
      >
        <div class="task-card-header">
          <span v-if="isTaskUrgent(task)" class="badge badge-rose">Urgente 🔥</span>
          <span class="badge" :class="getPriorityClass(task.priority)">
            {{ task.priority }}
          </span>
          <span class="badge badge-purple">{{ task.category }}</span>

          <div class="task-card-actions">
            <button @click="openEditModal(task)" class="btn-icon-action" title="Modifier">
              <Pencil :size="16" />
            </button>
            <button @click="handleDeleteTask(task)" class="btn-icon-action delete" title="Supprimer">
              <Trash2 :size="16" />
            </button>
          </div>
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
            <UserAvatar :avatar="getMemberAvatar(task.assignedTo)" :name="getMemberName(task.assignedTo)" size="xs" />
            <span class="assignee-name">{{ getMemberName(task.assignedTo) }}</span>
          </div>
          <span v-if="task.dueDate" class="due-date" :class="{ overdue: isTaskUrgent(task) }" :title="'Échéance : ' + formatDueDate(task.dueDate, true)">
            <CalendarClock :size="14" />
            {{ formatDueDate(task.dueDate) }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="filteredTasks.length === 0" class="glass-card empty-card">
      <p>Aucune tâche trouvée avec ces filtres.</p>
    </div>

    <!-- Modal Ajouter / Modifier une Tâche -->
    <div v-if="showTaskModal" class="modal-overlay" @click.self="closeTaskModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingTaskId ? 'Modifier la tâche' : 'Nouvelle Tâche' }}</h3>
          <button @click="closeTaskModal" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleSubmitTask">
          <div class="form-group">
            <label class="form-label">Titre de la tâche</label>
            <input 
              v-model="taskForm.title" 
              type="text" 
              required 
              placeholder="ex: Nettoyer la cuisine..."
              class="form-input" 
            />
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Catégorie</label>
              <select v-model="taskForm.category" class="form-select">
                <option value="Maison">Maison</option>
                <option value="Cuisine">Cuisine</option>
                <option value="Jardin">Jardin</option>
                <option value="Chambre">Chambre</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Attribuer à</label>
              <select v-model="taskForm.assignedTo" class="form-select">
                <option v-for="m in store.members" :key="m.id" :value="m.id">
                  {{ getAvatarTextFallback(m.avatar) }} {{ m.name }} ({{ m.role }})
                </option>
              </select>
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Priorité</label>
              <select v-model="taskForm.priority" class="form-select">
                <option value="Basse">Basse</option>
                <option value="Moyenne">Moyenne</option>
                <option value="Haute">Haute</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Échéance (optionnel)</label>
              <input v-model="taskForm.dueDate" type="date" class="form-input" />
              <p class="form-hint">À cette date, la tâche devient urgente et un rappel est envoyé chaque jour à la personne assignée.</p>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="closeTaskModal" class="btn btn-secondary">Annuler</button>
            <button type="submit" class="btn btn-primary">{{ editingTaskId ? 'Enregistrer' : 'Créer la tâche' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFamilyStore } from '../stores/familyStore'
import { CheckSquare, Plus, Trash2, Pencil, CalendarClock } from '@lucide/vue'
import UserAvatar from '../components/UserAvatar.vue'
import { getAvatarTextFallback } from '../utils/avatarHelper'
import { useConfirm } from '../composables/useConfirm'
import { escapeHtml } from '../utils/escapeHtml'

const store = useFamilyStore()
const { confirm } = useConfirm()

const statusFilter = ref('all')
const memberFilter = ref('all')
const showTaskModal = ref(false)
const editingTaskId = ref(null)

const emptyTaskForm = () => ({
  title: '',
  category: 'Maison',
  assignedTo: store.members[0]?.id || 1,
  priority: 'Moyenne',
  dueDate: ''
})

const taskForm = ref(emptyTaskForm())

// Une tâche non terminée devient urgente dès que son échéance est atteinte ou dépassée.
const isTaskUrgent = (task) => !task.completed && Boolean(task.dueDate) && task.dueDate <= store.todayStr

const formatDueDate = (dateStr, long = false) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return dateStr
  if (!long) {
    if (dateStr === store.todayStr) return "Aujourd'hui"
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  }
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// Les tâches urgentes remontent en tête, les plus anciennes échéances d'abord ; l'ordre
// d'origine (plus récentes d'abord) est conservé pour les autres.
const filteredTasks = computed(() => {
  const list = store.tasks.filter(t => {
    // Status filter
    if (statusFilter.value === 'pending' && t.completed) return false
    if (statusFilter.value === 'completed' && !t.completed) return false

    // Member filter
    if (memberFilter.value !== 'all' && t.assignedTo !== Number(memberFilter.value)) return false

    return true
  })
  const urgent = list.filter(isTaskUrgent).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  return [...urgent, ...list.filter(t => !isTaskUrgent(t))]
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

const handleDeleteTask = async (task) => {
  const ok = await confirm({
    title: 'Supprimer la tâche',
    message: `Voulez-vous vraiment supprimer la tâche « ${escapeHtml(task.title)} » ?`,
    description: 'Cette action est irréversible.',
    confirmText: 'Supprimer',
    type: 'danger'
  })
  if (ok) {
    store.deleteTask(task.id)
  }
}

const openAddModal = () => {
  editingTaskId.value = null
  taskForm.value = emptyTaskForm()
  showTaskModal.value = true
}

const openEditModal = (task) => {
  editingTaskId.value = task.id
  taskForm.value = {
    title: task.title,
    category: task.category || 'Maison',
    assignedTo: task.assignedTo,
    priority: task.priority || 'Moyenne',
    dueDate: task.dueDate || ''
  }
  showTaskModal.value = true
}

const closeTaskModal = () => {
  showTaskModal.value = false
  editingTaskId.value = null
}

const handleSubmitTask = async () => {
  const title = taskForm.value.title.trim()
  if (!title) return
  const payload = { ...taskForm.value, title }
  if (editingTaskId.value) {
    await store.updateTask(editingTaskId.value, payload)
  } else {
    await store.addTask(payload)
  }
  closeTaskModal()
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

.filters-group-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
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

.task-card.urgent {
  border-color: var(--accent-rose);
}

.task-card-actions {
  margin-left: auto;
  display: flex;
  gap: 0.25rem;
}

.btn-icon-action {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);
}
.btn-icon-action:hover {
  color: var(--accent-primary);
}
.btn-icon-action.delete:hover {
  color: var(--accent-rose);
}

.due-date {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.due-date.overdue {
  color: var(--accent-rose);
}

.form-hint {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  color: var(--text-muted);
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
