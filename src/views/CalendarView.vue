<template>
  <div class="calendar-view" ref="calendarViewRef">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <CalendarIcon :size="28" class="text-purple" />
          <span>Calendrier familial</span>
        </h1>
        <p class="page-subtitle">Gardez un œil sur les rendez-vous, fêtes et activités de toute la famille.</p>
      </div>

      <button @click="showAddModal = true" class="btn btn-primary">
        <Plus :size="18" />
        <span>Nouvel Événement</span>
      </button>
    </div>

    <!-- Calendar Card (Weekly & Monthly View) -->
    <div class="glass-card section-card calendar-card">
      <div class="section-card-header flex-between">
        <div class="calendar-nav-title">
          <h2>{{ calendarViewMode === 'week' ? currentWeekLabel : `${currentMonthName} ${currentYear}` }}</h2>
        </div>

        <div class="calendar-header-actions">
          <!-- Mode Toggle: Mois / Semaine -->
          <div class="calendar-view-mode-toggle">
            <button 
              class="view-mode-btn" 
              :class="{ active: calendarViewMode === 'month' }" 
              @click="calendarViewMode = 'month'"
              title="Afficher le calendrier mensuel"
            >
              <CalendarIcon :size="15" />
              <span>Mois</span>
            </button>
            <button 
              class="view-mode-btn" 
              :class="{ active: calendarViewMode === 'week' }" 
              @click="calendarViewMode = 'week'"
              title="Afficher le planning hebdomadaire"
            >
              <CalendarRange :size="15" />
              <span>Semaine</span>
            </button>
          </div>

          <div class="calendar-nav-controls">
            <button @click="prevPeriod" class="btn-cal-nav" :title="calendarViewMode === 'week' ? 'Semaine précédente' : 'Mois précédent'">
              <ChevronLeft :size="22" />
            </button>
            <button @click="goToToday" class="btn-today-nav">
              Aujourd'hui
            </button>
            <button @click="nextPeriod" class="btn-cal-nav" :title="calendarViewMode === 'week' ? 'Semaine suivante' : 'Mois suivant'">
              <ChevronRight :size="22" />
            </button>
          </div>
        </div>
      </div>

      <!-- 1. MONTHLY CALENDAR VIEW -->
      <template v-if="calendarViewMode === 'month'">
        <!-- Days of week -->
        <div class="calendar-grid-header">
          <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
        </div>

        <div class="calendar-days-grid">
          <!-- Blank padding for current month -->
          <div 
            v-for="pad in leadingPaddingDays" 
            :key="'pad-' + pad" 
            class="day-cell day-empty"
          ></div>

          <div 
            v-for="day in daysInCurrentMonth" 
            :key="day"
            class="day-cell cell-interactive"
            :class="{ today: isDayToday(day), past: isDayPast(day), 'has-events': hasEventOnDay(day) }"
            @click="handleDayClick(day)"
            :title="`Voir les événements du ${day} ${currentMonthName}`"
          >
            <span class="day-number">{{ day }}</span>
            <div v-if="hasEventOnDay(day)" class="day-dots">
              <span 
                v-for="e in getEventsOnDay(day)" 
                :key="e.id" 
                class="event-dot" 
                :style="{ backgroundColor: e.color }"
                :title="e.title"
              ></span>
            </div>
          </div>
        </div>
      </template>

      <!-- 2. WEEKLY CALENDAR VIEW -->
      <div v-else-if="calendarViewMode === 'week'" class="calendar-week-view">
        <div class="week-days-columns">
          <div 
            v-for="day in weekDays" 
            :key="day.dateStr"
            class="week-day-column"
            :class="{ 'is-today': day.isToday, 'is-past': day.isPast }"
            @click="handleWeekDayClick(day)"
            :title="`Voir les événements du ${day.name} ${day.dayNum} ${day.monthShort}`"
          >
            <!-- Day Header -->
            <div class="week-col-header">
              <div class="week-col-title">
                <span class="day-name-text">{{ day.name }}</span>
                <span class="day-date-text">{{ day.dayNum }} {{ day.monthShort }}</span>
              </div>
              <span v-if="day.isPast" class="past-tag-mini">Passé</span>
            </div>

            <!-- Day Events List -->
            <div class="week-day-events-list">
              <div 
                v-for="ev in day.events" 
                :key="ev.id" 
                class="week-event-card"
                :style="{ borderLeftColor: ev.color }"
                @click.stop="handleSelectEvent(ev)"
                :title="`${ev.title} (${ev.time || 'Toute la journée'})`"
              >
                <div class="week-event-top">
                  <span v-if="ev.time" class="week-event-time">{{ ev.time }}</span>
                  <span class="week-event-cat" :style="{ color: ev.color }">{{ ev.category }}</span>
                </div>
                <span class="week-event-title">{{ ev.title }}</span>
                <span v-if="ev.location" class="week-event-loc">📍 {{ ev.location }}</span>
              </div>

              <!-- Empty Day placeholder -->
              <div v-if="day.events.length === 0" class="week-empty-day">
                <span class="empty-day-txt">Aucun événement</span>
              </div>
            </div>

            <!-- Day Footer -->
            <div class="week-col-footer">
              <span class="week-col-hint">
                {{ day.events.length > 0 ? `${day.events.length} événement${day.events.length > 1 ? 's' : ''}` : (day.isPast ? 'Consulter' : '+ Ajouter') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Ajouter Événement -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Nouvel Événement</h3>
          <button @click="showAddModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleAddEvent">
          <div class="form-group">
            <label class="form-label">Titre de l'événement</label>
            <input 
              v-model="newEvent.title" 
              type="text" 
              required 
              placeholder="ex: Fête d'anniversaire, Match de foot..."
              class="form-input" 
            />
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input v-model="newEvent.date" type="date" :min="store.todayStr" required class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">Heure</label>
              <input v-model="newEvent.time" type="time" class="form-input" />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Catégorie</label>
              <select v-model="newEvent.category" class="form-select">
                <option value="Fête">Fête</option>
                <option value="Santé">Santé</option>
                <option value="Famille">Famille</option>
                <option value="Scolaire">Scolaire</option>
                <option value="Loisirs">Loisirs</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Lieu</label>
              <input v-model="newEvent.location" type="text" placeholder="ex: Maison, École..." class="form-input" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Couleur d'étiquette</label>
            <div class="color-picker-options">
              <button 
                v-for="c in colorOptions" 
                :key="c"
                type="button"
                class="color-btn"
                :style="{ backgroundColor: c }"
                :class="{ selected: newEvent.color === c }"
                @click="newEvent.color = c"
              ></button>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="showAddModal = false" class="btn btn-secondary">Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer l'événement</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Modifier Événement -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Modifier l'Événement</h3>
          <button @click="showEditModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleUpdateEvent">
          <div class="form-group">
            <label class="form-label">Titre de l'événement</label>
            <input 
              v-model="editEventForm.title" 
              type="text" 
              required 
              placeholder="ex: Fête d'anniversaire, Match de foot..."
              class="form-input" 
            />
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input v-model="editEventForm.date" type="date" required class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">Heure</label>
              <input v-model="editEventForm.time" type="time" class="form-input" />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Catégorie</label>
              <select v-model="editEventForm.category" class="form-select">
                <option value="Fête">Fête</option>
                <option value="Santé">Santé</option>
                <option value="Famille">Famille</option>
                <option value="Scolaire">Scolaire</option>
                <option value="Loisirs">Loisirs</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Lieu</label>
              <input v-model="editEventForm.location" type="text" placeholder="ex: Maison, École..." class="form-input" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Couleur d'étiquette</label>
            <div class="color-picker-options">
              <button 
                v-for="c in colorOptions" 
                :key="c"
                type="button"
                class="color-btn"
                :style="{ backgroundColor: c }"
                :class="{ selected: editEventForm.color === c }"
                @click="editEventForm.color = c"
              ></button>
            </div>
          </div>

          <div class="modal-footer flex-between">
            <button type="button" @click="handleDeleteCurrentEvent" class="btn btn-danger">
              <Trash2 :size="15" />
              <span>Supprimer</span>
            </button>
            <div class="modal-actions-right">
              <button type="button" @click="cancelEditModal" class="btn btn-secondary">Annuler</button>
              <button type="submit" class="btn btn-primary">Enregistrer les modifications</button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Confirmation & Export Agenda après création / modification -->
    <div v-if="showSuccessExportModal && justAddedEvent" class="modal-overlay" @click.self="showSuccessExportModal = false">
      <div class="modal-content export-success-modal">
        <div class="modal-header">
          <div class="export-modal-title-group">
            <CalendarPlus :size="22" class="text-purple" />
            <h3>{{ isEditSuccess ? 'Événement Mis à Jour !' : 'Événement Enregistré !' }}</h3>
          </div>
          <button @click="showSuccessExportModal = false" class="btn-close">&times;</button>
        </div>

        <div class="export-modal-body">
          <div class="event-summary-card" :style="{ borderLeftColor: justAddedEvent.color }">
            <h4 class="event-summary-title">{{ justAddedEvent.title }}</h4>
            <div class="event-summary-meta">
              <span class="badge" :style="{ backgroundColor: justAddedEvent.color + '25', color: justAddedEvent.color }">
                {{ justAddedEvent.category }}
              </span>
              <span>📅 {{ formatDate(justAddedEvent.date) }}</span>
              <span v-if="justAddedEvent.time">⏰ {{ justAddedEvent.time }}</span>
              <span v-if="justAddedEvent.location">📍 {{ justAddedEvent.location }}</span>
            </div>
          </div>

          <p class="export-modal-prompt">
            Souhaitez-vous synchroniser cet événement sur votre agenda personnel dès maintenant ?
          </p>

          <div class="export-modal-buttons">
            <button @click="openGoogleCalendar(justAddedEvent)" class="btn-export-full btn-google-full">
              <ExternalLink :size="16" />
              <span>{{ isEditSuccess ? 'Mettre à jour sur Google Agenda' : 'Ajouter à Google Agenda' }}</span>
            </button>

            <button @click="downloadIcsFile(justAddedEvent)" class="btn-export-full btn-ics-full">
              <Download :size="16" />
              <span>Apple Calendrier / Outlook (.ics)</span>
            </button>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="showSuccessExportModal = false" class="btn btn-secondary btn-block">
            Terminer
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Consultation des événements d'un jour -->
    <div v-if="showDayEventsModal" class="modal-overlay" @click.self="showDayEventsModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Événements du {{ selectedDayDisplayTitle }}</h3>
          <button @click="showDayEventsModal = false" class="btn-close">&times;</button>
        </div>

        <div class="day-events-list">
          <div 
            v-for="ev in selectedDayEvents" 
            :key="ev.id" 
            class="timeline-card day-event-clickable"
            @click="handleSelectEvent(ev)"
            title="Cliquer pour afficher les détails et modifier cet événement"
          >
            <div class="timeline-date-strip" :style="{ backgroundColor: ev.color }"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="event-title-text">{{ ev.title }}</span>
                <div class="timeline-header-actions" @click.stop>
                  <span class="badge" :style="{ backgroundColor: ev.color + '25', color: ev.color }">
                    {{ ev.category }}
                  </span>
                  <button @click="handleSelectEvent(ev)" class="btn-action-icon btn-edit" title="Modifier l'événement">
                    <Edit3 :size="15" />
                  </button>
                  <button @click="handleDeleteFromDay(ev.id)" class="btn-action-icon btn-delete" title="Supprimer">
                    <Trash2 :size="15" />
                  </button>
                </div>
              </div>
              <div class="timeline-meta">
                <div class="meta-tag" v-if="ev.time">
                  <Clock :size="14" />
                  <span>{{ ev.time }}</span>
                </div>
                <div class="meta-tag" v-if="ev.location">
                  <MapPin :size="14" />
                  <span>{{ ev.location }}</span>
                </div>
              </div>
              <div class="timeline-export-bar" @click.stop>
                <span class="export-hint">Ajouter à mon agenda :</span>
                <div class="export-btns-row">
                  <button @click="openGoogleCalendar(ev)" class="btn-cal-action btn-cal-google">
                    <ExternalLink :size="12" />
                    <span>Google Agenda</span>
                  </button>
                  <button @click="downloadIcsFile(ev)" class="btn-cal-action btn-cal-ics">
                    <Download :size="12" />
                    <span>Apple / Outlook (.ics)</span>
                  </button>
                </div>
              </div>
              <div class="timeline-click-hint">
                <Edit3 :size="13" />
                <span>Cliquer pour voir le détail et modifier</span>
              </div>
            </div>
          </div>

          <div v-if="selectedDayEvents.length === 0" class="empty-day-state">
            <CalendarIcon :size="36" class="empty-day-icon text-muted" />
            <p>Aucun événement programmé pour cette journée.</p>
            <button v-if="!isCurrentSelectedDayPast" @click="openAddForSelectedDay" class="btn btn-primary btn-sm">
              <Plus :size="15" />
              <span>Ajouter un événement ce jour</span>
            </button>
            <span v-else class="past-day-badge-note">Journée passée (consultation uniquement)</span>
          </div>
        </div>

        <div class="modal-footer flex-between">
          <button v-if="selectedDayEvents.length > 0 && !isCurrentSelectedDayPast" @click="openAddForSelectedDay" class="btn btn-secondary btn-sm">
            <Plus :size="15" />
            <span>Ajouter un événement</span>
          </button>
          <span v-else></span>
          <button @click="showDayEventsModal = false" class="btn btn-secondary">Fermer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFamilyStore } from '../stores/familyStore'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft,
  ChevronRight,
  Plus, 
  Trash2, 
  Edit3,
  Clock, 
  MapPin, 
  ExternalLink, 
  Download, 
  CalendarPlus,
  CalendarRange
} from '@lucide/vue'
import { openGoogleCalendar, downloadIcsFile } from '../utils/calendarExport'
import { useSwipeNavigation } from '../composables/useSwipeNavigation'
import { useConfirm } from '../composables/useConfirm'

const store = useFamilyStore()
const { confirm } = useConfirm()

// Calendar Month Navigation
const todayDate = new Date()
const currentYear = ref(todayDate.getFullYear())
const currentMonth = ref(todayDate.getMonth()) // 0-indexed

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const currentMonthName = computed(() => monthNames[currentMonth.value])

// Calendar View Mode: 'week' or 'month' (default 'week')
const calendarViewMode = ref('week')

function getMonday(d) {
  d = new Date(d)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const currentMonday = ref(getMonday(new Date()))

const prevWeek = () => {
  const d = new Date(currentMonday.value)
  d.setDate(d.getDate() - 7)
  currentMonday.value = d
}

const nextWeek = () => {
  const d = new Date(currentMonday.value)
  d.setDate(d.getDate() + 7)
  currentMonday.value = d
}

const prevPeriod = () => {
  if (calendarViewMode.value === 'week') {
    prevWeek()
  } else {
    prevMonth()
  }
}

const nextPeriod = () => {
  if (calendarViewMode.value === 'week') {
    nextWeek()
  } else {
    nextMonth()
  }
}

// Navigation tactile par swipe (gauche = période suivante, droite = période précédente)
const calendarViewRef = ref(null)
useSwipeNavigation({
  target: calendarViewRef,
  onSwipeLeft: nextPeriod,
  onSwipeRight: prevPeriod
})

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
  currentMonday.value = getMonday(new Date())
}

const weekDays = computed(() => {
  const days = []
  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
  const monthNamesList = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
  const base = new Date(currentMonday.value)
  const todayStr = store.todayStr

  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    const dateStr = formatDateStr(d.getFullYear(), d.getMonth(), d.getDate())
    const events = store.events.filter(e => e.date === dateStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''))

    days.push({
      name: dayNames[i],
      shortName: dayNames[i].slice(0, 3),
      dateStr,
      dayNum: d.getDate(),
      monthShort: monthNamesList[d.getMonth()],
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      events
    })
  }
  return days
})

const currentWeekLabel = computed(() => {
  if (weekDays.value.length === 0) return ''
  const first = weekDays.value[0]
  const last = weekDays.value[6]
  return `Semaine du ${first.dayNum} ${first.monthShort} au ${last.dayNum} ${last.monthShort} ${currentMonday.value.getFullYear()}`
})

// Days in current month
const daysInCurrentMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
})

// Number of leading blank cells (Monday = 1, Sunday = 7)
const leadingPaddingDays = computed(() => {
  const firstDay = new Date(currentYear.value, currentMonth.value, 1).getDay()
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

const isDayPast = (day) => {
  if (!day) return false
  const check = formatDateStr(currentYear.value, currentMonth.value, day)
  return check < store.todayStr
}

const showAddModal = ref(false)
const showEditModal = ref(false)
const showSuccessExportModal = ref(false)
const isEditSuccess = ref(false)
const justAddedEvent = ref(null)
const editingEventId = ref(null)

const editEventForm = ref({
  title: '',
  date: store.todayStr,
  time: '14:00',
  category: 'Famille',
  location: '',
  color: '#8b5cf6'
})

const showDayEventsModal = ref(false)
const selectedDayEvents = ref([])
const selectedDayNumber = ref(null)
const selectedDayDateStr = ref(store.todayStr)

const isCurrentSelectedDayPast = computed(() => {
  return selectedDayDateStr.value < store.todayStr
})

const selectedDayDisplayTitle = computed(() => {
  if (!selectedDayDateStr.value) return ''
  const parts = selectedDayDateStr.value.split('-')
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
})

const colorOptions = ['#8b5cf6', '#ec4899', '#6366f1', '#10b981', '#f59e0b', '#06b6d4']

const newEvent = ref({
  title: '',
  date: store.todayStr,
  time: '14:00',
  category: 'Famille',
  location: '',
  color: '#8b5cf6'
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
}

const hasEventOnDay = (dayNum) => {
  const targetDate = formatDateStr(currentYear.value, currentMonth.value, dayNum)
  return store.events.some(e => e.date === targetDate)
}

const getEventsOnDay = (dayNum) => {
  const targetDate = formatDateStr(currentYear.value, currentMonth.value, dayNum)
  return store.events.filter(e => e.date === targetDate)
}

const openedFromDayModal = ref(false)

const handleDayClick = (dayNum) => {
  selectedDayNumber.value = dayNum
  const targetDate = formatDateStr(currentYear.value, currentMonth.value, dayNum)
  selectedDayDateStr.value = targetDate
  selectedDayEvents.value = store.events.filter(e => e.date === targetDate)
  showDayEventsModal.value = true
}

const handleWeekDayClick = (day) => {
  selectedDayNumber.value = day.dayNum
  selectedDayDateStr.value = day.dateStr
  selectedDayEvents.value = day.events
  showDayEventsModal.value = true
}

const handleSelectEvent = (event) => {
  openedFromDayModal.value = true
  showDayEventsModal.value = false
  openEditModal(event)
}

const cancelEditModal = () => {
  showEditModal.value = false
  if (openedFromDayModal.value && selectedDayDateStr.value) {
    selectedDayEvents.value = store.events.filter(e => e.date === selectedDayDateStr.value)
    showDayEventsModal.value = true
    openedFromDayModal.value = false
  }
}

const openAddForSelectedDay = () => {
  if (selectedDayDateStr.value) {
    if (selectedDayDateStr.value < store.todayStr) {
      return
    }
    newEvent.value.date = selectedDayDateStr.value
  }
  showDayEventsModal.value = false
  showAddModal.value = true
}

const handleAddEvent = async () => {
  if (!newEvent.value.title.trim()) return

  if (newEvent.value.date < store.todayStr) {
    alert("Impossible d'ajouter un événement à une date passée.")
    return
  }

  const eventPayload = { ...newEvent.value }
  const res = await store.addEvent(eventPayload)
  showAddModal.value = false

  // Afficher la boîte de dialogue d'exportation vers l'agenda personnel
  isEditSuccess.value = false
  justAddedEvent.value = (res && res.event) ? res.event : eventPayload
  showSuccessExportModal.value = true

  newEvent.value = {
    title: '',
    date: store.todayStr,
    time: '14:00',
    category: 'Famille',
    location: '',
    color: '#8b5cf6'
  }
}

const openEditModal = (event) => {
  editingEventId.value = event.id
  editEventForm.value = {
    title: event.title || '',
    date: event.date || '',
    time: event.time || '',
    category: event.category || 'Famille',
    location: event.location || '',
    color: event.color || '#8b5cf6'
  }
  showEditModal.value = true
}

const handleUpdateEvent = async () => {
  if (!editEventForm.value.title.trim()) return
  const eventPayload = { ...editEventForm.value }
  const res = await store.updateEvent(editingEventId.value, eventPayload)
  showEditModal.value = false

  if (res && res.success) {
    isEditSuccess.value = true
    justAddedEvent.value = (res && res.event) ? res.event : { ...eventPayload, id: editingEventId.value }
    showSuccessExportModal.value = true
    if (selectedDayNumber.value) {
      selectedDayEvents.value = getEventsOnDay(selectedDayNumber.value)
    }
    openedFromDayModal.value = false
  }
}

const handleDeleteCurrentEvent = async () => {
  if (!editingEventId.value) return
  const ok = await confirm({
    title: 'Supprimer l\'événement',
    message: `Voulez-vous vraiment supprimer l'événement « ${newEvent.value.title} » ?`,
    description: 'Cette action est irréversible.',
    confirmText: 'Supprimer',
    type: 'danger'
  })
  if (!ok) return

  await store.deleteEvent(editingEventId.value)
  showEditModal.value = false
  if (selectedDayNumber.value) {
    selectedDayEvents.value = getEventsOnDay(selectedDayNumber.value)
    if (openedFromDayModal.value) {
      showDayEventsModal.value = true
    }
  }
  openedFromDayModal.value = false
}

const handleDeleteFromDay = async (id) => {
  const event = store.events.find(e => e.id === id)
  const ok = await confirm({
    title: 'Supprimer l\'événement',
    message: `Voulez-vous vraiment supprimer l'événement « ${event ? event.title : ''} » ?`,
    description: 'Cette action est irréversible.',
    confirmText: 'Supprimer',
    type: 'danger'
  })
  if (!ok) return

  await store.deleteEvent(id)
  if (selectedDayNumber.value) {
    selectedDayEvents.value = getEventsOnDay(selectedDayNumber.value)
  }
}
</script>

<style scoped>
.text-purple { color: var(--accent-purple); }

.section-card {
  padding: 1.5rem;
}

.section-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.events-timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.timeline-card {
  display: flex;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.timeline-date-strip {
  width: 6px;
  flex-shrink: 0;
}

.timeline-content {
  padding: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.event-title-text {
  font-weight: 700;
  font-size: 0.95rem;
}

.timeline-header-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-action-icon {
  background: none;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border-radius: var(--radius-sm, 4px);
  transition: all var(--transition-fast);
}

.btn-edit {
  color: var(--text-muted);
}
.btn-edit:hover {
  color: var(--accent-purple);
  background: var(--accent-purple-light, rgba(139, 92, 246, 0.1));
}

.btn-delete {
  color: var(--text-muted);
}
.btn-delete:hover {
  color: var(--accent-rose);
  background: rgba(244, 63, 94, 0.1);
}

.timeline-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.775rem;
  color: var(--text-secondary);
}

.meta-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.calendar-header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.calendar-view-mode-toggle {
  display: inline-flex;
  align-items: center;
  background: var(--bg-tertiary);
  padding: 0.2rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  gap: 0.15rem;
}

.view-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.28rem 0.65rem;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.view-mode-btn:hover {
  color: var(--text-primary);
}

.view-mode-btn.active {
  background: var(--bg-card);
  color: var(--accent-purple);
  box-shadow: var(--shadow-sm);
}

.calendar-nav-controls {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.btn-cal-nav {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: color var(--transition-fast), transform var(--transition-fast);
}

.btn-cal-nav:hover {
  color: var(--accent-purple);
  transform: scale(1.18);
}

.btn-cal-nav:active {
  transform: scale(0.95);
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
  border-color: var(--accent-purple);
  color: var(--accent-purple);
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* Weekly View for Calendar */
.calendar-week-view {
  width: 100%;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.week-days-columns {
  display: grid;
  grid-template-columns: repeat(7, minmax(130px, 1fr));
  gap: 0.5rem;
  align-items: stretch;
}

.week-day-column {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: 320px;
}

.week-day-column:hover {
  transform: translateY(-2px);
  border-color: var(--accent-purple);
  background: var(--bg-card);
  box-shadow: var(--shadow-md);
}

.week-day-column.is-today {
  border: 2px solid var(--accent-purple);
  background: var(--accent-purple-light, rgba(139, 92, 246, 0.08));
  box-shadow: 0 0 0 1px var(--accent-purple);
}

.week-day-column.is-past {
  opacity: 0.6;
  background: rgba(120, 120, 120, 0.08);
  border-color: rgba(var(--border-color-rgb, 150, 150, 150), 0.35);
}

.week-day-column.is-past:hover {
  opacity: 0.88;
}

.week-col-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--border-color);
}

.week-col-title {
  display: flex;
  flex-direction: column;
}

.day-name-text {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-primary);
  text-transform: capitalize;
}

.day-date-text {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
}

.today-tag-mini {
  background: var(--accent-purple);
  color: white;
  font-size: 0.6rem;
  font-weight: 800;
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-full);
  text-transform: uppercase;
}

.past-tag-mini {
  background: var(--bg-card);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-full);
}

.week-day-events-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  flex: 1;
}

.week-event-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-left-width: 3px;
  border-radius: var(--radius-sm);
  padding: 0.45rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.week-event-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.week-event-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
  font-size: 0.68rem;
}

.week-event-time {
  font-weight: 700;
  color: var(--text-primary);
}

.week-event-cat {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.week-event-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.25;
  word-break: break-word;
}

.week-event-loc {
  font-size: 0.68rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.week-empty-day {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 0.5rem;
  flex: 1;
}

.empty-day-txt {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
}

.week-col-footer {
  text-align: center;
  padding-top: 0.3rem;
  border-top: 1px dashed var(--border-color);
}

.week-col-hint {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--accent-purple);
  opacity: 0.85;
}

.week-day-column.is-past .week-col-hint {
  color: var(--text-muted);
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
  gap: 0.4rem;
}

.day-cell {
  min-height: 80px;
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  padding: 0.4rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
}

.day-cell.today {
  border-color: var(--accent-primary);
  background: var(--accent-primary-light);
  font-weight: 800;
}

.day-cell.past {
  opacity: 0.55;
  background: rgba(120, 120, 120, 0.08);
}

.day-cell.past:hover {
  opacity: 0.85;
}

.past-day-badge-note {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
}

.day-cell.has-events {
  background: var(--bg-secondary);
}

.day-cell.day-empty {
  background: transparent;
  border-color: transparent;
  cursor: default;
}

.cell-interactive {
  cursor: pointer;
  transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.cell-interactive:hover {
  transform: translateY(-2px);
  border-color: var(--accent-purple);
  box-shadow: var(--shadow-sm);
}

.day-number {
  font-size: 0.82rem;
  font-weight: 700;
}

.day-dots {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  align-self: flex-start;
}

.event-dot {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
}

/* Color picker buttons */
.color-picker-options {
  display: flex;
  gap: 0.5rem;
}

.color-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.color-btn.selected {
  border-color: var(--text-primary);
  transform: scale(1.15);
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
}

.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.btn-close { background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }

/* Interactive Calendar Days */
.day-cell.cell-interactive {
  cursor: pointer;
  transition: transform var(--transition-fast), border-color var(--transition-fast);
}

.day-cell.cell-interactive:hover {
  transform: translateY(-2px);
  border-color: var(--accent-purple);
  box-shadow: var(--shadow-sm);
}

/* Timeline Export Bar */
.timeline-export-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--border-color);
}

.export-hint {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
}

.export-btns-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.btn-cal-action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  font-size: 0.74rem;
  font-weight: 600;
  border-radius: var(--radius-sm, 6px);
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-cal-action:hover {
  transform: translateY(-1px);
}

.btn-cal-google:hover {
  color: #4285f4;
  border-color: #4285f4;
  background: rgba(66, 133, 244, 0.08);
}

.btn-cal-ics:hover {
  color: var(--accent-purple);
  border-color: var(--accent-purple);
  background: var(--accent-purple-light, rgba(139, 92, 246, 0.08));
}

/* Export Success Modal */
.export-modal-title-group {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.export-modal-title-group h3 {
  margin: 0;
  font-size: 1.15rem;
}

.export-modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.event-summary-card {
  padding: 0.85rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-left-width: 4px;
  border-radius: var(--radius-md);
}

.event-summary-title {
  margin: 0 0 0.4rem 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.event-summary-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.export-modal-prompt {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.45;
}

.export-modal-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.btn-export-full {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.75rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
}

.btn-google-full {
  background: linear-gradient(135deg, #4285f4, #2563eb);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(66, 133, 244, 0.25);
}

.btn-google-full:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(66, 133, 244, 0.35);
}

.btn-ics-full {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-ics-full:hover {
  background: var(--bg-card-hover);
  border-color: var(--accent-purple);
  color: var(--accent-purple);
}

.day-events-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  max-height: 400px;
  overflow-y: auto;
}

.day-event-clickable {
  cursor: pointer;
  transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.day-event-clickable:hover {
  transform: translateY(-2px);
  border-color: var(--accent-purple);
  box-shadow: var(--shadow-md);
}

.timeline-click-hint {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--accent-purple);
  margin-top: 0.5rem;
  padding-top: 0.4rem;
  border-top: 1px dashed rgba(139, 92, 246, 0.2);
  font-weight: 600;
}

.empty-day-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2.5rem 1rem;
  gap: 0.75rem;
  color: var(--text-secondary);
}

.empty-day-icon {
  color: var(--text-muted);
}

/* Responsive mobile styles: 1 single column with 1 row per day */
@media (max-width: 768px) {
  .section-card-header.flex-between {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .calendar-nav-title h2 {
    font-size: 1.15rem;
    text-align: center;
  }

  .calendar-header-actions {
    justify-content: space-between;
    width: 100%;
  }

  .calendar-week-view {
    overflow-x: visible;
  }

  .week-days-columns {
    grid-template-columns: 1fr;
    gap: 0.65rem;
  }

  .week-day-column {
    min-height: auto;
    padding: 0.75rem 0.85rem;
    gap: 0.45rem;
  }

  .week-col-header {
    align-items: center;
    padding-bottom: 0.4rem;
  }

  .week-col-title {
    flex-direction: row;
    align-items: baseline;
    gap: 0.45rem;
  }

  .day-name-text {
    font-size: 0.95rem;
  }

  .day-date-text {
    font-size: 0.82rem;
  }

  .week-empty-day {
    padding: 0.35rem 0;
    justify-content: flex-start;
  }

  .empty-day-txt {
    font-size: 0.78rem;
  }

  .week-col-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 0.35rem;
  }

  .week-col-hint {
    font-size: 0.75rem;
  }

  /* Monthly calendar grid adjustments on mobile */
  .calendar-days-grid {
    gap: 0.25rem;
  }

  .day-cell {
    min-height: 60px;
    padding: 0.25rem 0.3rem;
  }

  .day-number {
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .page-header .btn {
    width: 100%;
    justify-content: center;
  }

  .calendar-header-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 0.6rem;
  }

  .calendar-view-mode-toggle {
    width: 100%;
    justify-content: center;
  }

  .view-mode-btn {
    flex: 1;
    justify-content: center;
  }

  .calendar-nav-controls {
    justify-content: space-between;
    width: 100%;
  }
}
</style>
