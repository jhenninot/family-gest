<template>
  <div class="login-page">
    <div class="glass-card login-card">
      <div class="login-header">
        <div class="logo-badge">
          <BrandLogo :size="28" />
        </div>
        <h1 class="login-title">FamilyGest</h1>
        <p class="login-subtitle">Connectez-vous pour accéder à l'espace familial</p>
      </div>

      <!-- Error alert -->
      <div v-if="authStore.error" class="error-alert">
        <AlertCircle :size="18" />
        <span>{{ authStore.error }}</span>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label class="form-label">Adresse Email (Login)</label>
          <div class="input-with-icon">
            <Mail :size="18" class="input-icon" />
            <input 
              v-model="email" 
              type="email" 
              required 
              placeholder="ex: nom@famille.fr" 
              class="form-input" 
              autocomplete="email"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Mot de passe</label>
          <div class="input-with-icon">
            <Lock :size="18" class="input-icon" />
            <input 
              v-model="password" 
              type="password" 
              required 
              placeholder="••••••••" 
              class="form-input" 
              autocomplete="current-password"
            />
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          <span v-if="!loading">Se connecter</span>
          <span v-else>Connexion en cours...</span>
        </button>
      </form>

      <div class="login-footer">
        <button 
          type="button" 
          @click="handleForceRefresh" 
          class="btn-refresh-login" 
          :disabled="isRefreshing"
          title="Vider le cache et forcer le rechargement de la dernière version"
        >
          <RefreshCw :size="13" :class="{ 'spin-icon': isRefreshing }" />
          <span>{{ isRefreshing ? 'Mise à jour...' : 'Vider le cache & rafraîchir l\'application' }}</span>
        </button>
        <span>Portail sécurisé FamilyGest &bull; Tous droits réservés</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { Mail, Lock, AlertCircle, RefreshCw } from '@lucide/vue'
import { forceAppRefresh } from '../utils/cacheHelper'
import BrandLogo from '../components/BrandLogo.vue'

const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const isRefreshing = ref(false)

const handleForceRefresh = async () => {
  if (isRefreshing.value) return
  isRefreshing.value = true
  setTimeout(async () => {
    await forceAppRefresh()
  }, 250)
}

const handleLogin = async () => {
  if (!email.value || !password.value) return
  loading.value = true
  
  const success = await authStore.login(email.value, password.value)
  loading.value = false

  if (success) {
    const fams = authStore.families || []
    if (fams.length === 1) {
      const targetSlug = fams[0].slug
      await familyStore.switchFamily(targetSlug)
      router.push(`/${targetSlug}`)
    } else {
      router.push('/select-family')
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent 40%),
              radial-gradient(circle at bottom left, rgba(236, 72, 153, 0.12), transparent 40%);
}

.login-card {
  width: 100%;
  max-width: 440px;
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.logo-badge {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 1rem;
  box-shadow: var(--shadow-glow);
}

.login-title {
  font-size: 1.8rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.login-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.error-alert {
  background: var(--accent-rose-light);
  color: var(--accent-rose);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.login-form {
  display: flex;
  flex-direction: column;
}

.input-with-icon {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.input-with-icon .form-input {
  padding-left: 2.6rem;
}

.btn-block {
  width: 100%;
  padding: 0.8rem;
  font-size: 0.95rem;
  margin-top: 0.5rem;
}

.login-footer {
  text-align: center;
  font-size: 0.775rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border-color);
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
}

.btn-refresh-login {
  background: transparent;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-refresh-login:hover {
  background: var(--bg-tertiary);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
