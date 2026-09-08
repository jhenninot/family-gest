<template>
  <div class="app-container" :class="{ 'auth-page-container': !authStore.isAuthenticated }">
    <!-- Sidebar Navigation (Only when logged in) -->
    <Sidebar v-if="authStore.isAuthenticated" />

    <!-- Main View Content -->
    <main class="main-content" :class="{ 'full-width': !authStore.isAuthenticated }">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './stores/authStore'
import { useFamilyStore } from './stores/familyStore'
import Sidebar from './components/Sidebar.vue'

const authStore = useAuthStore()
const familyStore = useFamilyStore()

onMounted(() => {
  if (authStore.isAuthenticated) {
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
