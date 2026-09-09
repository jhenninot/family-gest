<template>
  <div class="app-container" :class="{ 'auth-page-container': isAuthPage }">
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
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/authStore'
import { useFamilyStore } from './stores/familyStore'
import Sidebar from './components/Sidebar.vue'

const route = useRoute()
const authStore = useAuthStore()
const familyStore = useFamilyStore()

const isAuthPage = computed(() => {
  return route.name === 'login' || route.name === 'set-password' || route.path === '/login' || route.path === '/set-password'
})

onMounted(() => {
  if (authStore.isAuthenticated && !isAuthPage.value) {
    familyStore.fetchAllData()
  }
})
</script>

<style>
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
