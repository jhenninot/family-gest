<template>
  <div class="invitation-page">
    <div class="invitation-container glass-card">
      <div class="invitation-header">
        <div class="icon-circle">
          <Sparkles :size="32" class="sparkle" />
        </div>
        <h2 class="title">Invitation Familiale</h2>
        <p v-if="invitationData" class="subtitle">
          Vous êtes invité(e) à rejoindre la famille <strong>{{ invitationData.family?.name }}</strong>
        </p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Vérification de l'invitation...</p>
      </div>

      <div v-else-if="error" class="error-state alert-box alert-error">
        <AlertCircle :size="20" />
        <p>{{ error }}</p>
        <router-link to="/login" class="btn btn-secondary mt-3">Retour à la connexion</router-link>
      </div>

      <div v-else-if="invitationData" class="invitation-content">
        <!-- CAS 1: UTILISATEUR EXISTANT -->
        <div v-if="invitationData.userExists" class="existing-user-section">
          <div class="welcome-box">
            <div class="avatar-large">{{ invitationData.existingUser?.avatar || '👋' }}</div>
            <h3>Ravi de vous revoir, {{ invitationData.existingUser?.firstName }} !</h3>
            <p>
              Votre compte existant avec l'adresse <strong>{{ invitationData.invitation?.email }}</strong> a été invité à rejoindre cet espace familial.
            </p>
          </div>

          <div v-if="authStore.isAuthenticated && authStore.user?.email?.toLowerCase() === invitationData.invitation?.email?.toLowerCase()">
            <button @click="handleAcceptExisting" class="btn btn-primary btn-block" :disabled="accepting">
              {{ accepting ? 'Adhésion en cours...' : 'Rejoindre la famille maintenant' }}
            </button>
          </div>
          <div v-else>
            <p class="text-muted text-center mb-3">Veuillez vous connecter pour confirmer votre adhésion.</p>
            <router-link :to="`/login?redirect=/invitation/${token}`" class="btn btn-primary btn-block">
              Se connecter pour accepter
            </router-link>
          </div>
        </div>

        <!-- CAS 2: NOUVEL UTILISATEUR -->
        <form v-else @submit.prevent="handleAcceptNew" class="new-user-form">
          <div class="form-group">
            <label class="form-label">Adresse Email</label>
            <input 
              :value="invitationData.invitation?.email" 
              type="email" 
              disabled 
              class="form-input disabled-input" 
            />
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Prénom</label>
              <input 
                v-model="formData.firstName" 
                type="text" 
                required 
                placeholder="Votre prénom" 
                class="form-input" 
              />
            </div>
            <div class="form-group">
              <label class="form-label">Nom</label>
              <input 
                v-model="formData.lastName" 
                type="text" 
                required 
                placeholder="Votre nom" 
                class="form-input" 
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Rôle familial souhaité</label>
            <select v-model="formData.role" class="form-select">
              <option value="Papa">Papa</option>
              <option value="Maman">Maman</option>
              <option value="Fils">Fils</option>
              <option value="Fille">Fille</option>
              <option value="Grand-Parent">Grand-Parent</option>
              <option value="Oncle / Tante">Oncle / Tante</option>
              <option value="Baby-Sitter">Baby-Sitter</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Mot de passe</label>
              <input 
                v-model="formData.password" 
                type="password" 
                required 
                placeholder="Mot de passe sécurisé" 
                class="form-input" 
              />
              <PasswordStrengthIndicator v-if="formData.password" :password="formData.password" />
            </div>

            <div class="form-group">
              <label class="form-label">Confirmer le mot de passe</label>
              <input 
                v-model="formData.confirmPassword" 
                type="password" 
                required 
                placeholder="Retapez votre mot de passe" 
                class="form-input" 
              />
              <span v-if="passwordMismatch" class="error-subtext">Les mots de passe ne correspondent pas</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Choisissez un Avatar</label>
            <div class="avatar-options">
              <button 
                v-for="emoji in avatarOptions" 
                :key="emoji"
                type="button"
                class="avatar-option-btn"
                :class="{ selected: formData.avatar === emoji }"
                @click="formData.avatar = emoji"
              >
                {{ emoji }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Couleur de profil</label>
            <div class="color-picker-options">
              <button 
                v-for="c in colorOptions" 
                :key="c"
                type="button"
                class="color-btn"
                :style="{ backgroundColor: c }"
                :class="{ selected: formData.color === c }"
                @click="formData.color = c"
              ></button>
            </div>
          </div>

          <div v-if="formError" class="alert-box alert-error mb-3">
            {{ formError }}
          </div>

          <button 
            type="submit" 
            class="btn btn-primary btn-block" 
            :disabled="accepting || passwordMismatch || !isPasswordValid(formData.password)"
          >
            {{ accepting ? 'Création de votre compte...' : 'Créer mon compte et rejoindre la famille' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { Sparkles, AlertCircle } from '@lucide/vue'
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator.vue'
import { isPasswordValid, getPasswordErrorMessage } from '../utils/passwordValidator'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()

const token = route.params.token
const loading = ref(true)
const error = ref('')
const invitationData = ref(null)
const accepting = ref(false)
const formError = ref('')

const avatarOptions = ['👨‍💼', '👩‍💼', '👦', '👧', '👶', '👴', '👵', '🧑‍🍳', '🦸‍♂️', '🦸‍♀️', '🐱', '🐶']
const colorOptions = [
  '#6366f1', '#a855f7', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'
]

const formData = reactive({
  firstName: '',
  lastName: '',
  role: 'Membre',
  password: '',
  confirmPassword: '',
  avatar: '👨‍💼',
  color: '#6366f1'
})

const passwordMismatch = computed(() => {
  return formData.confirmPassword && formData.password !== formData.confirmPassword
})

onMounted(async () => {
  try {
    const res = await fetch(`/api/invitations/${token}`)
    const data = await res.json()
    if (!res.ok) {
      error.value = data.error || 'Invitation introuvable ou expirée'
      return
    }
    invitationData.value = data
    if (data.invitation) {
      formData.role = data.invitation.role || 'Membre'
      if (data.invitation.firstName) formData.firstName = data.invitation.firstName
      if (data.invitation.lastName) formData.lastName = data.invitation.lastName
    }
  } catch (err) {
    error.value = 'Erreur lors du contact du serveur'
  } finally {
    loading.value = false
  }
})

const handleAcceptExisting = async () => {
  accepting.value = true
  try {
    const res = await fetch(`/api/invitations/${token}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({})
    })
    const data = await res.json()
    if (!res.ok) {
      error.value = data.error || 'Erreur lors de l\'acceptation'
      return
    }
    await authStore.refreshSession()
    await familyStore.switchFamily(data.familySlug)
    router.push(`/${data.familySlug}`)
  } catch (err) {
    error.value = err.message
  } finally {
    accepting.value = false
  }
}

const handleAcceptNew = async () => {
  if (passwordMismatch.value) return
  if (!isPasswordValid(formData.password)) {
    formError.value = getPasswordErrorMessage()
    return
  }

  accepting.value = true
  formError.value = ''
  try {
    const res = await fetch(`/api/invitations/${token}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    const data = await res.json()
    if (!res.ok) {
      formError.value = data.error || 'Erreur lors de la finalisation'
      return
    }
    authStore.setAuth(data.user, data.token)
    await familyStore.switchFamily(data.familySlug)
    router.push(`/${data.familySlug}`)
  } catch (err) {
    formError.value = err.message
  } finally {
    accepting.value = false
  }
}
</script>

<style scoped>
.invitation-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent 40%),
              radial-gradient(circle at bottom left, rgba(168, 85, 247, 0.15), transparent 40%);
}

.invitation-container {
  width: 100%;
  max-width: 540px;
  padding: 2rem;
  border-radius: 20px;
}

.invitation-header {
  text-align: center;
  margin-bottom: 2rem;
}

.icon-circle {
  display: inline-flex;
  padding: 1rem;
  background: linear-gradient(135deg, var(--primary, #6366f1), var(--secondary, #a855f7));
  color: white;
  border-radius: 50%;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
  margin-bottom: 1rem;
}

.title {
  font-size: 1.8rem;
  font-weight: 800;
  margin: 0;
}

.subtitle {
  color: var(--text-muted, #64748b);
  margin-top: 0.5rem;
  font-size: 1rem;
}

.welcome-box {
  text-align: center;
  padding: 1.5rem;
  background: rgba(99, 102, 241, 0.05);
  border-radius: 12px;
  border: 1px dashed rgba(99, 102, 241, 0.3);
  margin-bottom: 1.5rem;
}

.avatar-large {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.welcome-box h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.welcome-box p {
  color: var(--text-muted, #64748b);
  margin: 0;
  font-size: 0.95rem;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 500px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}

.form-group {
  margin-bottom: 1.2rem;
}

.form-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.form-input, .form-select {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
  border: 1px solid var(--border-color, #cbd5e1);
  background: var(--bg-card, #ffffff);
  color: var(--text-color, #1e293b);
  font-size: 0.95rem;
  box-sizing: border-box;
}

.disabled-input {
  opacity: 0.7;
  cursor: not-allowed;
  background: rgba(0, 0, 0, 0.05);
}

.error-subtext {
  color: #ef4444;
  font-size: 0.8rem;
  margin-top: 0.25rem;
  display: block;
}

.avatar-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.avatar-option-btn {
  font-size: 1.5rem;
  padding: 0.4rem;
  border-radius: 8px;
  border: 2px solid transparent;
  background: rgba(0, 0, 0, 0.03);
  cursor: pointer;
  transition: all 0.2s;
}

.avatar-option-btn.selected {
  border-color: var(--primary, #6366f1);
  background: rgba(99, 102, 241, 0.15);
  transform: scale(1.1);
}

.color-picker-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.color-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.2s;
}

.color-btn.selected {
  border-color: white;
  box-shadow: 0 0 0 2px var(--primary, #6366f1);
  transform: scale(1.15);
}

.btn-block {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
}

.alert-box {
  padding: 0.85rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.alert-error {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.loading-state {
  text-align: center;
  padding: 2rem;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: var(--primary, #6366f1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 0.75rem auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
