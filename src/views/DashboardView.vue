<template>
  <div class="dashboard-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <span>Bonjour {{ authStore.user?.firstName || 'la Famille' }} !</span> 👋
        </h1>
        <p class="page-subtitle">Voici l'aperçu de l'organisation et des activités d'aujourd'hui.</p>
      </div>

      <div class="quick-actions">
        <!-- Add Member Button: Only visible to Admin -->
        <button v-if="authStore.isAdmin" @click="showAddMemberModal = true" class="btn btn-secondary">
          <UserPlus :size="18" />
          <span>+ Ajouter un Membre</span>
        </button>

        <router-link to="/tasks" class="btn btn-primary">
          <Plus :size="18" />
          <span>Nouvelle Tâche</span>
        </router-link>
      </div>
    </div>

    <!-- Summary Metrics Grid -->
    <div class="grid-4 metric-grid">
      <!-- Card 1: Task Completion -->
      <router-link to="/tasks" class="glass-card metric-card clickable-card">
        <div class="metric-icon-wrapper indigo">
          <CheckSquare :size="22" />
        </div>
        <div class="metric-details">
          <span class="metric-label">Progression des Tâches</span>
          <div class="metric-value">{{ store.taskCompletionPercentage }}%</div>
          <div class="progress-bar-bg margin-top-xs">
            <div class="progress-bar-fill" :style="{ width: store.taskCompletionPercentage + '%' }"></div>
          </div>
          <span class="metric-subtext">{{ store.pendingTasksCount }} tâche(s) en attente</span>
        </div>
      </router-link>

      <!-- Card 2: Upcoming Events -->
      <router-link to="/calendar" class="glass-card metric-card clickable-card">
        <div class="metric-icon-wrapper purple">
          <Calendar :size="22" />
        </div>
        <div class="metric-details">
          <span class="metric-label">Événements à venir</span>
          <div class="metric-value">{{ store.events.length }}</div>
          <span class="metric-subtext" v-if="nextEvent">
            Prochain : {{ nextEvent.title }} ({{ formatDate(nextEvent.date) }})
          </span>
          <span class="metric-subtext" v-else>Aucun événement planifié</span>
        </div>
      </router-link>

      <!-- Card 3: Absences & Meals Today -->
      <router-link to="/absences" class="glass-card metric-card clickable-card">
        <div class="metric-icon-wrapper emerald">
          <UtensilsCrossed :size="22" />
        </div>
        <div class="metric-details">
          <span class="metric-label">Repas du Jour</span>
          <div class="metric-value" :class="{ 'metric-value-text': store.todayAbsences.length === 0 }">
            {{ store.todayAbsences.length === 0 ? 'Au complet' : `${store.todayAbsences.length} absent(s)` }}
          </div>
          <span class="metric-subtext">
            {{ store.todayAbsences.length === 0 ? 'Aucune absence signalée' : formatTodayAbsencesSubtext() }}
          </span>
        </div>
      </router-link>

      <!-- Card 4: Shopping Items -->
      <router-link to="/shopping" class="glass-card metric-card clickable-card">
        <div class="metric-icon-wrapper amber">
          <ShoppingCart :size="22" />
        </div>
        <div class="metric-details">
          <span class="metric-label">Articles à Acheter</span>
          <div class="metric-value">{{ store.pendingShoppingCount }}</div>
          <span class="metric-subtext">
            {{ urgentShoppingCount }} article(s) urgent(s)
          </span>
        </div>
      </router-link>
    </div>

    <!-- Main Content Section: 2 Columns -->
    <div class="grid-2 dashboard-main-grid">
      <!-- Column 1: Today's Tasks Checklist -->
      <div class="glass-card section-card">
        <div class="section-card-header">
          <div class="header-title">
            <CheckSquare :size="20" class="text-indigo" />
            <h2>Tâches à Réaliser</h2>
          </div>
          <router-link to="/tasks" class="view-all-link">Tout voir &rarr;</router-link>
        </div>

        <div class="tasks-list">
          <div 
            v-for="task in dashboardTasks" 
            :key="task.id"
            class="task-item-row"
            :class="{ completed: task.completed }"
          >
            <input 
              type="checkbox" 
              :checked="task.completed" 
              @change="store.toggleTask(task.id)" 
              class="custom-checkbox"
            />
            <div class="task-info">
              <span class="task-title-text">{{ task.title }}</span>
              <div class="task-meta">
                <span class="badge badge-indigo">{{ task.category }}</span>
                <span class="assigned-tag">
                  {{ getMemberName(task.assignedTo) }}
                </span>
              </div>
            </div>
            <span class="task-points-pill">+{{ task.points }} pts</span>
          </div>

          <div v-if="dashboardTasks.length === 0" class="empty-state">
            🎉 Toutes les tâches sont terminées ! Bravo !
          </div>
        </div>
      </div>

      <!-- Column 2: Upcoming Calendar Events & Members Overview -->
      <div class="dashboard-column-right">
        <!-- Events List Widget -->
        <div class="glass-card section-card margin-bottom-md">
          <div class="section-card-header">
            <div class="header-title">
              <Calendar :size="20" class="text-purple" />
              <h2>Prochains Événements</h2>
            </div>
            <router-link to="/calendar" class="view-all-link">Voir l'agenda &rarr;</router-link>
          </div>

          <div class="events-list">
            <div 
              v-for="event in dashboardEvents" 
              :key="event.id"
              class="event-item-row"
            >
              <div class="event-date-box" :style="{ borderColor: event.color }">
                <span class="event-day">{{ getDayNumber(event.date) }}</span>
                <span class="event-month">{{ getMonthShort(event.date) }}</span>
              </div>
              <div class="event-details">
                <span class="event-item-title">{{ event.title }}</span>
                <div class="event-meta-info">
                  <Clock :size="14" />
                  <span>{{ event.time }}</span>
                  <MapPin :size="14" class="margin-left-xs" />
                  <span>{{ event.location }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Members Points & Rewards -->
        <div class="glass-card section-card">
          <div class="section-card-header">
            <div class="header-title">
              <Users :size="20" class="text-amber" />
              <h2>Membres ({{ store.members.length }})</h2>
            </div>

            <!-- Only Admin can see + Membre button -->
            <button v-if="authStore.isAdmin" @click="showAddMemberModal = true" class="btn btn-sm btn-secondary">
              <UserPlus :size="14" />
              <span>+ Membre</span>
            </button>
            <span v-else class="admin-only-tag" title="Seul l'administrateur peut gérer les membres">
              <ShieldAlert :size="14" /> Lecture seule
            </span>
          </div>

          <!-- Members Grid (Clickable by Admin to Edit Member) -->
          <div class="members-cards-grid">
            <div 
              v-for="member in store.members" 
              :key="member.id" 
              class="member-card"
              :class="{ clickable: authStore.isAdmin }"
              @click="authStore.isAdmin && openEditMemberModal(member)"
              :title="authStore.isAdmin ? 'Cliquez pour modifier les informations de ce membre' : ''"
            >
              <div class="member-card-header">
                <span class="avatar-emoji">{{ member.avatar }}</span>
                <div class="member-card-name">
                  <div class="member-title-line">
                    <strong>{{ member.name }}</strong>
                    <span v-if="member.isAdmin" class="admin-badge-mini" title="Administrateur">
                      <ShieldCheck :size="12" /> Admin
                    </span>
                  </div>
                  <span>{{ member.role }}</span>
                  <span v-if="member.email" class="member-email-sub">{{ member.email }}</span>
                </div>

                <div class="member-actions">
                  <span class="pts-badge" :style="{ backgroundColor: member.color + '20', color: member.color }">
                    {{ member.points }} pts
                  </span>

                  <!-- Edit icon button for Admin -->
                  <button 
                    v-if="authStore.isAdmin" 
                    @click.stop="openEditMemberModal(member)" 
                    class="btn-icon-action"
                    title="Modifier ce membre"
                  >
                    <Edit3 :size="14" />
                  </button>

                  <!-- Toggle Admin status button (Admin only) -->
                  <button 
                    v-if="authStore.isAdmin" 
                    @click.stop="handleToggleAdmin(member)" 
                    class="btn-icon-action"
                    :class="{ 'is-admin': member.isAdmin }"
                    :title="member.isAdmin ? 'Rétrograder en membre standard' : 'Nommer administrateur'"
                  >
                    <ShieldCheck v-if="member.isAdmin" :size="14" />
                    <Shield v-else :size="14" />
                  </button>

                  <!-- Delete member icon (Admin only) -->
                  <button 
                    v-if="authStore.isAdmin" 
                    @click.stop="handleDeleteMember(member)" 
                    class="btn-icon-action delete"
                    title="Supprimer ce membre (Administrateur)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Ajouter un Membre (Administrateur Uniquement) -->
    <div v-if="showAddMemberModal" class="modal-overlay" @click.self="showAddMemberModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Ajouter un Membre de la Famille</h3>
          <button @click="showAddMemberModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleAddMember">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Prénom</label>
              <input 
                v-model="newMember.firstName" 
                type="text" 
                required 
                placeholder="ex: Lucas..."
                class="form-input" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">Nom de famille</label>
              <input 
                v-model="newMember.lastName" 
                type="text" 
                required 
                placeholder="ex: Martin..."
                class="form-input" 
              />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Adresse Email (Login)</label>
              <input 
                v-model="newMember.email" 
                type="email" 
                required 
                placeholder="lucas@family-gest.org"
                class="form-input" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">Mot de passe</label>
              <input 
                v-model="newMember.password" 
                type="password" 
                required 
                placeholder="••••••••"
                class="form-input" 
              />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Rôle familial</label>
              <select v-model="newMember.role" class="form-select">
                <option value="Papa">Papa</option>
                <option value="Maman">Maman</option>
                <option value="Fils">Fils</option>
                <option value="Fille">Fille</option>
                <option value="Grand-Parent">Grand-Parent</option>
                <option value="Oncle / Tante">Oncle / Tante</option>
                <option value="Baby-Sitter">Baby-Sitter</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Statut d'Accès</label>
              <label class="admin-checkbox-card">
                <input type="checkbox" v-model="newMember.isAdmin" class="custom-checkbox" />
                <span class="checkbox-text">
                  <ShieldCheck :size="16" class="text-indigo" />
                  <strong>Définir comme Administrateur</strong>
                </span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Choisissez un Avatar</label>
            <div class="avatar-options">
              <button 
                v-for="emoji in avatarOptions" 
                :key="emoji"
                type="button"
                class="avatar-option-btn"
                :class="{ selected: newMember.avatar === emoji }"
                @click="newMember.avatar = emoji"
              >
                {{ emoji }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Couleur de profil</label>
            <div class="color-picker-options">
              <button 
                v-for="c in colorOptions" 
                :key="c"
                type="button"
                class="color-btn"
                :style="{ backgroundColor: c }"
                :class="{ selected: newMember.color === c }"
                @click="newMember.color = c"
              ></button>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="showAddMemberModal = false" class="btn btn-secondary">Annuler</button>
            <button type="submit" class="btn btn-primary">Créer le membre</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Modifier un Membre (Administrateur Uniquement) -->
    <div v-if="showEditMemberModal" class="modal-overlay" @click.self="showEditMemberModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Modifier le Membre : {{ editingMember?.name }}</h3>
          <button @click="showEditMemberModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleSaveEditMember">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Prénom</label>
              <input 
                v-model="editMemberForm.firstName" 
                type="text" 
                required 
                class="form-input" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">Nom de famille</label>
              <input 
                v-model="editMemberForm.lastName" 
                type="text" 
                required 
                class="form-input" 
              />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Adresse Email (Login)</label>
              <input 
                v-model="editMemberForm.email" 
                type="email" 
                required 
                class="form-input" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">Nouveau Mot de passe (Optionnel)</label>
              <input 
                v-model="editMemberForm.password" 
                type="password" 
                placeholder="Laisser vide pour ne pas changer"
                class="form-input" 
              />
            </div>
          </div>

          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">Rôle familial</label>
              <select v-model="editMemberForm.role" class="form-select">
                <option value="Papa">Papa</option>
                <option value="Maman">Maman</option>
                <option value="Fils">Fils</option>
                <option value="Fille">Fille</option>
                <option value="Grand-Parent">Grand-Parent</option>
                <option value="Oncle / Tante">Oncle / Tante</option>
                <option value="Baby-Sitter">Baby-Sitter</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Points</label>
              <input 
                v-model.number="editMemberForm.points" 
                type="number" 
                min="0" 
                class="form-input" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">Administrateur</label>
              <label class="admin-checkbox-card">
                <input type="checkbox" v-model="editMemberForm.isAdmin" class="custom-checkbox" />
                <span class="checkbox-text">
                  <ShieldCheck :size="16" class="text-indigo" />
                  <strong>Admin</strong>
                </span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Choisissez un Avatar</label>
            <div class="avatar-options">
              <button 
                v-for="emoji in avatarOptions" 
                :key="emoji"
                type="button"
                class="avatar-option-btn"
                :class="{ selected: editMemberForm.avatar === emoji }"
                @click="editMemberForm.avatar = emoji"
              >
                {{ emoji }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Couleur de profil</label>
            <div class="color-picker-options">
              <button 
                v-for="c in colorOptions" 
                :key="c"
                type="button"
                class="color-btn"
                :style="{ backgroundColor: c }"
                :class="{ selected: editMemberForm.color === c }"
                @click="editMemberForm.color = c"
              ></button>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="showEditMemberModal = false" class="btn btn-secondary">Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="savingEdit">
              <span v-if="!savingEdit">Enregistrer les modifications</span>
              <span v-else>Enregistrement...</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { 
  CheckSquare, 
  Calendar, 
  UtensilsCrossed, 
  ShoppingCart, 
  Plus, 
  UserPlus,
  Trash2,
  Clock, 
  MapPin, 
  Users,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Edit3
} from '@lucide/vue'

const authStore = useAuthStore()
const store = useFamilyStore()

const formatTodayAbsencesSubtext = () => {
  if (store.todayAbsences.length === 0) return 'Toute la famille est là 🎉'
  const lunch = store.todayAbsences.filter(a => a.lunch).length
  const dinner = store.todayAbsences.filter(a => a.dinner).length
  const night = store.todayAbsences.filter(a => a.night).length
  const parts = []
  if (lunch > 0) parts.push(`☀️ Midi: ${lunch}`)
  if (dinner > 0) parts.push(`🌙 Soir: ${dinner}`)
  if (night > 0) parts.push(`🛌 Nuit: ${night}`)
  return parts.join(' • ')
}

const showAddMemberModal = ref(false)
const showEditMemberModal = ref(false)
const editingMember = ref(null)
const savingEdit = ref(false)

const avatarOptions = ['👨‍💼', '👩‍⚕️', '👦', '👧', '👶', '🧑', '👨‍🍳', '👵', '👴', '🐱', '🐶']
const colorOptions = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e']

const newMember = ref({
  firstName: '',
  lastName: 'Martin',
  email: '',
  password: 'Family123!',
  role: 'Fils',
  isAdmin: false,
  avatar: '👦',
  color: '#6366f1'
})

const editMemberForm = ref({
  id: null,
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'Membre',
  points: 0,
  isAdmin: false,
  avatar: '👤',
  color: '#6366f1'
})

const dashboardTasks = computed(() => {
  return store.tasks.slice(0, 5)
})

const dashboardEvents = computed(() => {
  return store.events.slice(0, 3)
})

const nextEvent = computed(() => {
  return store.events[0] || null
})

const urgentShoppingCount = computed(() => {
  return store.shoppingList.filter(item => item.urgent && !item.checked).length
})

const getMemberName = (memberId) => {
  const m = store.members.find(m => m.id === memberId)
  return m ? m.name : 'Tous'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const getDayNumber = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).getDate()
}

const getMonthShort = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()
}

const handleAddMember = async () => {
  if (!newMember.value.firstName.trim() || !newMember.value.email.trim() || !newMember.value.password) return

  const result = await store.addMember(newMember.value)
  if (result.success) {
    showAddMemberModal.value = false
    newMember.value = {
      firstName: '',
      lastName: 'Martin',
      email: '',
      password: 'Family123!',
      role: 'Fils',
      isAdmin: false,
      avatar: '👦',
      color: '#6366f1'
    }
  } else {
    alert(result.error || 'Erreur lors de l\'ajout du membre')
  }
}

const openEditMemberModal = (member) => {
  editingMember.value = member
  const nameParts = (member.name || '').split(' ')
  const fName = member.firstName || nameParts[0] || ''
  const lName = member.lastName || nameParts.slice(1).join(' ') || ''

  editMemberForm.value = {
    id: member.id,
    firstName: fName,
    lastName: lName,
    email: member.email || '',
    password: '',
    role: member.role || 'Membre',
    points: member.points || 0,
    isAdmin: Boolean(member.isAdmin),
    avatar: member.avatar || '👤',
    color: member.color || '#6366f1'
  }
  showEditMemberModal.value = true
}

const handleSaveEditMember = async () => {
  if (!editMemberForm.value.firstName.trim() || !editMemberForm.value.email.trim()) return

  if (editingMember.value && editingMember.value.isAdmin && !editMemberForm.value.isAdmin) {
    const adminCount = store.members.filter(m => m.isAdmin).length
    if (adminCount <= 1) {
      alert('Impossible de retirer le statut administrateur : il s\'agit du dernier administrateur du système.')
      return
    }
  }

  savingEdit.value = true
  try {
    const res = await store.updateMember(editMemberForm.value.id, editMemberForm.value)
    if (res.success) {
      showEditMemberModal.value = false
      await store.fetchAllData()
    } else {
      alert(res.error || 'Erreur lors de la modification du membre')
    }
  } catch (err) {
    alert(err.message || 'Erreur lors de l\'enregistrement')
  } finally {
    savingEdit.value = false
  }
}

const handleToggleAdmin = async (member) => {
  if (member.isAdmin) {
    const adminCount = store.members.filter(m => m.isAdmin).length
    if (adminCount <= 1) {
      alert('Impossible de retirer le statut administrateur : il s\'agit du dernier administrateur du système.')
      return
    }
  }
  const action = member.isAdmin ? 'retirer les droits d\'administrateur à' : 'nommer administrateur'
  if (confirm(`Voulez-vous ${action} ${member.name} ?`)) {
    await store.toggleAdminStatus(member.id)
  }
}

const handleDeleteMember = async (member) => {
  if (member.isAdmin) {
    const adminCount = store.members.filter(m => m.isAdmin).length
    if (adminCount <= 1) {
      alert('Impossible de supprimer cet administrateur : il s\'agit du dernier administrateur du système.')
      return
    }
  }
  if (confirm(`Voulez-vous vraiment supprimer ${member.name} de la famille ?`)) {
    await store.deleteMember(member.id)
  }
}
</script>

<style scoped>
.quick-actions {
  display: flex;
  gap: 0.75rem;
}

.metric-grid {
  margin-bottom: 2rem;
}

.metric-card {
  padding: 1.25rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  text-decoration: none !important;
  color: inherit;
}

.metric-card.clickable-card {
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
}

.metric-card.clickable-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: rgba(16, 185, 129, 0.4);
}

.metric-card * {
  text-decoration: none !important;
}

.metric-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.metric-icon-wrapper.indigo { background: linear-gradient(135deg, #6366f1, #818cf8); }
.metric-icon-wrapper.purple { background: linear-gradient(135deg, #8b5cf6, #a78bfa); }
.metric-icon-wrapper.emerald { background: linear-gradient(135deg, #10b981, #34d399); }
.metric-icon-wrapper.amber { background: linear-gradient(135deg, #f59e0b, #fbbf24); }

.metric-details {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.metric-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.metric-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0.15rem 0;
  line-height: 1.2;
}

.metric-value.metric-value-text {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.metric-subtext {
  font-size: 0.775rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.margin-top-xs { margin-top: 0.4rem; }
.margin-bottom-md { margin-bottom: 1.5rem; }
.margin-left-xs { margin-left: 0.5rem; }

.section-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.section-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.header-title h2 {
  font-size: 1.15rem;
  font-weight: 700;
}

.text-indigo { color: var(--accent-primary); }
.text-purple { color: var(--accent-purple); }
.text-amber { color: var(--accent-amber); }

.admin-only-tag {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.view-all-link {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent-primary);
  text-decoration: none;
}
.view-all-link:hover { text-decoration: underline; }

/* Tasks list styling */
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-item-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  transition: all var(--transition-fast);
}

.task-item-row.completed { opacity: 0.65; }
.task-item-row.completed .task-title-text { text-decoration: line-through; }

.custom-checkbox {
  width: 20px;
  height: 20px;
  accent-color: var(--accent-primary);
  cursor: pointer;
}

.task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.task-title-text { font-size: 0.925rem; font-weight: 600; }
.task-meta { display: flex; align-items: center; gap: 0.5rem; }
.assigned-tag { font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; }

.task-points-pill {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--accent-secondary);
  background: var(--accent-secondary-light);
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
}

/* Events list */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.event-item-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.event-date-box {
  width: 44px;
  height: 48px;
  border-left: 4px solid var(--accent-purple);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.event-day { font-size: 1.1rem; font-weight: 800; line-height: 1; }
.event-month { font-size: 0.65rem; font-weight: 700; color: var(--text-muted); }
.event-details { display: flex; flex-direction: column; gap: 0.2rem; }
.event-item-title { font-size: 0.9rem; font-weight: 700; }

.event-meta-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.775rem;
  color: var(--text-muted);
}

/* Members Grid */
.members-cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.member-card {
  padding: 0.85rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.member-card.clickable {
  cursor: pointer;
}

.member-card.clickable:hover {
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  background: var(--bg-card-hover);
}

.member-card-header {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.avatar-emoji { font-size: 1.4rem; }

.member-card-name {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.member-title-line {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.member-card-name strong { font-size: 0.85rem; }
.member-card-name span { font-size: 0.725rem; color: var(--text-muted); }

.admin-badge-mini {
  font-size: 0.625rem;
  font-weight: 800;
  background: var(--accent-rose-light);
  color: var(--accent-rose);
  padding: 0.05rem 0.3rem;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
}

.member-email-sub {
  font-size: 0.675rem;
  color: var(--text-muted);
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.pts-badge {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-full);
}

.btn-icon-action {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.3rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.btn-icon-action.is-admin {
  background: var(--accent-rose-light);
  color: var(--accent-rose);
  border-color: rgba(244, 63, 94, 0.3);
}

.btn-icon-action:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.btn-icon-action.delete:hover {
  border-color: var(--accent-rose);
  color: var(--accent-rose);
}

.admin-checkbox-card {
  display: flex;
  align-items: center;
  padding: 0.6rem 0.85rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  margin-top: 0.2rem;
}

.checkbox-text {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: 0.6rem;
  font-size: 0.85rem;
}

/* Avatar picker options */
.avatar-options { display: flex; flex-wrap: wrap; gap: 0.5rem; }

.avatar-option-btn {
  font-size: 1.5rem;
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-option-btn.selected {
  border-color: var(--accent-primary);
  background: var(--accent-primary-light);
  transform: scale(1.1);
}

.color-picker-options { display: flex; gap: 0.5rem; }

.color-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.color-btn.selected { border-color: var(--text-primary); transform: scale(1.15); }
.empty-state { padding: 2rem; text-align: center; color: var(--text-muted); font-weight: 600; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.btn-close { background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
</style>
