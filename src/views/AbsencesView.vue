<template>
  <div class="absences-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <UtensilsCrossed :size="28" class="text-indigo" />
          <span>Absences & Repas</span>
        </h1>
        <p class="page-subtitle">Indiquez vos absences au déjeuner, au dîner ou pour la nuit afin d'organiser sereinement les repas de famille.</p>
      </div>

      <button @click="openAddModal()" class="btn btn-primary">
        <Plus :size="18" />
        <span>Signaler une Absence</span>
      </button>
    </div>

    <!-- Today's Meal Summary Banner -->
    <div class="today-banner glass-card">
      <div class="today-banner-header">
        <div class="today-title">
          <CalendarCheck :size="18" class="text-indigo" />
          <span>Présences & Repas d'Aujourd'hui ({{ formatDisplayDate(store.todayStr) }})</span>
        </div>
        <button @click="openAddModal(store.todayStr)" class="btn-today-add">
          <Plus :size="14" /> Signaler pour aujourd'hui
        </button>
      </div>

      <div class="today-slots-grid">
        <!-- Déjeuner -->
        <div class="meal-slot-card" :class="{ 'has-absents': todayLunchAbsents.length > 0 }">
          <div class="slot-header">
            <span class="slot-icon">☀️</span>
            <span class="slot-name">Déjeuner (Midi)</span>
            <span class="slot-count" :class="todayLunchAbsents.length > 0 ? 'badge-warning' : 'badge-success'">
              {{ todayLunchAbsents.length > 0 ? `${todayLunchAbsents.length} absent(s)` : 'Au complet !' }}
            </span>
          </div>
          <div class="slot-members-list">
            <div v-if="todayLunchAbsents.length > 0" class="absent-chips">
              <span 
                v-for="abs in todayLunchAbsents" 
                :key="abs.id" 
                class="member-absent-chip"
                :title="abs.note ? `Motif: ${abs.note}` : 'Absent'"
                @click="openEditModal(abs)"
              >
                {{ getMemberAvatar(abs.memberId) }} {{ getMemberName(abs.memberId) }}
              </span>
            </div>
            <span v-else class="all-present-text">🎉 Toute la famille déjeune ensemble</span>
          </div>
        </div>

        <!-- Dîner -->
        <div class="meal-slot-card" :class="{ 'has-absents': todayDinnerAbsents.length > 0 }">
          <div class="slot-header">
            <span class="slot-icon">🌙</span>
            <span class="slot-name">Dîner (Soir)</span>
            <span class="slot-count" :class="todayDinnerAbsents.length > 0 ? 'badge-warning' : 'badge-success'">
              {{ todayDinnerAbsents.length > 0 ? `${todayDinnerAbsents.length} absent(s)` : 'Au complet !' }}
            </span>
          </div>
          <div class="slot-members-list">
            <div v-if="todayDinnerAbsents.length > 0" class="absent-chips">
              <span 
                v-for="abs in todayDinnerAbsents" 
                :key="abs.id" 
                class="member-absent-chip"
                :title="abs.note ? `Motif: ${abs.note}` : 'Absent'"
                @click="openEditModal(abs)"
              >
                {{ getMemberAvatar(abs.memberId) }} {{ getMemberName(abs.memberId) }}
              </span>
            </div>
            <span v-else class="all-present-text">🎉 Tout le monde dîne à la maison</span>
          </div>
        </div>

        <!-- Nuit -->
        <div class="meal-slot-card" :class="{ 'has-absents': todayNightAbsents.length > 0 }">
          <div class="slot-header">
            <span class="slot-icon">🛌</span>
            <span class="slot-name">Nuit</span>
            <span class="slot-count" :class="todayNightAbsents.length > 0 ? 'badge-warning' : 'badge-success'">
              {{ todayNightAbsents.length > 0 ? `${todayNightAbsents.length} absent(s)` : 'Au complet !' }}
            </span>
          </div>
          <div class="slot-members-list">
            <div v-if="todayNightAbsents.length > 0" class="absent-chips">
              <span 
                v-for="abs in todayNightAbsents" 
                :key="abs.id" 
                class="member-absent-chip"
                :title="abs.note ? `Motif: ${abs.note}` : 'Dort ailleurs'"
                @click="openEditModal(abs)"
              >
                {{ getMemberAvatar(abs.memberId) }} {{ getMemberName(abs.memberId) }}
              </span>
            </div>
            <span v-else class="all-present-text">💤 Tout le monde dort à la maison</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter by Member -->
    <div class="filter-bar">
      <span class="filter-label">Filtrer par membre :</span>
      <div class="filter-pills">
        <button 
          class="filter-pill" 
          :class="{ active: selectedMemberFilter === null }"
          @click="selectedMemberFilter = null"
        >
          Tous les membres
        </button>
        <button 
          v-for="member in store.members" 
          :key="member.id"
          class="filter-pill"
          :class="{ active: selectedMemberFilter === member.id }"
          @click="selectedMemberFilter = member.id"
        >
          <span>{{ member.avatar }}</span>
          <span>{{ member.firstName || member.name.split(' ')[0] }}</span>
        </button>
      </div>
    </div>

    <!-- Main Grid: Calendar & Upcoming List -->
    <div class="grid-2 absences-main-grid">
      <!-- Calendar View Column -->
      <div class="glass-card section-card">
        <div class="section-card-header flex-between">
          <div class="calendar-nav-title">
            <h2>{{ currentMonthName }} {{ currentYear }}</h2>
          </div>
          <div class="calendar-nav-controls">
            <button @click="prevMonth" class="btn-icon" title="Mois précédent">
              <ChevronLeft :size="18" />
            </button>
            <button @click="goToToday" class="btn-today-nav">
              Aujourd'hui
            </button>
            <button @click="nextMonth" class="btn-icon" title="Mois suivant">
              <ChevronRight :size="18" />
            </button>
          </div>
        </div>

        <!-- Days of week -->
        <div class="calendar-grid-header">
          <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
        </div>

        <!-- Calendar Days Grid -->
        <div class="calendar-days-grid">
          <!-- Leading empty/padding days -->
          <div 
            v-for="pad in leadingPaddingDays" 
            :key="'pad-' + pad" 
            class="day-cell day-empty"
          ></div>

          <!-- Month Days -->
          <div 
            v-for="day in daysInCurrentMonth" 
            :key="'day-' + day"
            class="day-cell"
            :class="{ 
              today: isDayToday(day),
              'has-absences': getDayAbsences(day).length > 0
            }"
            @click="openAddModal(formatDateStr(currentYear, currentMonth, day))"
            :title="'Cliquer pour signaler une absence le ' + day + ' ' + currentMonthName"
          >
            <div class="day-cell-top">
              <span class="day-number">{{ day }}</span>
              <button 
                class="day-add-mini-btn" 
                @click.stop="openAddModal(formatDateStr(currentYear, currentMonth, day))"
                title="Ajouter une absence ce jour"
              >
                +
              </button>
            </div>

            <!-- Absences inside this day -->
            <div class="day-absences-container">
              <div 
                v-for="abs in getDayAbsences(day)" 
                :key="abs.id" 
                class="day-absence-chip"
                @click.stop="openEditModal(abs)"
                :title="getAbsenceTooltip(abs)"
              >
                <span class="chip-avatar">{{ getMemberAvatar(abs.memberId) }}</span>
                <span class="chip-name">{{ getMemberFirstName(abs.memberId) }}</span>
                <div class="chip-icons">
                  <span v-if="abs.lunch" title="Déjeuner (Midi)">☀️</span>
                  <span v-if="abs.dinner" title="Dîner (Soir)">🌙</span>
                  <span v-if="abs.night" title="Nuit">🛌</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Upcoming Absences Column -->
      <div class="glass-card section-card">
        <div class="section-card-header flex-between">
          <div class="header-title">
            <Clock :size="20" class="text-indigo" />
            <h2>Prochaines Absences</h2>
          </div>
          <span class="badge badge-indigo">{{ filteredUpcomingAbsences.length }} enregistrée(s)</span>
        </div>

        <div class="upcoming-absences-list">
          <div 
            v-for="abs in filteredUpcomingAbsences" 
            :key="abs.id"
            class="upcoming-absence-card"
          >
            <div class="upcoming-avatar-col">
              <span class="upcoming-avatar">{{ getMemberAvatar(abs.memberId) }}</span>
            </div>

            <div class="upcoming-content-col">
              <div class="upcoming-card-header">
                <div class="member-name-date">
                  <strong>{{ getMemberName(abs.memberId) }}</strong>
                  <span class="absence-date-badge" :class="{ 'is-today': abs.date === store.todayStr }">
                    {{ formatRelativeDate(abs.date) }}
                  </span>
                </div>

                <div class="card-action-buttons">
                  <button 
                    v-if="canEdit(abs)" 
                    @click="openEditModal(abs)" 
                    class="btn-icon-action" 
                    title="Modifier cette absence"
                  >
                    <Edit3 :size="14" />
                  </button>
                  <button 
                    v-if="canEdit(abs)" 
                    @click="handleDelete(abs.id)" 
                    class="btn-icon-action text-danger" 
                    title="Supprimer cette absence"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>

              <div class="slots-pill-row">
                <span v-if="abs.lunch" class="slot-tag lunch">
                  ☀️ Déjeuner
                </span>
                <span v-if="abs.dinner" class="slot-tag dinner">
                  🌙 Dîner
                </span>
                <span v-if="abs.night" class="slot-tag night">
                  🛌 Nuit
                </span>
              </div>

              <p v-if="abs.note" class="absence-note-text">
                💬 <em>{{ abs.note }}</em>
              </p>
            </div>
          </div>

          <div v-if="filteredUpcomingAbsences.length === 0" class="empty-state">
            🎉 Aucune absence à venir ! Toute la famille est réunie.
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Signaler / Modifier Absence -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content absence-modal">
        <div class="modal-header">
          <h3>{{ editingId ? 'Modifier l\'Absence' : 'Signaler une Absence' }}</h3>
          <button @click="showModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleSubmit">
          <!-- Member selection -->
          <div class="form-group">
            <label class="form-label">Membre de la famille</label>
            <select v-model="form.memberId" class="form-select" required>
              <option v-for="m in store.members" :key="m.id" :value="m.id">
                {{ m.avatar }} {{ m.name }} {{ m.id === authStore.user?.id ? '(Moi)' : '' }}
              </option>
            </select>
          </div>

          <!-- Date -->
          <div class="form-group">
            <label class="form-label">Date de l'absence</label>
            <input 
              v-model="form.date" 
              type="date" 
              required 
              class="form-input" 
            />
          </div>

          <!-- Slots selection cards -->
          <div class="form-group">
            <label class="form-label">Créneau(x) d'absence :</label>
            <div class="slots-toggle-grid">
              <!-- Déjeuner -->
              <div 
                class="slot-toggle-card" 
                :class="{ active: form.lunch }"
                @click="form.lunch = !form.lunch"
              >
                <div class="slot-toggle-top">
                  <span class="slot-toggle-emoji">☀️</span>
                  <input type="checkbox" v-model="form.lunch" @click.stop class="slot-toggle-check" />
                </div>
                <strong>Déjeuner</strong>
                <span class="slot-toggle-sub">Repas du midi</span>
              </div>

              <!-- Dîner -->
              <div 
                class="slot-toggle-card" 
                :class="{ active: form.dinner }"
                @click="form.dinner = !form.dinner"
              >
                <div class="slot-toggle-top">
                  <span class="slot-toggle-emoji">🌙</span>
                  <input type="checkbox" v-model="form.dinner" @click.stop class="slot-toggle-check" />
                </div>
                <strong>Dîner</strong>
                <span class="slot-toggle-sub">Repas du soir</span>
              </div>

              <!-- Nuit -->
              <div 
                class="slot-toggle-card" 
                :class="{ active: form.night }"
                @click="form.night = !form.night"
              >
                <div class="slot-toggle-top">
                  <span class="slot-toggle-emoji">🛌</span>
                  <input type="checkbox" v-model="form.night" @click.stop class="slot-toggle-check" />
                </div>
                <strong>Nuit</strong>
                <span class="slot-toggle-sub">Dort ailleurs</span>
              </div>
            </div>
            <span v-if="!form.lunch && !form.dinner && !form.night" class="text-error">
              * Veuillez cocher au moins un créneau d'absence.
            </span>
          </div>

          <!-- Note / Reason -->
          <div class="form-group">
            <label class="form-label">Motif / Commentaire (Optionnel)</label>
            <input 
              v-model="form.note" 
              type="text" 
              placeholder="Ex: Invité chez Lucas, Déplacement boulot, Soirée..."
              class="form-input" 
            />
          </div>

          <div class="modal-footer flex-between">
            <button 
              v-if="editingId" 
              type="button" 
              @click="handleDelete(editingId)" 
              class="btn btn-danger"
              :disabled="saving"
            >
              <Trash2 :size="15" />
              <span>Supprimer</span>
            </button>
            <span v-else></span>

            <div class="modal-actions-right">
              <button type="button" @click="showModal = false" class="btn btn-secondary">Annuler</button>
              <button 
                type="submit" 
                class="btn btn-primary" 
                :disabled="saving || (!form.lunch && !form.dinner && !form.night)"
              >
                <span v-if="!saving">{{ editingId ? 'Enregistrer' : 'Signaler l\'absence' }}</span>
                <span v-else>Enregistrement...</span>
              </button>
            </div>
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
  UtensilsCrossed, 
  CalendarCheck, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight 
} from '@lucide/vue'

const authStore = useAuthStore()
const store = useFamilyStore()

// Filter State
const selectedMemberFilter = ref(null)

// Modal State
const showModal = ref(false)
const editingId = ref(null)
const saving = ref(false)

const form = ref({
  memberId: authStore.user?.id || 1,
  date: store.todayStr,
  lunch: false,
  dinner: false,
  night: false,
  note: ''
})

// Calendar Month State
const todayDate = new Date()
const currentYear = ref(todayDate.getFullYear())
const currentMonth = ref(todayDate.getMonth()) // 0-indexed

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const currentMonthName = computed(() => monthNames[currentMonth.value])

const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const goToToday = () => {
  currentYear.value = todayDate.getFullYear()
  currentMonth.value = todayDate.getMonth()
}

// Days in current month
const daysInCurrentMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
})

// Number of leading blank cells (Monday = 1, Sunday = 7)
const leadingPaddingDays = computed(() => {
  const firstDay = new Date(currentYear.value, currentMonth.value, 1).getDay()
  // Sunday is 0 in JS -> convert so Monday is 0, Sunday is 6
  return (firstDay + 6) % 7
})

const formatDateStr = (y, m, d) => {
  const mm = String(m + 1).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

const isDayToday = (day) => {
  const check = formatDateStr(currentYear.value, currentMonth.value, day)
  return check === store.todayStr
}

// Helpers
const getMemberName = (id) => {
  const m = store.members.find(m => m.id === id)
  return m ? m.name : 'Membre'
}

const getMemberFirstName = (id) => {
  const m = store.members.find(m => m.id === id)
  return m ? (m.firstName || m.name.split(' ')[0]) : 'Membre'
}

const getMemberAvatar = (id) => {
  const m = store.members.find(m => m.id === id)
  return m ? m.avatar : '👤'
}

const canEdit = (abs) => {
  if (!authStore.user) return false
  return authStore.isAdmin || abs.memberId === authStore.user.id
}

// Filtered Absences
const filteredAbsences = computed(() => {
  if (!selectedMemberFilter.value) return store.absences
  return store.absences.filter(a => a.memberId === selectedMemberFilter.value)
})

const getDayAbsences = (day) => {
  const dateStr = formatDateStr(currentYear.value, currentMonth.value, day)
  return filteredAbsences.value.filter(a => a.date === dateStr)
}

const getAbsenceTooltip = (abs) => {
  const parts = []
  if (abs.lunch) parts.push('Déjeuner (Midi)')
  if (abs.dinner) parts.push('Dîner (Soir)')
  if (abs.night) parts.push('Nuit')
  return `${getMemberName(abs.memberId)} : Absent(e) ${parts.join(', ')}${abs.note ? ` (${abs.note})` : ''}`
}

// Today Banner Computeds
const todayLunchAbsents = computed(() => {
  return store.todayAbsences.filter(a => a.lunch)
})

const todayDinnerAbsents = computed(() => {
  return store.todayAbsences.filter(a => a.dinner)
})

const todayNightAbsents = computed(() => {
  return store.todayAbsences.filter(a => a.night)
})

const filteredUpcomingAbsences = computed(() => {
  if (!selectedMemberFilter.value) return store.upcomingAbsences
  return store.upcomingAbsences.filter(a => a.memberId === selectedMemberFilter.value)
})

// Dates formatting
const formatDisplayDate = (dStr) => {
  if (!dStr) return ''
  const [y, m, d] = dStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

const formatRelativeDate = (dStr) => {
  if (dStr === store.todayStr) return 'Aujourd\'hui'
  
  const [y, m, d] = dStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  
  const tmrw = new Date()
  tmrw.setDate(tmrw.getDate() + 1)
  const tmrwStr = `${tmrw.getFullYear()}-${String(tmrw.getMonth() + 1).padStart(2, '0')}-${String(tmrw.getDate()).padStart(2, '0')}`
  if (dStr === tmrwStr) return 'Demain'

  return dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

// Modal actions
const openAddModal = (defaultDate = null) => {
  editingId.value = null
  form.value = {
    memberId: authStore.user?.id || (store.members[0]?.id || 1),
    date: defaultDate || store.todayStr,
    lunch: true,
    dinner: false,
    night: false,
    note: ''
  }
  showModal.value = true
}

const openEditModal = (abs) => {
  editingId.value = abs.id
  form.value = {
    memberId: abs.memberId,
    date: abs.date,
    lunch: Boolean(abs.lunch),
    dinner: Boolean(abs.dinner),
    night: Boolean(abs.night),
    note: abs.note || ''
  }
  showModal.value = true
}

const handleSubmit = async () => {
  if (!form.value.lunch && !form.value.dinner && !form.value.night) return
  saving.value = true

  if (editingId.value) {
    await store.updateAbsence(editingId.value, form.value)
  } else {
    await store.addAbsence(form.value)
  }

  saving.value = false
  showModal.value = false
}

const handleDelete = async (id) => {
  if (confirm('Voulez-vous vraiment supprimer cette absence ?')) {
    saving.value = true
    await store.deleteAbsence(id)
    saving.value = false
    showModal.value = false
  }
}
</script>

<style scoped>
.absences-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Today Banner */
.today-banner {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.04));
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.today-banner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.today-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  text-transform: capitalize;
}

.btn-today-add {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-full);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  transition: all var(--transition-fast);
}

.btn-today-add:hover {
  background: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
}

.today-slots-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.meal-slot-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  transition: all var(--transition-fast);
}

.meal-slot-card.has-absents {
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.03);
}

.slot-header {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.slot-icon {
  font-size: 1.15rem;
}

.slot-name {
  font-weight: 700;
  font-size: 0.9rem;
  flex: 1;
}

.slot-count {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-full);
}

.badge-success {
  background: var(--accent-emerald-light);
  color: var(--accent-emerald);
}

.badge-warning {
  background: var(--accent-amber-light);
  color: var(--accent-amber);
}

.absent-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.member-absent-chip {
  background: var(--accent-amber-light);
  color: var(--accent-amber);
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.member-absent-chip:hover {
  transform: scale(1.05);
}

.all-present-text {
  font-size: 0.78rem;
  color: var(--text-muted);
}

/* Filter Bar */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.filter-pill {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-full);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: all var(--transition-fast);
}

.filter-pill:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.filter-pill.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: white;
}

/* Main Grid */
.absences-main-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

.calendar-nav-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-today-nav {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-today-nav:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

/* Calendar Grid */
.calendar-grid-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-weight: 700;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.calendar-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.35rem;
}

.day-cell {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  min-height: 75px;
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  position: relative;
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.day-cell:hover {
  border-color: var(--accent-primary);
  background: var(--bg-card);
}

.day-cell.day-empty {
  background: transparent;
  border-color: transparent;
  cursor: default;
}

.day-cell.today {
  border-color: var(--accent-primary);
  background: var(--accent-primary-light);
}

.day-cell-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.day-number {
  font-size: 0.8rem;
  font-weight: 700;
}

.day-cell.today .day-number {
  color: var(--accent-primary);
}

.day-add-mini-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  opacity: 0;
  padding: 0 0.2rem;
  transition: opacity var(--transition-fast), color var(--transition-fast);
}

.day-cell:hover .day-add-mini-btn {
  opacity: 1;
}

.day-add-mini-btn:hover {
  color: var(--accent-primary);
}

.day-absences-container {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-top: 0.25rem;
  overflow: hidden;
}

.day-absence-chip {
  background: var(--accent-amber-light);
  color: var(--text-primary);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 4px;
  padding: 0.15rem 0.25rem;
  font-size: 0.68rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: transform var(--transition-fast);
}

.day-absence-chip:hover {
  transform: scale(1.04);
}

.chip-avatar {
  font-size: 0.8rem;
  line-height: 1;
}

.chip-name {
  font-weight: 700;
  font-size: 0.65rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-icons {
  font-size: 0.7rem;
  margin-left: auto;
  letter-spacing: -0.05em;
}

/* Upcoming Absences List */
.upcoming-absences-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 520px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.upcoming-absence-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.85rem;
  display: flex;
  gap: 0.75rem;
  transition: border-color var(--transition-fast);
}

.upcoming-absence-card:hover {
  border-color: var(--accent-primary);
}

.upcoming-avatar {
  font-size: 1.75rem;
  display: block;
}

.upcoming-content-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.upcoming-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.member-name-date {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.absence-date-badge {
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
}

.absence-date-badge.is-today {
  background: var(--accent-amber-light);
  color: var(--accent-amber);
  border-color: rgba(245, 158, 11, 0.4);
}

.card-action-buttons {
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
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-fast);
}

.btn-icon-action:hover {
  color: var(--accent-primary);
}

.btn-icon-action.text-danger:hover {
  color: var(--accent-rose);
}

.slots-pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.slot-tag {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-full);
}

.slot-tag.lunch {
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
}

.slot-tag.dinner {
  background: rgba(99, 102, 241, 0.15);
  color: var(--accent-primary);
}

.slot-tag.night {
  background: rgba(139, 92, 246, 0.15);
  color: var(--accent-purple);
}

.absence-note-text {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
}

/* Modal Styling */
.absence-modal {
  max-width: 460px;
}

.slots-toggle-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.65rem;
}

.slot-toggle-card {
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  gap: 0.25rem;
  text-align: center;
  transition: all var(--transition-fast);
}

.slot-toggle-card:hover {
  border-color: var(--accent-primary);
  transform: translateY(-2px);
}

.slot-toggle-card.active {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-primary);
}

.slot-toggle-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 0.25rem;
}

.slot-toggle-emoji {
  font-size: 1.25rem;
}

.slot-toggle-check {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-primary);
}

.slot-toggle-sub {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.text-error {
  font-size: 0.75rem;
  color: var(--accent-rose);
  margin-top: 0.35rem;
  display: block;
}

@media (max-width: 900px) {
  .today-slots-grid {
    grid-template-columns: 1fr;
  }
  .absences-main-grid {
    grid-template-columns: 1fr;
  }
  .day-cell {
    min-height: 60px;
  }
  .chip-name {
    display: none;
  }
}
</style>
