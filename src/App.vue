<template>
  <div class="app-container" :class="{ 'auth-page-container': isAuthPage }">
    <!-- 2 Petites icônes tout en haut à droite : Mode Nuit & Déconnexion -->
    <div v-if="authStore.isAuthenticated && !isAuthPage" class="top-header-actions">
      <button 
        @click="familyStore.toggleTheme" 
        class="top-icon-btn" 
        :title="familyStore.isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre'"
        aria-label="Mode Nuit / Jour"
      >
        <Sun v-if="familyStore.isDarkMode" :size="17" />
        <Moon v-else :size="17" />
      </button>

      <button 
        @click="handleLogout" 
        class="top-icon-btn logout-btn" 
        title="Se déconnecter"
        aria-label="Déconnexion"
      >
        <LogOut :size="17" />
      </button>
    </div>

    <!-- Sidebar Navigation (Only when logged in and NOT on an auth/activation page) -->
    <Sidebar v-if="authStore.isAuthenticated && !isAuthPage" />

    <!-- Main View Content -->
    <main class="main-content" :class="{ 'full-width': !authStore.isAuthenticated || isAuthPage }">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/authStore'
import { useFamilyStore } from './stores/familyStore'
import { Sun, Moon, LogOut } from '@lucide/vue'
import Sidebar from './components/Sidebar.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()

const isAuthPage = computed(() => {
  return route.name === 'login' || route.name === 'set-password' || route.path === '/login' || route.path === '/set-password'
})

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

onMounted(() => {
  if (authStore.isAuthenticated && !isAuthPage.value) {
    familyStore.fetchAllData()
  }
})
</script>

<style>
/* 2 Petites icônes tout en haut à droite */
.top-header-actions {
  position: fixed;
  top: 1rem;
  right: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 100;
}

.top-icon-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full, 9999px);
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.top-icon-btn:hover {
  background: var(--bg-card-hover);
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.top-icon-btn.logout-btn:hover {
  color: var(--accent-rose);
  border-color: var(--accent-rose);
  background: var(--accent-rose-light);
}

@media (max-width: 900px) {
  .top-header-actions {
    top: 0.75rem;
    right: 0.85rem;
  }
  .top-icon-btn {
    width: 33px;
    height: 33px;
  }
}

/* Full width override when logged out */
.main-content.full-width {
  padding: 0;
  max-width: 100%;
}

.auth-page-container {
  display: block;
}

/* Transition between routes */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
