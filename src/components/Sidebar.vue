<template>
  <aside class="sidebar">
    <!-- App Logo / Brand -->
    <div class="brand">
      <div class="logo-icon">
        <BrandLogo :size="24" />
      </div>
      <div class="brand-text">
        <span class="brand-name">FamilyGest</span>
        <span class="brand-tag" :title="currentFamilyName">{{ currentFamilyName }}</span>
      </div>
    </div>

    <!-- Family Switcher Dropdown -->
    <div class="family-switcher-section">
      <FamilySwitcher />
    </div>


    <!-- Navigation Menu -->
    <nav class="nav-menu">
      <router-link :to="getPath('')" class="nav-item" active-class="active">
        <LayoutDashboard :size="20" />
        <span>Tableau de bord</span>
      </router-link>

      <!-- 1. Présence -->
      <router-link :to="getPath('/absences')" class="nav-item" active-class="active">
        <HouseUser :size="20" />
        <span>Présence</span>
        <span 
          v-if="store.members.length > 0" 
          class="badge-count presence" 
          :title="`${store.nextMealHeadcount} personne${store.nextMealHeadcount > 1 ? 's' : ''} présente${store.nextMealHeadcount > 1 ? 's' : ''} au prochain repas (${store.nextMealInfo.label})`"
        >
          {{ store.nextMealHeadcount }}
        </span>
      </router-link>

      <!-- 2. Repas de la semaine -->
      <router-link :to="getPath('/meals')" class="nav-item" active-class="active">
        <Utensils :size="20" />
        <span>Repas</span>
        <span 
          v-if="thisWeekMealsCount > 0" 
          class="badge-count warning"
          :title="`${thisWeekMealsCount} plat(s) prévu(s) cette semaine`"
        >
          {{ thisWeekMealsCount }}
        </span>
      </router-link>

      <!-- 3. Liste de courses -->
      <router-link :to="getPath('/shopping')" class="nav-item" active-class="active">
        <ShoppingCart :size="20" />
        <span>Liste de courses</span>
        <span v-if="store.pendingShoppingCount > 0" class="badge-count warning">{{ store.pendingShoppingCount }}</span>
      </router-link>

      <!-- 3. Tâches -->
      <router-link :to="getPath('/tasks')" class="nav-item" active-class="active">
        <CheckSquare :size="20" />
        <span>Tâches</span>
        <span v-if="store.pendingTasksCount > 0" class="badge-count">{{ store.pendingTasksCount }}</span>
      </router-link>

      <!-- 4. Evénements du calendrier -->
      <router-link :to="getPath('/calendar')" class="nav-item" active-class="active">
        <Calendar :size="20" />
        <span>Calendrier</span>
        <span v-if="store.events.length > 0" class="badge-count info">{{ store.events.length }}</span>
      </router-link>
    </nav>

    <!-- Shortcuts / Web Apps Section (Masqué sur la console Super Admin et si aucun raccourci) -->
    <div v-if="!isSuperAdminRoute && store.shortcuts && store.shortcuts.length > 0" class="shortcuts-section">
      <div class="shortcuts-header">
        <div class="shortcuts-header-title">
          <Globe :size="15" class="shortcuts-title-icon" />
          <span>Raccourcis</span>
        </div>
      </div>

      <!-- Shortcuts list -->
      <div class="shortcuts-list">
        <div 
          v-for="item in store.shortcuts" 
          :key="item.id" 
          class="shortcut-item-row"
        >
          <a 
            :href="item.url" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="shortcut-nav-link"
            :title="`Ouvrir ${item.title} (${item.url})`"
          >
            <span class="shortcut-emoji">{{ item.icon || '🌐' }}</span>
            <span class="shortcut-text">{{ item.title }}</span>
            <ExternalLink :size="12" class="shortcut-ext-icon" />
          </a>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  ShoppingCart, 
  Utensils,
  Award, 
  Globe, 
  ExternalLink 
} from '@lucide/vue'
import HouseUser from './icons/HouseUser.vue'
import FamilySwitcher from './FamilySwitcher.vue'
import BrandLogo from './BrandLogo.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const store = useFamilyStore()

const isSuperAdminRoute = computed(() => route.path.startsWith('/super-admin'))

const currentSlug = computed(() => store.currentFamily?.slug || localStorage.getItem('familygest_active_slug') || '')
const currentFamilyName = computed(() => {
  if (store.currentFamily?.name) return store.currentFamily.name
  const list = store.userFamilies.length > 0 ? store.userFamilies : (authStore.families || [])
  const match = list.find(f => f.slug === currentSlug.value)
  return match?.name || store.currentFamily?.name || 'Espace Familial'
})
const getPath = (sub) => currentSlug.value ? `/${currentSlug.value}${sub}` : (sub || '/')

// Nombre de plats prévus dans la semaine courante
const thisWeekMealsCount = computed(() => {
  if (!store.meals || store.meals.length === 0) return 0
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  
  const y = monday.getFullYear()
  const m = String(monday.getMonth() + 1).padStart(2, '0')
  const da = String(monday.getDate()).padStart(2, '0')
  const monStr = `${y}-${m}-${da}`

  const sy = sunday.getFullYear()
  const sm = String(sunday.getMonth() + 1).padStart(2, '0')
  const sda = String(sunday.getDate()).padStart(2, '0')
  const sunStr = `${sy}-${sm}-${sda}`

  return store.meals.filter(meal => meal.date >= monStr && meal.date <= sunStr).length
})

</script>

<style scoped>
.sidebar {
  width: 280px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1.25rem;
  min-height: 100vh;
  gap: 1.25rem;
  transition: background-color var(--transition-normal);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.25rem 0.5rem;
}

.logo-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: var(--shadow-glow);
}

.sparkle {
  animation: pulse 2s infinite alternate;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.9; }
  100% { transform: scale(1.15); opacity: 1; }
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-tag {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 190px;
}

.family-switcher-section {
  margin-bottom: 0.5rem;
}

/* Nav Menu */
.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.925rem;
  transition: all var(--transition-fast);
  position: relative;
}

.nav-item:hover {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

.nav-item.active {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
  color: white;
  box-shadow: var(--shadow-glow);
}

.badge-count {
  margin-left: auto;
  background: var(--accent-rose);
  color: white;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
}

.badge-count.info { background: var(--accent-primary); }
.badge-count.warning { background: var(--accent-amber); }
.badge-count.presence, .badge-count.success { background: var(--accent-secondary); }

/* Family Widget */
.family-widget {
  padding: 1rem;
  border-radius: var(--radius-md);
  margin-top: auto;
}

.widget-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.825rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.75rem;
}

.trophy-icon { color: var(--accent-amber); }

.members-mini-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.member-mini-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.member-avatar {
  font-size: 1.2rem;
  background: var(--bg-tertiary);
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.member-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.member-name { font-size: 0.85rem; font-weight: 700; line-height: 1.2; }
.member-role { font-size: 0.725rem; color: var(--text-muted); }



.help-subtext {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.btn-close { background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; }
/* Shortcuts Section */
.shortcuts-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem 0.25rem;
  border-top: 1px solid var(--border-color);
}

.shortcuts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem;
}

.shortcuts-header-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.shortcuts-title-icon {
  color: var(--accent-primary);
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 200px;
  overflow-y: auto;
}

.shortcut-item-row {
  display: flex;
  align-items: center;
  position: relative;
  border-radius: var(--radius-md);
  transition: background-color var(--transition-fast);
}

.shortcut-item-row:hover {
  background: var(--bg-tertiary);
}

.shortcut-nav-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0.65rem;
  flex: 1;
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: color var(--transition-fast);
}

.shortcut-nav-link:hover {
  color: var(--accent-primary);
}

.shortcut-emoji {
  font-size: 1.1rem;
  line-height: 1;
  flex-shrink: 0;
}

.shortcut-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.shortcut-ext-icon {
  color: var(--text-muted);
  opacity: 0.5;
  margin-left: auto;
  flex-shrink: 0;
  transition: opacity var(--transition-fast), color var(--transition-fast);
}

.shortcut-nav-link:hover .shortcut-ext-icon {
  opacity: 1;
  color: var(--accent-primary);
}

@media (max-width: 900px) {
  .sidebar {
    width: 100%;
    min-height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    padding: calc(0.85rem + env(safe-area-inset-top, 0px)) calc(1rem + env(safe-area-inset-right, 0px)) 1rem calc(1rem + env(safe-area-inset-left, 0px));
    gap: 0.75rem;
  }
  .family-widget {
    display: none;
  }
  .family-switcher-section {
    display: none;
  }
  .nav-menu {
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    gap: 0.5rem;
  }
  
  .nav-item {
    padding: 0.55rem 0.75rem;
    gap: 0.25rem; /* Espacement réduit et harmonieux entre l'icône et le compteur */
  }

  .nav-item span:not(.badge-count) {
    display: none;
  }

  .nav-item .badge-count {
    margin-left: 0; /* Annule le margin-left: auto du desktop */
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.1rem 0.35rem;
    min-width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  /* Shortcuts Mobile */
  .shortcuts-section {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.5rem 0 0.25rem 0;
    border-top: 1px solid var(--border-color);
  }

  .shortcuts-header {
    padding: 0 0.25rem;
  }

  .shortcuts-list {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding-bottom: 0.35rem;
    max-height: none;
    overflow: visible;
  }

  .shortcut-item-row {
    flex-shrink: 0;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
  }

  .shortcut-nav-link {
    padding: 0.4rem 0.65rem;
    font-size: 0.8rem;
    gap: 0.45rem;
  }

  .shortcut-ext-icon {
    display: none;
  }
}

</style>
