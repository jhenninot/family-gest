<template>
  <div class="select-family-page">
    <div class="select-family-container">
      <div class="header-brand">
        <div class="logo-icon">
          <Sparkles :size="28" class="sparkle" />
        </div>
        <h1 class="brand-title">FamilyGest</h1>
        <p class="brand-subtitle">Choisissez votre espace familial</p>
      </div>

      <div class="user-badge glass-panel">
        <span class="user-avatar">{{ authStore.user?.avatar || '👤' }}</span>
        <div class="user-info">
          <span class="user-name">{{ authStore.user?.firstName }} {{ authStore.user?.lastName }}</span>
          <span class="user-email">{{ authStore.user?.email }}</span>
        </div>
        <button @click="handleLogout" class="btn-logout" title="Se déconnecter">
          <LogOut :size="18" />
        </button>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement de vos familles...</p>
      </div>

      <div v-else class="families-section">
        <!-- Super Admin Panel Card -->
        <div v-if="authStore.isSuperAdmin" class="super-admin-banner glass-card">
          <div class="banner-icon">
            <ShieldAlert :size="24" />
          </div>
          <div class="banner-text">
            <h4>Console Super Administrateur</h4>
            <p>Gérez toutes les familles, quotas et configuration SMTP globale</p>
          </div>
          <button @click="goToSuperAdmin" class="btn-super-admin">
            Ouvrir la console
          </button>
        </div>

        <div v-if="families.length === 0 && !authStore.isSuperAdmin" class="empty-families glass-card">
          <Users :size="48" class="empty-icon" />
          <h3>Aucune famille associée</h3>
          <p>Vous n'avez pas encore rejoint d'espace familial. Attendez une invitation par email de votre administrateur.</p>
        </div>

        <div v-else class="families-grid">
          <div 
            v-for="fam in families" 
            :key="fam.slug" 
            class="family-card glass-card clickable"
            @click="selectFamily(fam.slug)"
          >
            <div class="family-card-top">
              <div class="family-avatar">
                🏡
              </div>
              <div class="family-details">
                <h3 class="family-name">{{ fam.name }}</h3>
                <span class="family-slug">family-gest/{{ fam.slug }}</span>
              </div>
            </div>

            <div class="family-card-bottom">
              <span class="role-pill" :class="{ 'admin-role': fam.role === 'admin' || fam.isAdmin }">
                <ShieldCheck v-if="fam.role === 'admin' || fam.isAdmin" :size="14" />
                <User v-else :size="14" />
                {{ fam.role === 'admin' || fam.isAdmin ? 'Administrateur' : (fam.role || 'Membre') }}
              </span>
              <button class="btn-access">
                Accéder
                <ArrowRight :size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { Sparkles, LogOut, ShieldAlert, ShieldCheck, User, Users, ArrowRight } from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()

const loading = ref(true)
const families = ref([])

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  const fams = await familyStore.fetchUserFamilies()
  families.value = fams || authStore.families || []
  loading.value = false
})

const selectFamily = async (slug) => {
  await familyStore.switchFamily(slug)
  router.push(`/${slug}`)
}

const goToSuperAdmin = () => {
  router.push('/super-admin')
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.select-family-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent 40%),
              radial-gradient(circle at bottom left, rgba(168, 85, 247, 0.15), transparent 40%);
}

.select-family-container {
  width: 100%;
  max-width: 650px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header-brand {
  text-align: center;
}

.logo-icon {
  display: inline-flex;
  padding: 12px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--primary, #6366f1), var(--secondary, #a855f7));
  color: white;
  margin-bottom: 0.75rem;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
}

.brand-title {
  font-size: 2rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, #1e293b, #475569);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

[data-theme='dark'] .brand-title {
  background: linear-gradient(135deg, #f8fafc, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-subtitle {
  color: var(--text-muted, #64748b);
  margin-top: 0.25rem;
  font-size: 1.05rem;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(226, 232, 240, 0.8);
}

[data-theme='dark'] .user-badge {
  background: rgba(30, 41, 59, 0.7);
  border-color: rgba(51, 65, 85, 0.8);
}

.user-avatar {
  font-size: 1.8rem;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 700;
  font-size: 1rem;
}

.user-email {
  font-size: 0.82rem;
  color: var(--text-muted, #64748b);
}

.btn-logout {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-logout:hover {
  background: rgba(239, 68, 68, 0.1);
}

.super-admin-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.2rem;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1));
  border: 1px solid rgba(245, 158, 11, 0.3);
  margin-bottom: 1rem;
}

.banner-icon {
  color: #f59e0b;
}

.banner-text {
  flex: 1;
}

.banner-text h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #d97706;
}

[data-theme='dark'] .banner-text h4 {
  color: #fbbf24;
}

.banner-text p {
  margin: 0.2rem 0 0 0;
  font-size: 0.85rem;
  color: var(--text-muted, #64748b);
}

.btn-super-admin {
  background: #f59e0b;
  color: white;
  border: none;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-super-admin:hover {
  background: #d97706;
}

.families-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.family-card {
  padding: 1.25rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

[data-theme='dark'] .family-card {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(51, 65, 85, 0.8);
}

.family-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.15);
  border-color: var(--primary, #6366f1);
}

.family-card-top {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.family-avatar {
  font-size: 2rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 12px;
}

.family-details {
  display: flex;
  flex-direction: column;
}

.family-name {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.family-slug {
  font-size: 0.82rem;
  color: var(--text-muted, #64748b);
  font-family: monospace;
}

.family-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
  padding-top: 0.85rem;
}

[data-theme='dark'] .family-card-bottom {
  border-color: rgba(51, 65, 85, 0.6);
}

.role-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.3rem 0.65rem;
  border-radius: 9999px;
  background: rgba(148, 163, 184, 0.15);
  color: var(--text-muted, #64748b);
}

.role-pill.admin-role {
  background: rgba(99, 102, 241, 0.15);
  color: var(--primary, #6366f1);
}

.btn-access {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--primary, #6366f1), var(--secondary, #a855f7));
  color: white;
  border: none;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-access:hover {
  opacity: 0.92;
}

.empty-families {
  text-align: center;
  padding: 3rem 1.5rem;
  border-radius: 14px;
}

.empty-icon {
  color: var(--text-muted, #94a3b8);
  margin-bottom: 1rem;
}

.loading-state {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: var(--primary, #6366f1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
