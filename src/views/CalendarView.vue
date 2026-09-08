<template>
  <div class="calendar-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <CalendarIcon :size="28" class="text-purple" />
          <span>Calendrier Familial</span>
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
          <h2>Événements Programmés</h2>
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
                <button @click="store.deleteEvent(event.id)" class="btn-delete" title="Supprimer">
                  <Trash2 :size="15" />
                </button>
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
            :class="{ today: day === 8, 'has-events': hasEventOnDay(day) }"
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFamilyStore } from '../stores/familyStore'
import { Calendar as CalendarIcon, Plus, Trash2, Clock, MapPin } from '@lucide/vue'

const store = useFamilyStore()
const showAddModal = ref(false)

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

const handleAddEvent = () => {
  if (!newEvent.value.title.trim()) return
  store.addEvent(newEvent.value)
  showAddModal.value = false
  newEvent.value = {
    title: '',
    date: '2026-09-15',
    time: '14:00',
    category: 'Famille',
    location: '',
    color: '#8b5cf6'
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

.btn-delete {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}
.btn-delete:hover { color: var(--accent-rose); }

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
</style>
