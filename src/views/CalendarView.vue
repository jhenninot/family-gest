<template>
  <div class="calendar-view">
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

    <!-- Main Grid: Events List & Calendar View -->
    <div class="grid-2 calendar-main-grid">
      <!-- Events List Column -->
      <div class="glass-card section-card">
        <div class="section-card-header">
          <h2>Événements programmés</h2>
          <span class="badge badge-purple">{{ store.events.length }} événements</span>
        </div>

        <div class="events-timeline">
          <div 
            v-for="event in sortedEvents" 
            :key="event.id"
            class="timeline-card"
          >
            <div class="timeline-date-strip" :style="{ backgroundColor: event.color }"></div>

            <div class="timeline-content">
              <div class="timeline-header">
                <span class="event-title-text">{{ event.title }}</span>
                <div class="timeline-header-actions">
                  <button @click="openEditModal(event)" class="btn-action-icon btn-edit" title="Modifier l'événement">
                    <Edit3 :size="15" />
                  </button>
                  <button @click="store.deleteEvent(event.id)" class="btn-action-icon btn-delete" title="Supprimer">
                    <Trash2 :size="15" />
                  </button>
                </div>
              </div>

              <div class="timeline-meta">
                <span class="badge" :style="{ backgroundColor: event.color + '25', color: event.color }">
                  {{ event.category }}
                </span>

                <div class="meta-tag">
                  <CalendarIcon :size="14" />
                  <span>{{ formatDate(event.date) }}</span>
                </div>

                <div class="meta-tag" v-if="event.time">
                  <Clock :size="14" />
                  <span>{{ event.time }}</span>
                </div>

                <div class="meta-tag" v-if="event.location">
                  <MapPin :size="14" />
                  <span>{{ event.location }}</span>
                </div>
              </div>

              <!-- Actions d'export vers agenda externe -->
              <div class="timeline-export-bar">
                <span class="export-hint">Ajouter à mon agenda :</span>
                <div class="export-btns-row">
                  <button 
                    @click="openGoogleCalendar(event)" 
                    class="btn-cal-action btn-cal-google" 
                    title="Ajouter directement à Google Agenda"
                  >
                    <ExternalLink :size="12" />
                    <span>Google Agenda</span>
                  </button>
                  <button 
                    @click="downloadIcsFile(event)" 
                    class="btn-cal-action btn-cal-ics" 
                    title="Télécharger le fichier .ics pour Apple Calendrier, Outlook..."
                  >
                    <Download :size="12" />
                    <span>Apple / Outlook (.ics)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="store.events.length === 0" class="empty-state">
            Aucun événement enregistré. Cliquez sur "Nouvel Événement" pour commencer.
          </div>
        </div>
      </div>

      <!-- Interactive Calendar Preview Widget -->
      <div class="glass-card section-card">
        <div class="section-card-header">
          <h2>Septembre 2026</h2>
          <span class="badge badge-indigo">Vue Mensuelle</span>
        </div>

        <!-- Days of week -->
        <div class="calendar-grid-header">
          <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
        </div>

        <div class="calendar-days-grid">
          <!-- Blank padding for Sept 2026 (Starts on Tuesday = offset 1) -->
          <div class="day-cell day-empty"></div>

          <div 
            v-for="day in 30" 
            :key="day"
            class="day-cell"
            :class="{ today: day === 8, 'has-events': hasEventOnDay(day), 'cell-interactive': hasEventOnDay(day) }"
            @click="handleDayClick(day)"
            :title="hasEventOnDay(day) ? 'Cliquez pour voir les événements de ce jour' : ''"
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
              <input v-model="newEvent.date" type="date" required class="form-input" />
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

          <div class="modal-footer">
            <button type="button" @click="showEditModal = false" class="btn btn-secondary">Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer les modifications</button>
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
          <h3>Événements du {{ selectedDayNumber }} Septembre 2026</h3>
          <button @click="showDayEventsModal = false" class="btn-close">&times;</button>
        </div>

        <div class="day-events-list">
          <div 
            v-for="ev in selectedDayEvents" 
            :key="ev.id" 
            class="timeline-card"
          >
            <div class="timeline-date-strip" :style="{ backgroundColor: ev.color }"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="event-title-text">{{ ev.title }}</span>
                <div class="timeline-header-actions">
                  <span class="badge" :style="{ backgroundColor: ev.color + '25', color: ev.color }">
                    {{ ev.category }}
                  </span>
                  <button @click="openEditModal(ev)" class="btn-action-icon btn-edit" title="Modifier l'événement">
                    <Edit3 :size="14" />
                  </button>
                  <button @click="handleDeleteFromDay(ev.id)" class="btn-action-icon btn-delete" title="Supprimer">
                    <Trash2 :size="14" />
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
              <div class="timeline-export-bar">
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
            </div>
          </div>
        </div>

        <div class="modal-footer">
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
  Plus, 
  Trash2, 
  Edit3,
  Clock, 
  MapPin, 
  ExternalLink, 
  Download, 
  CalendarPlus 
} from '@lucide/vue'
import { openGoogleCalendar, downloadIcsFile } from '../utils/calendarExport'

const store = useFamilyStore()
const showAddModal = ref(false)
const showEditModal = ref(false)
const showSuccessExportModal = ref(false)
const isEditSuccess = ref(false)
const justAddedEvent = ref(null)
const editingEventId = ref(null)

const editEventForm = ref({
  title: '',
  date: '2026-09-15',
  time: '14:00',
  category: 'Famille',
  location: '',
  color: '#8b5cf6'
})

const showDayEventsModal = ref(false)
const selectedDayEvents = ref([])
const selectedDayNumber = ref(null)

const colorOptions = ['#8b5cf6', '#ec4899', '#6366f1', '#10b981', '#f59e0b', '#06b6d4']

const newEvent = ref({
  title: '',
  date: '2026-09-15',
  time: '14:00',
  category: 'Famille',
  location: '',
  color: '#8b5cf6'
})

const sortedEvents = computed(() => {
  return [...store.events].sort((a, b) => new Date(a.date) - new Date(b.date))
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
}

const hasEventOnDay = (dayNum) => {
  const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`
  const targetDate = `2026-09-${dayStr}`
  return store.events.some(e => e.date === targetDate)
}

const getEventsOnDay = (dayNum) => {
  const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`
  const targetDate = `2026-09-${dayStr}`
  return store.events.filter(e => e.date === targetDate)
}

const handleDayClick = (dayNum) => {
  const evts = getEventsOnDay(dayNum)
  if (evts && evts.length > 0) {
    selectedDayEvents.value = evts
    selectedDayNumber.value = dayNum
    showDayEventsModal.value = true
  }
}

const handleAddEvent = async () => {
  if (!newEvent.value.title.trim()) return
  const eventPayload = { ...newEvent.value }
  const res = await store.addEvent(eventPayload)
  showAddModal.value = false

  // Afficher la boîte de dialogue d'exportation vers l'agenda personnel
  isEditSuccess.value = false
  justAddedEvent.value = (res && res.event) ? res.event : eventPayload
  showSuccessExportModal.value = true

  newEvent.value = {
    title: '',
    date: '2026-09-15',
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
    if (showDayEventsModal.value && selectedDayNumber.value) {
      selectedDayEvents.value = getEventsOnDay(selectedDayNumber.value)
    }
  }
}

const handleDeleteFromDay = async (id) => {
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
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  padding: 0.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
}

.day-cell.today {
  border-color: var(--accent-primary);
  background: var(--accent-primary-light);
  font-weight: 800;
}

.day-cell.has-events {
  background: var(--bg-secondary);
}

.day-number {
  font-size: 0.8rem;
  font-weight: 700;
}

.day-dots {
  display: flex;
  gap: 0.15rem;
}

.event-dot {
  width: 6px;
  height: 6px;
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
</style>
