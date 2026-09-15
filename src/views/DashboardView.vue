<template>
  <div class="dashboard-view">


    <!-- Summary Metrics Grid -->
    <!-- Summary Metrics Grid : 1. Présence, 2. Courses, 3. Tâches, 4. Calendrier -->
    <div class="grid-4 metric-grid">
      <!-- Card 1: Présence (Absences & Repas aujourd'hui) -->
      <router-link :to="getPath('/absences')" class="glass-card metric-card clickable-card">
        <div class="metric-icon-wrapper emerald">
          <HouseUser :size="22" />
        </div>
        <div class="metric-details">
          <span class="metric-label">Présence</span>
          <div class="metric-value" :class="{ 'metric-value-text': store.todayAbsences.length === 0 && store.todayMealGuests.length === 0 }">
            {{ todayMealsCardValue }}
          </div>
          <span class="metric-subtext">
            {{ formatTodayAbsencesSubtext() }}
          </span>
        </div>
      </router-link>

      <!-- Card 2: Liste de courses -->
      <router-link :to="getPath('/shopping')" class="glass-card metric-card clickable-card">
        <div class="metric-icon-wrapper amber">
          <ShoppingCart :size="22" />
        </div>
        <div class="metric-details">
          <span class="metric-label">Liste de courses</span>
          <div class="metric-value">{{ store.pendingShoppingCount }}</div>
          <span class="metric-subtext">
            {{ urgentShoppingCount }} article(s) urgent(s)
          </span>
        </div>
      </router-link>

      <!-- Card 3: Progression des Tâches -->
      <router-link :to="getPath('/tasks')" class="glass-card metric-card clickable-card">
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

      <!-- Card 4: Événements du jour (Calendrier) -->
      <router-link :to="getPath('/calendar')" class="glass-card metric-card clickable-card">
        <div class="metric-icon-wrapper purple">
          <Calendar :size="22" />
        </div>
        <div class="metric-details">
          <span class="metric-label">Événements du jour</span>
          <div class="metric-value">{{ todayEvents.length }}</div>
          <span class="metric-subtext">{{ todayEventsSubtext }}</span>
        </div>
      </router-link>
    </div>

    <!-- Main Content Section: 2 Columns (1. Présence, 2. Courses | 3. Tâches, 4. Événements, 5. Membres) -->
    <div class="grid-2 dashboard-main-grid">
      <!-- Column 1 (Left): 1. Présence, 2. Liste de courses -->
      <div class="dashboard-column-left">
        <!-- 1. Présence : Today's Meals & Night Breakdown Widget -->
        <div class="glass-card section-card margin-bottom-md today-meals-widget">
          <div class="section-card-header">
            <div class="header-title">
              <HouseUser :size="20" class="text-emerald" />
              <h2>Présence & Repas</h2>
            </div>
            <div class="header-links-group">
              <router-link :to="getPath('/meals')" class="view-all-link meals-link" title="Gérer les repas de la semaine">
                <Utensils :size="13" />
                <span>Menus</span>
              </router-link>
              <router-link :to="getPath('/absences')" class="view-all-link">Planning &rarr;</router-link>
            </div>
          </div>

          <div class="today-slots-list">
            <!-- Déjeuner (Midi) -->
            <div class="today-slot-row">
              <div class="slot-row-top">
                <div class="slot-header-left">
                  <Sun :size="20" class="slot-row-icon slot-row-icon-lunch" />
                  <div class="slot-row-title-col">
                    <span class="slot-row-title">Déjeuner</span>
                    <span class="slot-row-subtitle">Midi</span>
                  </div>
                </div>
                <div class="slot-row-badge-wrapper">
                  <span class="headcount-badge badge-lunch">
                    <strong>{{ lunchHeadcount }}</strong> à table
                  </span>
                </div>
              </div>

              <div class="slot-row-content">
                <!-- Absents -->
                <div v-if="todayLunchPresence.absentMembers.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label absent-badge">Absents ({{ todayLunchPresence.absentMembers.length }}) :</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="m in todayLunchPresence.absentMembers" 
                      :key="'l-abs-' + m.id" 
                      class="person-tag absent-tag"
                      :title="m.name"
                    >
                      <UserAvatar :avatar="m.avatar" :name="m.firstName" size="xs" />
                      <span>{{ m.firstName }}</span>
                    </span>
                  </div>
                </div>

                <!-- Présences exceptionnelles -->
                <div v-if="todayLunchPresence.exceptionalPresences.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label presence-badge">Présences ({{ todayLunchPresence.exceptionalPresences.length }}) :</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="m in todayLunchPresence.exceptionalPresences" 
                      :key="'l-prs-' + m.id" 
                      class="person-tag presence-tag"
                      :title="m.name"
                    >
                      <span class="presence-dot">🟢</span>
                      <UserAvatar :avatar="m.avatar" :name="m.firstName" size="xs" />
                      <span>{{ m.firstName }}</span>
                    </span>
                  </div>
                </div>

                <!-- Invités -->
                <div v-if="todayLunchPresence.guests.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label guest-badge">Invités ({{ todayLunchPresence.guests.length }}) :</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="g in todayLunchPresence.guests" 
                      :key="'l-gst-' + g.id" 
                      class="person-tag guest-tag"
                      :title="g.note ? `Note: ${g.note}` : 'Invité'"
                    >
                      👥 {{ g.name }}
                    </span>
                  </div>
                </div>

                <!-- Au complet sans invité -->
                <div v-if="todayLunchPresence.absentMembers.length === 0 && todayLunchPresence.exceptionalPresences.length === 0 && todayLunchPresence.guests.length === 0" class="slot-all-present">
                  Au complet ({{ todayLunchPresence.headcount }} personnes) sans invité
                </div>

                <!-- Plat(s) prévu(s) ce midi -->
                <div v-if="todayLunchMeals.length > 0" class="slot-dish-highlight">
                  <span class="dish-badge-label">🍲 Au menu :</span>
                  <span class="dish-badge-text">{{ todayLunchMeals.map(m => m.dish).join(' • ') }}</span>
                </div>
              </div>
            </div>

            <!-- Dîner (Soir) -->
            <div class="today-slot-row">
              <div class="slot-row-top">
                <div class="slot-header-left">
                  <Sunset :size="20" class="slot-row-icon slot-row-icon-dinner" />
                  <div class="slot-row-title-col">
                    <span class="slot-row-title">Dîner</span>
                    <span class="slot-row-subtitle">Soir</span>
                  </div>
                </div>
                <div class="slot-row-badge-wrapper">
                  <span class="headcount-badge badge-dinner">
                    <strong>{{ dinnerHeadcount }}</strong> à table
                  </span>
                </div>
              </div>

              <div class="slot-row-content">
                <!-- Absents -->
                <div v-if="todayDinnerPresence.absentMembers.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label absent-badge">Absents ({{ todayDinnerPresence.absentMembers.length }}) :</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="m in todayDinnerPresence.absentMembers" 
                      :key="'d-abs-' + m.id" 
                      class="person-tag absent-tag"
                      :title="m.name"
                    >
                      <UserAvatar :avatar="m.avatar" :name="m.firstName" size="xs" />
                      <span>{{ m.firstName }}</span>
                    </span>
                  </div>
                </div>

                <!-- Présences exceptionnelles -->
                <div v-if="todayDinnerPresence.exceptionalPresences.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label presence-badge">Présences ({{ todayDinnerPresence.exceptionalPresences.length }}) :</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="m in todayDinnerPresence.exceptionalPresences" 
                      :key="'d-prs-' + m.id" 
                      class="person-tag presence-tag"
                      :title="m.name"
                    >
                      <span class="presence-dot">🟢</span>
                      <UserAvatar :avatar="m.avatar" :name="m.firstName" size="xs" />
                      <span>{{ m.firstName }}</span>
                    </span>
                  </div>
                </div>

                <!-- Invités -->
                <div v-if="todayDinnerPresence.guests.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label guest-badge">Invités ({{ todayDinnerPresence.guests.length }}) :</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="g in todayDinnerPresence.guests" 
                      :key="'d-gst-' + g.id" 
                      class="person-tag guest-tag"
                      :title="g.note ? `Note: ${g.note}` : 'Invité'"
                    >
                      👥 {{ g.name }}
                    </span>
                  </div>
                </div>

                <!-- Au complet sans invité -->
                <div v-if="todayDinnerPresence.absentMembers.length === 0 && todayDinnerPresence.exceptionalPresences.length === 0 && todayDinnerPresence.guests.length === 0" class="slot-all-present">
                  Au complet ({{ todayDinnerPresence.headcount }} personnes) sans invité
                </div>

                <!-- Plat(s) prévu(s) ce soir -->
                <div v-if="todayDinnerMeals.length > 0" class="slot-dish-highlight">
                  <span class="dish-badge-label">🍲 Au menu :</span>
                  <span class="dish-badge-text">{{ todayDinnerMeals.map(m => m.dish).join(' • ') }}</span>
                </div>
              </div>
            </div>

            <!-- Nuit (Couchage) -->
            <div class="today-slot-row">
              <div class="slot-row-top">
                <div class="slot-header-left">
                  <BedDouble :size="20" class="slot-row-icon slot-row-icon-night" />
                  <div class="slot-row-title-col">
                    <span class="slot-row-title">Nuit</span>
                    <span class="slot-row-subtitle">Couchage</span>
                  </div>
                </div>
                <div class="slot-row-badge-wrapper">
                  <span class="headcount-badge badge-night">
                    <strong>{{ nightHeadcount }}</strong> présent{{ nightHeadcount > 1 ? 's' : '' }}
                  </span>
                </div>
              </div>

              <div class="slot-row-content">
                <!-- Absents (dorment ailleurs) -->
                <div v-if="todayNightPresence.absentMembers.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label absent-badge">Absents ({{ todayNightPresence.absentMembers.length }}) :</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="m in todayNightPresence.absentMembers" 
                      :key="'n-abs-' + m.id" 
                      class="person-tag absent-tag"
                      :title="m.name"
                    >
                      <UserAvatar :avatar="m.avatar" :name="m.firstName" size="xs" />
                      <span>{{ m.firstName }}</span>
                    </span>
                  </div>
                </div>

                <!-- Présences exceptionnelles (dorment à la maison) -->
                <div v-if="todayNightPresence.exceptionalPresences.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label presence-badge">Présences ({{ todayNightPresence.exceptionalPresences.length }}) :</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="m in todayNightPresence.exceptionalPresences" 
                      :key="'n-prs-' + m.id" 
                      class="person-tag presence-tag"
                      :title="m.name"
                    >
                      <span class="presence-dot">🟢</span>
                      <UserAvatar :avatar="m.avatar" :name="m.firstName" size="xs" />
                      <span>{{ m.firstName }}</span>
                    </span>
                  </div>
                </div>

                <!-- Invités (dorment à la maison) -->
                <div v-if="todayNightPresence.guests.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label guest-badge">Invités ({{ todayNightPresence.guests.length }}) :</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="g in todayNightPresence.guests" 
                      :key="'n-gst-' + g.id" 
                      class="person-tag guest-tag"
                      :title="g.note ? `Note: ${g.note}` : 'Dort à la maison'"
                    >
                      👥 {{ g.name }}
                    </span>
                  </div>
                </div>

                <!-- Au complet -->
                <div v-if="todayNightPresence.absentMembers.length === 0 && todayNightPresence.exceptionalPresences.length === 0 && todayNightPresence.guests.length === 0" class="slot-all-present">
                  Tout le monde dort à la maison ({{ todayNightPresence.headcount }})
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Liste de courses Widget -->
        <div class="glass-card section-card margin-bottom-md shopping-dashboard-widget">
          <div class="section-card-header">
            <div class="header-title">
              <ShoppingCart :size="20" class="text-amber" />
              <h2>Liste de courses</h2>
            </div>
            <router-link :to="getPath('/shopping')" class="view-all-link">Voir la liste &rarr;</router-link>
          </div>

          <div class="tasks-list">
            <div 
              v-for="item in dashboardShoppingItems" 
              :key="item.id"
              class="task-item-row"
            >
              <input 
                type="checkbox" 
                :checked="item.checked" 
                @change="store.toggleShoppingItem(item.id)" 
                class="custom-checkbox"
                :title="item.checked ? 'Décocher cet article' : 'Cocher cet article (acheté)'"
              />
              <div class="task-info">
                <span class="task-title-text">{{ item.name }}</span>
                <div class="task-meta">
                  <span class="badge badge-amber" v-if="item.category">
                    {{ getShoppingCategoryIcon(item.category) }} {{ item.category }}
                  </span>
                  <span v-if="item.quantity" class="assigned-tag">
                    Qté : {{ item.quantity }}
                  </span>
                  <span v-if="item.urgent" class="badge badge-rose">
                    Urgent 🔥
                  </span>
                </div>
              </div>
            </div>

            <div v-if="dashboardShoppingItems.length === 0" class="empty-state">
              🛒 La liste de courses est vide ! Tout est sous contrôle.
            </div>
          </div>
        </div>
      </div>

      <!-- Column 2 (Right): 3. Tâches, 4. Événements, 5. Membres -->
      <div class="dashboard-column-right">
        <!-- 3. Tâches : Today's Tasks Checklist -->
        <div class="glass-card section-card margin-bottom-md">
          <div class="section-card-header">
            <div class="header-title">
              <CheckSquare :size="20" class="text-indigo" />
              <h2>Tâches à réaliser</h2>
            </div>
            <router-link :to="getPath('/tasks')" class="view-all-link">Tout voir &rarr;</router-link>
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
            </div>

            <div v-if="dashboardTasks.length === 0" class="empty-state">
              👍 Toutes les tâches sont terminées ! Bravo !
            </div>
          </div>
        </div>

        <!-- 4. Prochains événements (Calendrier) -->
        <div class="glass-card section-card margin-bottom-md">
          <div class="section-card-header">
            <div class="header-title">
              <Calendar :size="20" class="text-purple" />
              <h2>Prochains événements</h2>
            </div>
            <router-link :to="getPath('/calendar')" class="view-all-link">Voir l'agenda &rarr;</router-link>
          </div>

          <div class="events-list">
            <div 
              v-for="event in dashboardEvents" 
              :key="event.id"
              class="event-item-row"
            >
              <div class="event-date-box" :style="{ '--event-accent-color': event.color }">
                <span class="event-weekday">{{ getWeekdayShort(event.date) }}</span>
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

              <!-- Export direct agenda -->
              <div class="dash-event-export-btns">
                <button 
                  @click="openGoogleCalendar(event)" 
                  class="btn-dash-cal btn-dash-google" 
                  title="Ajouter à Google Agenda"
                  aria-label="Ajouter à Google Agenda"
                >
                  <ExternalLink :size="12" />
                  <span class="dash-btn-text">Google</span>
                </button>
                <button 
                  @click="downloadIcsFile(event)" 
                  class="btn-dash-cal btn-dash-ics" 
                  title="Télécharger pour Apple Calendrier ou Outlook (.ics)"
                  aria-label="Télécharger pour Apple Calendrier ou Outlook"
                >
                  <Download :size="12" />
                  <span class="dash-btn-text">.ics</span>
                </button>
              </div>
            </div>
            <div v-if="dashboardEvents.length === 0" class="empty-state">
              📅 Aucun événement dans les 7 prochains jours.
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import {
  CheckSquare,
  Calendar,
  ShoppingCart,
  Utensils,
  Clock,
  MapPin,
  ExternalLink,
  Sun,
  Sunset,
  BedDouble
} from '@lucide/vue'
import HouseUser from '../components/icons/HouseUser.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { openGoogleCalendar, downloadIcsFile } from '../utils/calendarExport'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const store = useFamilyStore()

const currentSlug = computed(() => route.params.familySlug || store.currentFamily?.slug || localStorage.getItem('familygest_active_slug') || '')
const getPath = (sub) => currentSlug.value ? `/${currentSlug.value}${sub}` : (sub || '/')

const urgentShoppingCount = computed(() => {
  return (store.shoppingList || []).filter(item => !item.checked && item.urgent).length
})

const dashboardShoppingItems = computed(() => {
  return (store.shoppingList || [])
    .filter(item => !item.checked)
    .sort((a, b) => {
      if (a.urgent && !b.urgent) return -1
      if (!a.urgent && b.urgent) return 1
      return 0
    })
    .slice(0, 6)
})

const dashboardTasks = computed(() => {
  return (store.tasks || []).slice(0, 6)
})

const dashboardEvents = computed(() => {
  const today = store.todayStr
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + 6)
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`

  return (store.events || [])
    .filter(e => e.date >= today && e.date <= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
})

const todayEvents = computed(() => {
  const today = store.todayStr
  return (store.events || [])
    .filter(e => e.date === today)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
})

const todayEventsSubtext = computed(() => {
  const events = todayEvents.value
  if (events.length === 0) return 'Aucun événement aujourd\'hui'
  const maxShown = 3
  const titles = events.slice(0, maxShown).map(e => e.title)
  const remaining = events.length - maxShown
  return remaining > 0
    ? `${titles.join(' • ')} • +${remaining} autre${remaining > 1 ? 's' : ''}`
    : titles.join(' • ')
})

const getShoppingCategoryIcon = (categoryName) => {
  const cat = (store.shoppingCategories || []).find(c => c.name === categoryName)
  return cat?.icon || '🛒'
}

const getMemberName = (id) => {
  if (!id) return 'Non assigné'
  const m = store.members.find(m => m.id === id || String(m.id) === String(id))
  return m ? (m.firstName || m.name) : 'Non assigné'
}

const getDayNumber = (dateStr) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  return parts[2] ? String(parseInt(parts[2], 10)) : ''
}

const getMonthShort = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' }).replace(/\.$/, '')
}

const getWeekdayShort = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short' }).replace(/\.$/, '')
}

const loadDashboardData = async () => {
  const targetSlug = route.params.familySlug || store.currentFamily?.slug || localStorage.getItem('familygest_active_slug')
  if (targetSlug) {
    if (!store.currentFamily || store.currentFamily.slug !== targetSlug) {
      const ok = await store.fetchCurrentFamily(targetSlug)
      if (!ok && !authStore.isSuperAdmin) {
        router.push({ name: 'select-family' })
        return
      }
    }
    await store.fetchAllData()
    if (!store.currentFamily && !authStore.isSuperAdmin) {
      router.push({ name: 'select-family' })
    }
  } else if (!authStore.isSuperAdmin) {
    router.push({ name: 'select-family' })
  }
}

onMounted(async () => {
  await loadDashboardData()
})

watch(() => route.params.familySlug, async (newSlug) => {
  if (newSlug) {
    await loadDashboardData()
  }
})

const todayLunchPresence = computed(() => store.getMealSlotPresence(store.todayStr, 'lunch'))
const todayDinnerPresence = computed(() => store.getMealSlotPresence(store.todayStr, 'dinner'))
const todayNightPresence = computed(() => store.getMealSlotPresence(store.todayStr, 'night'))

const lunchHeadcount = computed(() => todayLunchPresence.value.headcount)
const dinnerHeadcount = computed(() => todayDinnerPresence.value.headcount)
const nightHeadcount = computed(() => todayNightPresence.value.headcount)

const todayMealsCardValue = computed(() => {
  return `${lunchHeadcount.value} midi • ${dinnerHeadcount.value} soir`
})

const todayMeals = computed(() => (store.getMealsForDate ? store.getMealsForDate(store.todayStr) : { lunch: [], dinner: [] }))
const todayLunchMeals = computed(() => todayMeals.value.lunch || [])
const todayDinnerMeals = computed(() => todayMeals.value.dinner || [])

const formatTodayAbsencesSubtext = () => {
  const parts = []
  const l = todayLunchPresence.value
  const d = todayDinnerPresence.value
  const n = todayNightPresence.value

  const totalAbsents = new Set([...l.absentMembers, ...d.absentMembers, ...n.absentMembers].map(m => m.id)).size
  const totalPresences = new Set([...l.exceptionalPresences, ...d.exceptionalPresences, ...n.exceptionalPresences].map(m => m.id)).size
  const totalGuests = new Set([...l.guests, ...d.guests, ...n.guests].map(g => g.id)).size

  if (totalAbsents > 0) {
    parts.push(`🚫 ${totalAbsents} absent${totalAbsents > 1 ? 's' : ''}`)
  }
  if (totalPresences > 0) {
    parts.push(`🟢 ${totalPresences} présence${totalPresences > 1 ? 's' : ''}`)
  }
  if (totalGuests > 0) {
    parts.push(`👥 ${totalGuests} invité${totalGuests > 1 ? 's' : ''}`)
  }
  if (parts.length === 0) {
    return 'Au complet, sans invité'
  }
  return parts.join(' • ')
}

const getMemberAvatar = (memberId) => {
  const m = store.members.find(m => m.id === memberId)
  return m ? m.avatar : '👤'
}

const getMemberFirstName = (memberId) => {
  const m = store.members.find(m => m.id === memberId)
  if (!m) return 'Inconnu'
  return m.firstName || (m.name ? m.name.split(' ')[0] : 'Membre')
}

</script>

<style scoped>
.dashboard-view {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.quick-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .quick-actions {
    width: 100%;
  }
  .quick-actions .btn {
    flex: 1;
    min-width: 130px;
    justify-content: center;
  }
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
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
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
  min-width: 0;
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
  overflow-wrap: break-word;
}

.margin-top-xs { margin-top: 0.4rem; }
.margin-bottom-md { margin-bottom: 1.5rem; }
.margin-left-xs { margin-left: 0.5rem; }

.dashboard-column-left,
.dashboard-column-right {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.section-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

@media (max-width: 640px) {
  .section-card {
    padding: 1.1rem 0.9rem;
  }
}

.section-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: 0.5rem;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.header-title h2 {
  font-size: 1.15rem;
  font-weight: 700;
  overflow-wrap: break-word;
}

.text-indigo { color: var(--accent-primary); }
.text-purple { color: var(--accent-purple); }
.text-amber { color: var(--accent-amber); }
.text-emerald { color: var(--accent-secondary); }

.admin-only-tag {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.dashboard-members-admin-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.view-all-link {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent-primary);
  text-decoration: none;
}
.view-all-link:hover { text-decoration: underline; }

.header-links-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.view-all-link.meals-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--accent-amber);
  font-weight: 700;
}

.slot-dish-highlight {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--accent-amber-light);
  border: 1px solid rgba(245, 158, 11, 0.25);
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-sm);
  margin-top: 0.35rem;
}

.dish-badge-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--accent-amber);
  flex-shrink: 0;
}

.dish-badge-text {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Today's Meals & Night Widget */
.today-slots-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
  width: 100%;
}

.today-slot-row {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  transition: border-color var(--transition-fast), background var(--transition-fast);
  min-width: 0;
  box-sizing: border-box;
}

.today-slot-row:hover {
  border-color: rgba(99, 102, 241, 0.25);
}

.slot-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.slot-header-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.slot-row-icon {
  flex-shrink: 0;
}

.slot-row-icon-lunch { color: #b45309; }
[data-theme="dark"] .slot-row-icon-lunch { color: #fbbf24; }

.slot-row-icon-dinner { color: #4338ca; }
[data-theme="dark"] .slot-row-icon-dinner { color: #a5b4fc; }

.slot-row-icon-night { color: #6d28d9; }
[data-theme="dark"] .slot-row-icon-night { color: #c4b5fd; }

.slot-row-title-col {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.slot-row-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.slot-row-subtitle {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
}

.headcount-badge {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
}

.headcount-badge strong {
  font-weight: 800;
}

.badge-lunch {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  border: 1px solid rgba(245, 158, 11, 0.25);
}
[data-theme="dark"] .badge-lunch {
  color: #fbbf24;
}

.badge-dinner {
  background: rgba(99, 102, 241, 0.12);
  color: #4338ca;
  border: 1px solid rgba(99, 102, 241, 0.25);
}
[data-theme="dark"] .badge-dinner {
  color: #a5b4fc;
}

.badge-night {
  background: rgba(139, 92, 246, 0.12);
  color: #6d28d9;
  border: 1px solid rgba(139, 92, 246, 0.25);
}
[data-theme="dark"] .badge-night {
  color: #c4b5fd;
}

.slot-row-content {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-left: 1.9rem;
  min-width: 0;
}

.slot-detail-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.detail-badge-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.detail-badge-label.absent-badge {
  color: #ef4444;
}

.detail-badge-label.presence-badge {
  color: #10b981;
}

.detail-badge-label.guest-badge {
  color: var(--accent-secondary);
}

.detail-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.person-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.775rem;
  font-weight: 600;
}

.absent-tag {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
}
[data-theme="dark"] .absent-tag {
  color: #f87171;
}

.presence-tag {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.25);
}
[data-theme="dark"] .presence-tag {
  color: #34d399;
}

.guest-tag {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.2);
}
[data-theme="dark"] .guest-tag {
  color: #34d399;
}

.slot-all-present {
  font-size: 0.785rem;
  color: var(--text-muted);
  font-weight: 500;
  word-break: break-word;
  overflow-wrap: break-word;
}

@media (max-width: 480px) {
  .today-slot-row {
    padding: 0.65rem 0.75rem;
  }
  .slot-row-content {
    padding-left: 0;
  }
  .headcount-badge {
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
  }
}

/* Tasks list styling */
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
  width: 100%;
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
  min-width: 0;
  box-sizing: border-box;
}

.task-item-row.completed { opacity: 0.65; }
.task-item-row.completed .task-title-text { text-decoration: line-through; }

.custom-checkbox {
  width: 20px;
  height: 20px;
  accent-color: var(--accent-primary);
  cursor: pointer;
  flex-shrink: 0;
}

.task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.task-title-text { 
  font-size: 0.925rem; 
  font-weight: 600; 
  word-break: break-word;
  overflow-wrap: break-word;
}

.task-meta { 
  display: flex; 
  align-items: center; 
  gap: 0.5rem; 
  flex-wrap: wrap;
}

.assigned-tag { font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; }



/* Events list */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
  width: 100%;
}

.event-item-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  min-width: 0;
  box-sizing: border-box;
}

.event-date-box {
  position: relative;
  width: 44px;
  height: 58px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.event-date-box::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--event-accent-color, var(--accent-purple));
}

.event-weekday { font-size: 0.6rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; line-height: 1.2; }
.event-day { font-size: 1.1rem; font-weight: 800; line-height: 1; }
.event-month { font-size: 0.65rem; font-weight: 700; color: var(--text-muted); }
.event-details { 
  display: flex; 
  flex-direction: column; 
  gap: 0.2rem; 
  min-width: 0;
  flex: 1;
}

.event-item-title { 
  font-size: 0.9rem; 
  font-weight: 700; 
  word-break: break-word;
  overflow-wrap: break-word;
}

.event-meta-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.775rem;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.dash-event-export-btns {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.btn-dash-cal {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: var(--radius-sm, 6px);
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-dash-cal:hover {
  transform: translateY(-1px);
}

.btn-dash-google:hover {
  color: #4285f4;
  border-color: #4285f4;
  background: rgba(66, 133, 244, 0.08);
}

.btn-dash-ics:hover {
  color: var(--accent-purple);
  border-color: var(--accent-purple);
  background: var(--accent-purple-light, rgba(139, 92, 246, 0.08));
}

@media (max-width: 480px) {
  .dash-btn-text {
    display: none;
  }
  .btn-dash-cal {
    padding: 0.3rem;
  }
}

.empty-state {
  padding: 1.75rem 0.5rem; 
  text-align: center; 
  color: var(--text-muted); 
  font-weight: 600; 
  word-break: break-word;
  overflow-wrap: break-word;
}
</style>
