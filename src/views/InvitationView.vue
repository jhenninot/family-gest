<template>
  <div class="invitation-page">
    <div class="invitation-container glass-card">
      <div class="invitation-header">
        <div class="icon-circle">
          <BrandLogo :size="32" />
        </div>
        <h2 class="title">{{ t('invitation.title') }}</h2>
        <p v-if="invitationData" class="subtitle">
          <i18n-t keypath="invitation.invitedTo" tag="span"><template #family><strong>{{ invitationData.family?.name }}</strong></template></i18n-t>
          <br v-if="invitationData.isAdmin" />
          <span v-if="invitationData.isAdmin" class="admin-subtitle-pill">
            <ShieldCheck :size="14" /> {{ t('invitation.asAdmin') }}
          </span>
        </p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>{{ t('invitation.checking') }}</p>
      </div>

      <div v-else-if="error" class="error-state alert-box alert-error">
        <AlertCircle :size="20" />
        <p>{{ error }}</p>
        <router-link to="/login" class="btn btn-secondary mt-3">{{ t('legal.backToLogin') }}</router-link>
      </div>

      <div v-else-if="invitationData" class="invitation-content">
        <!-- CAS 1: UTILISATEUR EXISTANT -->
        <div v-if="invitationData.userExists || invitationData.isExistingUser" class="existing-user-section">
          <div class="welcome-box">
            <UserAvatar :avatar="invitationData.existingUser?.avatar" :name="invitationData.existingUser?.firstName" size="xxl" />
            <h3>{{ t('invitation.welcomeBack', { name: invitationData.existingUser?.firstName }) }}</h3>
            <i18n-t :keypath="invitationData.isAdmin ? 'invitation.existingAccountAdmin' : 'invitation.existingAccount'" tag="p">
              <template #email><strong>{{ invitationData.email || invitationData.invitation?.email }}</strong></template>
              <template #admin><strong>{{ t('invitation.adminWord') }}</strong></template>
            </i18n-t>
          </div>

          <div v-if="authStore.isAuthenticated && authStore.user?.email?.toLowerCase() === (invitationData.email || invitationData.invitation?.email)?.toLowerCase()">
            <button @click="handleAcceptExisting" class="btn btn-primary btn-block" :disabled="accepting">
              {{ accepting ? t('invitation.joining') : (invitationData.isAdmin ? t('invitation.joinAsAdmin') : t('invitation.joinNow')) }}
            </button>
          </div>
          <div v-else>
            <p class="text-muted text-center mb-3">{{ t('invitation.signInToConfirm') }}</p>
            <router-link :to="`/login?redirect=/invitation/${token}`" class="btn btn-primary btn-block">
              {{ t('invitation.signInToAccept') }}
            </router-link>
          </div>
        </div>

        <!-- CAS 2: NOUVEL UTILISATEUR -->
        <form v-else @submit.prevent="handleAcceptNew" class="new-user-form">
          <div class="form-group">
            <label class="form-label">{{ t('invitation.email') }}</label>
            <input 
              :value="invitationData.email || invitationData.invitation?.email" 
              type="email" 
              disabled 
              class="form-input disabled-input" 
            />
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">{{ t('invitation.firstName') }}</label>
              <input 
                v-model="formData.firstName" 
                type="text" 
                required 
                :placeholder="t('invitation.firstNamePlaceholder')" 
                class="form-input" 
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('invitation.lastName') }}</label>
              <input 
                v-model="formData.lastName" 
                type="text" 
                required 
                :placeholder="t('invitation.lastNamePlaceholder')" 
                class="form-input" 
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('invitation.role') }}</label>
            <select v-model="formData.role" class="form-select">
              <option v-if="invitationData.isAdmin" value="Administrateur">⭐ {{ translateValue('role', 'Administrateur') }}</option>
              <option v-for="r in FAMILY_ROLE_VALUES" :key="r" :value="r">{{ translateValue('role', r) }}</option>
            </select>
            <span v-if="invitationData.isAdmin" class="help-subtext-admin">
              🛡️ {{ t('invitation.adminRightsHint') }}
            </span>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">{{ t('invitation.password') }}</label>
              <input 
                v-model="formData.password" 
                type="password" 
                required 
                :placeholder="t('invitation.passwordPlaceholder')" 
                class="form-input" 
              />
              <PasswordStrengthIndicator v-if="formData.password" :password="formData.password" />
            </div>

            <div class="form-group">
              <label class="form-label">{{ t('setPassword.confirmPassword') }}</label>
              <input 
                v-model="formData.confirmPassword" 
                type="password" 
                required 
                :placeholder="t('setPassword.confirmPlaceholder')" 
                class="form-input" 
              />
              <span v-if="passwordMismatch" class="error-subtext">{{ t('password.errors.mismatch') }}</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('invitation.avatar') }}</label>
            <AvatarPicker 
              v-model="formData.avatar" 
              :color="formData.color" 
              :name="`${formData.firstName} ${formData.lastName}`" 
            />
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('invitation.color') }}</label>
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
            {{ accepting ? t('invitation.creating') : (invitationData?.isAdmin ? t('invitation.createAndAdmin') : t('invitation.createAndJoin')) }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { signupLanguage } from '../i18n'
import { FAMILY_ROLE_VALUES, translateValue } from '../i18n/values'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { AlertCircle, ShieldCheck } from '@lucide/vue'
import BrandLogo from '../components/BrandLogo.vue'
import UserAvatar from '../components/UserAvatar.vue'
import AvatarPicker from '../components/AvatarPicker.vue'
import { DEFAULT_AVATAR } from '../utils/avatarHelper'
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator.vue'
import { isPasswordValid, getPasswordErrorMessage } from '../utils/passwordValidator'

const route = useRoute()
const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()

const token = route.params.token
const loading = ref(true)
const error = ref('')
const invitationData = ref(null)
const accepting = ref(false)
const formError = ref('')

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
  avatar: DEFAULT_AVATAR,
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
      error.value = data.error || t('invitation.errors.notFound')
      return
    }
    invitationData.value = data
    const inv = data.invitation || data
    if (inv) {
      formData.role = (data.isAdmin || inv.isAdmin) ? 'Administrateur' : (inv.role || 'Membre')
      if (inv.firstName) formData.firstName = inv.firstName
      if (inv.lastName) formData.lastName = inv.lastName
    }
  } catch (err) {
    error.value = t('common.errors.server')
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
      error.value = data.error || t('invitation.errors.acceptFailed')
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
    formError.value = getPasswordErrorMessage(formData.password)
    return
  }

  accepting.value = true
  formError.value = ''
  try {
    const res = await fetch(`/api/invitations/${token}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, language: signupLanguage() })
    })
    const data = await res.json()
    if (!res.ok) {
      formError.value = data.error || t('invitation.errors.finalizeFailed')
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

.admin-subtitle-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(99, 102, 241, 0.15);
  color: #4f46e5;
  font-weight: 700;
  font-size: 0.82rem;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  margin-top: 0.5rem;
}

.help-subtext-admin {
  display: block;
  font-size: 0.82rem;
  color: #4f46e5;
  font-weight: 600;
  margin-top: 0.4rem;
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
