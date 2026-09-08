<template>
  <div class="login-page">
    <div class="glass-card login-card">
      <div class="login-header">
        <div class="logo-badge">
          <Sparkles :size="28" />
        </div>
        <h1 class="login-title">FamilyGest</h1>
        <p class="login-subtitle">Connectez-vous pour accéder à l'espace familial</p>
      </div>

      <!-- Alert / Info Box about Admin Default Credentials -->
      <div class="info-alert">
        <ShieldCheck :size="18" class="info-icon" />
        <div class="info-text">
          <strong>Identifiants Administrateur par défaut :</strong>
          <div>Email: <code>admin@family-gest.org</code></div>
          <div>Mot de passe: <code>Admin123!</code></div>
        </div>
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
              placeholder="admin@family-gest.org" 
              class="form-input" 
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
            />
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          <span v-if="!loading">Se connecter</span>
          <span v-else>Connexion en cours...</span>
        </button>
      </form>

      <div class="login-footer">
        <span>Seul un utilisateur <strong>Administrateur</strong> peut ajouter ou supprimer des membres de la famille.</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { Sparkles, Mail, Lock, ShieldCheck, AlertCircle } from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()

const email = ref('admin@family-gest.org')
const password = ref('Admin123!')
const loading = ref(false)

const handleLogin = async () => {
  if (!email.value || !password.value) return
  loading.value = true
  
  const success = await authStore.login(email.value, password.value)
  loading.value = false

  if (success) {
    await familyStore.fetchAllData()
    router.push('/')
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

.info-alert {
  background: var(--accent-primary-light);
  border: 1px solid var(--accent-primary);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: 0.825rem;
  color: var(--text-primary);
}

.info-icon {
  color: var(--accent-primary);
  flex-shrink: 0;
  margin-top: 0.15rem;
}

.info-text code {
  background: rgba(99, 102, 241, 0.15);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-family: monospace;
  font-weight: 700;
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
}
</style>
