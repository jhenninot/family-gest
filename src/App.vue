<template>
  <div class="app-container" :class="{ 'auth-page-container': isAuthPage }">
    <!-- Actions en haut à droite : Menu Utilisateur (Bouton Avatar unique avec Dropdown iOS Glassmorphism) -->
    <div v-if="authStore.isAuthenticated && !isAuthPage" class="top-header-actions" ref="userMenuRef">
      <!-- Bouton Profil avec Avatar de l'utilisateur + Menu Déroulant -->
      <div class="user-menu-wrapper">
        <button 
          @click="toggleUserMenu" 
          class="top-icon-btn profile-btn" 
          :class="{ 'menu-open': isUserMenuOpen }"
          :title="`Menu utilisateur (${displayName})`"
          aria-label="Menu utilisateur"
          :aria-expanded="isUserMenuOpen"
        >
          <UserAvatar 
            :avatar="authStore.user?.avatar" 
            :name="displayName" 
            size="sm" 
          />
        </button>

        <!-- Dropdown Menu Moderne iOS Glassmorphism -->
        <transition name="user-menu-fade">
          <div v-if="isUserMenuOpen" class="user-dropdown-menu glass-card">
            <!-- Header du menu avec identité de l'utilisateur -->
            <div class="user-dropdown-header">
              <UserAvatar 
                :avatar="authStore.user?.avatar" 
                :name="displayName" 
                size="md" 
              />
              <div class="user-dropdown-info">
                <span class="user-dropdown-name">{{ displayName }}</span>
                <span class="user-dropdown-email" v-if="authStore.user?.email">{{ authStore.user.email }}</span>
                <span class="user-dropdown-badge" v-if="userBadgeText">
                  {{ userBadgeText }}
                </span>
              </div>
            </div>

            <!-- Section Espaces Familiaux (Visible sur mobile) -->
            <div class="mobile-family-section">
              <div class="user-dropdown-divider"></div>

              <div class="user-dropdown-section-header">
                <span class="dropdown-section-title">Espaces Familiaux</span>
                <button 
                  @click="goToSelectFamily" 
                  class="dropdown-mini-btn"
                  title="Voir toutes mes familles"
                >
                  <Grid :size="12" />
                  <span>Toutes</span>
                </button>
              </div>

              <div class="mobile-family-list">
                <button 
                  v-for="fam in families" 
                  :key="fam.slug" 
                  class="mobile-family-item"
                  :class="{ active: currentSlug === fam.slug }"
                  @click="handleSelectFamily(fam.slug)"
                >
                  <div class="mobile-family-item-left">
                    <span class="mobile-family-icon">🏡</span>
                    <div class="mobile-family-details">
                      <span class="mobile-family-name">{{ fam.name }}</span>
                      <span class="mobile-family-slug">/{{ fam.slug }}</span>
                    </div>
                  </div>
                  <div class="mobile-family-item-right">
                    <span v-if="authStore.isSuperAdmin || fam.isAdmin" class="mobile-family-role-badge">
                      {{ authStore.isSuperAdmin ? 'Super Admin' : 'Admin' }}
                    </span>
                    <span v-if="currentSlug === fam.slug" class="mobile-family-check">✓</span>
                  </div>
                </button>
              </div>

              <button v-if="authStore.isSuperAdmin" @click="goToSuperAdmin" class="dropdown-super-admin-btn">
                <ShieldAlert :size="13" />
                <span>Console Super Admin</span>
              </button>
            </div>

            <div class="user-dropdown-divider"></div>

            <!-- Liste des actions -->
            <div class="user-dropdown-actions">
              <button @click="openProfileFromMenu" class="user-dropdown-item">
                <div class="item-icon-wrapper">
                  <User :size="16" />
                </div>
                <div class="item-label-group">
                  <span class="item-title">Mon Profil</span>
                  <span class="item-subtitle">Informations & avatar</span>
                </div>
              </button>

              <!-- Administration de la famille (Admin / Super Admin) -->
              <button 
                v-if="familyStore.isFamilyAdmin" 
                @click="goToFamilyAdmin" 
                class="user-dropdown-item admin-item"
                :class="{ 'active-route': isFamilyAdminRoute }"
              >
                <div class="item-icon-wrapper admin-icon">
                  <Settings :size="16" />
                </div>
                <div class="item-label-group">
                  <span class="item-title">Administration</span>
                  <span class="item-subtitle">Membres, rôles & paramètres</span>
                </div>
              </button>

              <button @click="toggleThemeFromMenu" class="user-dropdown-item">
                <div class="item-icon-wrapper theme-icon">
                  <Sun v-if="familyStore.isDarkMode" :size="16" />
                  <Moon v-else :size="16" />
                </div>
                <div class="item-label-group">
                  <span class="item-title">{{ familyStore.isDarkMode ? 'Mode Clair' : 'Mode Sombre' }}</span>
                  <span class="item-subtitle">{{ familyStore.isDarkMode ? 'Passer au thème clair' : 'Passer au thème sombre' }}</span>
                </div>
                <span class="theme-status-tag">
                  {{ familyStore.isDarkMode ? 'Sombre' : 'Clair' }}
                </span>
              </button>

              <div class="user-dropdown-divider"></div>

              <button @click="logoutFromMenu" class="user-dropdown-item logout-item">
                <div class="item-icon-wrapper logout-icon">
                  <LogOut :size="16" />
                </div>
                <div class="item-label-group">
                  <span class="item-title">Déconnexion</span>
                  <span class="item-subtitle">Fermer ma session</span>
                </div>
              </button>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- Modale Profil Utilisateur -->
    <UserProfileModal 
      v-if="authStore.isAuthenticated && !isAuthPage" 
      v-model="showProfileModal" 
    />

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

    <!-- Bannière d'installation PWA -->
    <PwaInstallPrompt />

    <!-- Invite de notifications Web Push par appareil -->
    <DevicePushPrompt />

    <!-- Boîte de confirmation globale personnalisée -->
    <ConfirmModal />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/authStore'
import { useFamilyStore } from './stores/familyStore'
import { Sun, Moon, LogOut, User, Grid, ShieldAlert, Settings } from '@lucide/vue'
import Sidebar from './components/Sidebar.vue'
import UserAvatar from './components/UserAvatar.vue'
import UserProfileModal from './components/UserProfileModal.vue'
import PwaInstallPrompt from './components/PwaInstallPrompt.vue'
import DevicePushPrompt from './components/DevicePushPrompt.vue'
import ConfirmModal from './components/ConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()

const showProfileModal = ref(false)
const isUserMenuOpen = ref(false)
const userMenuRef = ref(null)

const isAuthPage = computed(() => {
  return route.name === 'login' || route.name === 'set-password' || route.path === '/login' || route.path === '/set-password'
})

const displayName = computed(() => {
  const u = authStore.user
  if (!u) return 'Utilisateur'
  if (u.name) return u.name
  if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`
  if (u.firstName) return u.firstName
  return 'Utilisateur'
})

const userBadgeText = computed(() => {
  if (authStore.isSuperAdmin) return 'Super Admin'
  if (familyStore.currentFamilyIsAdmin) return 'Admin'
  return 'Membre'
})

const families = computed(() => {
  return familyStore.userFamilies.length > 0 ? familyStore.userFamilies : (authStore.families || [])
})

const currentSlug = computed(() => {
  return familyStore.currentFamily?.slug || route.params.familySlug || localStorage.getItem('familygest_active_slug') || ''
})

const handleSelectFamily = async (slug) => {
  closeUserMenu()
  const oldSlug = route.params.familySlug || familyStore.currentFamily?.slug || ''
  if (slug === oldSlug) return

  let subRoute = ''
  if (oldSlug && route.path.startsWith(`/${oldSlug}`)) {
    subRoute = route.path.slice(`/${oldSlug}`.length)
  }

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

const goToSelectFamily = () => {
  closeUserMenu()
  router.push('/select-family')
}

const goToSuperAdmin = () => {
  closeUserMenu()
  router.push('/super-admin')
}

const isFamilyAdminRoute = computed(() => {
  return route.path.includes('/settings') || route.name === 'family-settings'
})

const goToFamilyAdmin = () => {
  closeUserMenu()
  const slug = currentSlug.value
  if (slug) {
    router.push(`/${slug}/settings/email`)
  } else {
    router.push('/select-family')
  }
}

const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value
}

const closeUserMenu = () => {
  isUserMenuOpen.value = false
}

const openProfileFromMenu = () => {
  closeUserMenu()
  showProfileModal.value = true
}

const toggleThemeFromMenu = () => {
  familyStore.toggleTheme()
}

const logoutFromMenu = () => {
  closeUserMenu()
  handleLogout()
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const handleClickOutside = (e) => {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target)) {
    closeUserMenu()
  }
}

const handleKeyDown = (e) => {
  if (e.key === 'Escape') {
    closeUserMenu()
  }
}

// Fermer le menu lors d'une navigation
watch(() => route.path, () => {
  closeUserMenu()
})

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeyDown)

  if (authStore.isAuthenticated && !isAuthPage.value) {
    // Prolonger automatiquement la validité de la session de 30 jours à chaque connexion / visite
    await authStore.refreshSession()
    familyStore.fetchAllData()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style>
/* Actions en haut à droite (profil & raccourcis) avec support iOS Safe Area */
.top-header-actions {
  position: fixed;
  top: calc(1rem + env(safe-area-inset-top, 0px));
  right: calc(1.25rem + env(safe-area-inset-right, 0px));
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 1000;
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

.top-icon-btn.profile-btn {
  padding: 0;
  overflow: hidden;
  position: relative;
}

.top-icon-btn.profile-btn:hover,
.top-icon-btn.profile-btn.menu-open {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-primary-light), var(--shadow-md);
}

.top-icon-btn.logout-btn:hover {
  color: var(--accent-rose);
  border-color: var(--accent-rose);
  background: var(--accent-rose-light);
}

/* User Menu Wrapper & Dropdown */
.user-menu-wrapper {
  position: relative;
}

.user-dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 260px;
  max-width: calc(100vw - 1.5rem);
  max-height: calc(100vh - 5.5rem - env(safe-area-inset-top, 0px));
  overflow-y: auto;
  overscroll-behavior: contain;
  z-index: 1050;
  padding: 0.6rem;
  border-radius: var(--radius-lg, 16px);
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg), 0 10px 30px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

/* Section Espaces Familiaux dans le menu utilisateur */
.dropdown-family-section,
.mobile-family-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.user-dropdown-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.2rem 0.35rem 0.35rem 0.35rem;
}

.dropdown-section-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.dropdown-mini-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.18rem 0.45rem;
  border-radius: var(--radius-sm, 6px);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.dropdown-mini-btn:hover {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.mobile-family-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 180px;
  overflow-y: auto;
  padding-right: 2px;
}

.mobile-family-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.65rem;
  border-radius: var(--radius-md, 10px);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mobile-family-item:hover,
.mobile-family-item:active {
  background: var(--bg-card-hover);
  border-color: var(--accent-primary);
}

.mobile-family-item.active {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary);
}

.mobile-family-item-left {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  flex: 1;
}

.mobile-family-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.mobile-family-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
  text-align: left;
}

.mobile-family-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-family-slug {
  font-size: 0.68rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-family-item-right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.mobile-family-role-badge {
  font-size: 0.62rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-full);
  background: rgba(99, 102, 241, 0.15);
  color: var(--accent-primary);
}

.mobile-family-check {
  color: var(--accent-primary);
  font-weight: 800;
  font-size: 0.95rem;
}

.dropdown-super-admin-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.42rem 0.6rem;
  border-radius: var(--radius-md, 10px);
  border: 1px dashed rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.08);
  color: #d97706;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-top: 0.2rem;
}

.dropdown-super-admin-btn:hover {
  background: rgba(245, 158, 11, 0.18);
}

.user-dropdown-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.65rem;
  border-radius: var(--radius-md, 12px);
  background: var(--bg-secondary);
}

.user-dropdown-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.user-dropdown-name {
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-dropdown-email {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-dropdown-badge {
  align-self: flex-start;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.12rem 0.45rem;
  border-radius: var(--radius-full);
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  margin-top: 0.25rem;
}

.user-dropdown-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.2rem 0;
}

.user-dropdown-actions {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.55rem 0.65rem;
  border-radius: var(--radius-md, 12px);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-fast);
}

.user-dropdown-item:hover,
.user-dropdown-item:active {
  background: var(--bg-card-hover);
  border-color: var(--border-color);
  transform: translateX(2px);
}

.user-dropdown-item.active-route {
  background: var(--accent-primary-light);
  border-color: rgba(99, 102, 241, 0.3);
}

.user-dropdown-item.active-route .item-title {
  color: var(--accent-primary);
  font-weight: 700;
}

.item-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md, 10px);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.user-dropdown-item:hover .item-icon-wrapper {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

.item-label-group {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text-primary);
}

.item-subtitle {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.theme-status-tag {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-full);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.user-dropdown-item.logout-item {
  color: var(--accent-rose);
}

.user-dropdown-item.logout-item:hover,
.user-dropdown-item.logout-item:active {
  background: var(--accent-rose-light);
  border-color: rgba(244, 63, 94, 0.2);
}

.user-dropdown-item.logout-item .item-icon-wrapper {
  color: var(--accent-rose);
}

.user-dropdown-item.logout-item:hover .item-icon-wrapper {
  background: var(--accent-rose);
  color: white;
}

/* Transitions Dropdown */
.user-menu-fade-enter-active,
.user-menu-fade-leave-active {
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.user-menu-fade-enter-from,
.user-menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

/* Version Mobile (Safe Area iOS) */
@media (max-width: 900px) {
  .top-header-actions {
    position: absolute;
    top: calc(0.75rem + env(safe-area-inset-top, 0px));
    right: calc(0.85rem + env(safe-area-inset-right, 0px));
  }

  .top-icon-btn {
    width: 36px;
    height: 36px;
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
