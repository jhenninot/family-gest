<template>
  <div class="family-switcher-wrapper" ref="dropdownRef">
    <button 
      class="family-switcher-btn" 
      @click="toggleDropdown" 
      :title="currentFamilyName ? `Espace actif : ${currentFamilyName}` : 'Changer d\'espace familial'"
    >
      <div class="family-icon">🏡</div>
      <div class="family-text">
        <span class="family-name">{{ currentFamilyName || 'Choisir une famille' }}</span>
        <span class="family-role-badge" v-if="familyStore.currentFamilyRole || authStore.isSuperAdmin">
          {{ authStore.isSuperAdmin ? 'Super Admin' : (familyStore.currentFamilyIsAdmin ? 'Admin' : 'Membre') }}
        </span>
      </div>
      <ChevronDown :size="16" class="arrow-icon" :class="{ rotated: isOpen }" />
    </button>

    <transition name="fade-slide">
      <div v-if="isOpen" class="dropdown-menu glass-card">
        <div class="dropdown-header">
          <span>Mes Espaces Familiaux</span>
        </div>

        <div class="dropdown-list">
          <div 
            v-for="fam in families" 
            :key="fam.slug" 
            class="dropdown-item"
            :class="{ active: currentSlug === fam.slug }"
            @click="handleSelectFamily(fam.slug)"
          >
            <div class="item-left">
              <span class="item-icon">🏡</span>
              <div class="item-details">
                <span class="item-name">{{ fam.name }}</span>
                <span class="item-slug">/{{ fam.slug }}</span>
              </div>
            </div>
            <span v-if="currentSlug === fam.slug" class="check-mark">✓</span>
          </div>
        </div>

        <div class="dropdown-divider"></div>

        <div class="dropdown-footer">
          <button v-if="authStore.isSuperAdmin" @click="goToSuperAdmin" class="dropdown-action-btn super-admin-action">
            <ShieldAlert :size="16" />
            <span>Console Super Admin</span>
          </button>
          <button @click="goToSelectFamily" class="dropdown-action-btn">
            <Grid :size="16" />
            <span>Toutes mes familles</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { ChevronDown, ShieldAlert, Grid } from '@lucide/vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const familyStore = useFamilyStore()

const isOpen = ref(false)
const dropdownRef = ref(null)

const families = computed(() => {
  return familyStore.userFamilies.length > 0 ? familyStore.userFamilies : (authStore.families || [])
})

const currentSlug = computed(() => {
  return familyStore.currentFamily?.slug || route.params.familySlug || localStorage.getItem('familygest_active_slug') || ''
})

const currentFamilyName = computed(() => {
  if (familyStore.currentFamily?.name) return familyStore.currentFamily.name
  const match = families.value.find(f => f.slug === currentSlug.value)
  return match?.name || ''
})

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const handleClickOutside = (e) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const handleSelectFamily = async (slug) => {
  isOpen.value = false
  const oldSlug = route.params.familySlug || familyStore.currentFamily?.slug || ''
  if (slug === oldSlug) return

  // Preserve subroute (e.g. /tasks, /calendar, /shopping, /absences)
  let subRoute = ''
  if (oldSlug && route.path.startsWith(`/${oldSlug}`)) {
    subRoute = route.path.slice(`/${oldSlug}`.length)
  }

  // If on admin settings, ensure user has admin rights in target family
  if (subRoute.startsWith('/settings')) {
    const targetFam = families.value.find(f => f.slug === slug)
    const isAdminInTarget = authStore.isSuperAdmin || targetFam?.isAdmin
    if (!isAdminInTarget) {
      subRoute = ''
    }
  }

  await familyStore.switchFamily(slug)
  await router.push(`/${slug}${subRoute}`)
}

const goToSuperAdmin = () => {
  isOpen.value = false
  router.push('/super-admin')
}

const goToSelectFamily = () => {
  isOpen.value = false
  router.push('/select-family')
}
</script>

<style scoped>
.family-switcher-wrapper {
  position: relative;
  width: 100%;
}

.family-switcher-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-normal);
  box-sizing: border-box;
}

.family-switcher-btn:hover {
  border-color: var(--accent-primary);
  background: var(--accent-primary-light);
}

.family-icon {
  font-size: 1.3rem;
}

.family-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.family-name {
  font-weight: 700;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}

.family-role-badge {
  font-size: 0.72rem;
  color: var(--accent-primary);
  font-weight: 600;
}

.arrow-icon {
  color: var(--text-muted);
  transition: transform var(--transition-normal);
}

.arrow-icon.rotated {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 0.5rem;
  box-shadow: var(--shadow-xl);
  z-index: 200;
  border: 1px solid var(--border-color);
}

.dropdown-header {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
}

.dropdown-list {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.dropdown-item:hover {
  background: var(--accent-primary-light);
}

.dropdown-item.active {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

.item-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  overflow: hidden;
}

.item-icon {
  font-size: 1.1rem;
}

.item-details {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.item-name {
  font-weight: 600;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-slug {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-family: monospace;
}

.check-mark {
  color: var(--accent-primary);
  font-weight: bold;
}

.dropdown-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.4rem 0;
}

.dropdown-footer {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.dropdown-action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: var(--radius-sm);
  text-align: left;
  transition: all var(--transition-fast);
}

.dropdown-action-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.super-admin-action {
  color: var(--accent-amber);
}

.super-admin-action:hover {
  background: var(--accent-amber-light);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all var(--transition-normal);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
