<template>
  <div class="login-page">
    <div class="glass-card login-card">
      <div class="login-header">
        <div class="logo-badge">
          <Sparkles :size="28" />
        </div>
        <h1 class="login-title">FamilyGest</h1>
        <p class="login-subtitle">Activation de votre compte familial</p>
      </div>

      <!-- Loading verification state -->
      <div v-if="verifying" class="state-container">
        <Loader2 :size="32" class="spin text-primary" />
        <p class="state-text">Vérification de votre lien d'invitation...</p>
      </div>

      <!-- Error / Expired token state -->
      <div v-else-if="tokenError" class="state-container">
        <div class="error-badge-icon">
          <AlertCircle :size="32" />
        </div>
        <h2 class="error-title">Lien invalide ou expiré</h2>
        <p class="error-description">
          {{ tokenError }}
        </p>
        <div class="tip-box">
          <Clock :size="16" />
          <span>Pour des raisons de sécurité, les liens d'invitation ont une durée de validité de 2 heures.</span>
        </div>
        <router-link to="/login" class="btn btn-secondary btn-block margin-top-md">
          Retour à la page de connexion
        </router-link>
      </div>

      <!-- Success state -->
      <div v-else-if="success" class="state-container">
        <div class="success-badge-icon">
          <CheckCircle2 :size="36" />
        </div>
        <h2 class="success-title">Bienvenue {{ memberUser?.firstName }} !</h2>
        <p class="success-description">
          Votre mot de passe a été enregistré avec succès. Vous êtes maintenant connecté(e).
        </p>
        <p class="state-sub">Redirection vers votre tableau de bord...</p>
      </div>

      <!-- Password form state -->
      <div v-else>
        <div class="welcome-user-box">
          <span class="user-avatar-badge">{{ memberUser?.avatar || '👤' }}</span>
          <div class="user-details-col">
            <span class="user-greeting">Bienvenue, <strong>{{ memberUser?.firstName }} {{ memberUser?.lastName }}</strong></span>
            <span class="user-email-sub">{{ memberUser?.email }}</span>
          </div>
        </div>

        <p class="form-instructions">
          Veuillez choisir votre mot de passe personnel pour finaliser l'activation de votre compte :
        </p>

        <!-- Form error alert -->
        <div v-if="formError" class="error-alert">
          <AlertCircle :size="18" />
          <span>{{ formError }}</span>
        </div>

        <form @submit.prevent="handleSetPassword" class="login-form">
          <div class="form-group">
            <label class="form-label">Nouveau mot de passe</label>
            <div class="input-with-icon">
              <Lock :size="18" class="input-icon" />
              <input 
                :type="showPassword ? 'text' : 'password'" 
                v-model="password" 
                required 
                placeholder="10 car. min, Maj, min, chiffre, spécial" 
                class="form-input" 
                autocomplete="new-password"
                minlength="10"
              />
              <button 
                type="button" 
                @click="showPassword = !showPassword" 
                class="btn-toggle-eye"
                tabindex="-1"
              >
                <EyeOff v-if="showPassword" :size="18" />
                <Eye v-else :size="18" />
              </button>
            </div>
            <PasswordStrengthIndicator :password="password" />
          </div>

          <div class="form-group">
            <label class="form-label">Confirmer le mot de passe</label>
            <div class="input-with-icon">
              <Lock :size="18" class="input-icon" />
              <input 
                :type="showConfirmPassword ? 'text' : 'password'" 
                v-model="confirmPassword" 
                required 
                placeholder="Retapez le même mot de passe" 
                class="form-input" 
                autocomplete="new-password"
                minlength="10"
              />
              <button 
                type="button" 
                @click="showConfirmPassword = !showConfirmPassword" 
                class="btn-toggle-eye"
                tabindex="-1"
              >
                <EyeOff v-if="showConfirmPassword" :size="18" />
                <Eye v-else :size="18" />
              </button>
            </div>
          </div>

          <!-- Options de notifications (Web Push et Email) -->
          <div class="notifications-consent-group">
            <!-- Notifications Web Push -->
            <label class="notif-checkbox-card" :class="{ 'is-checked': enableNotifications }">
              <input 
                type="checkbox" 
                v-model="enableNotifications" 
                class="notif-native-checkbox"
              />
              <div class="notif-checkbox-custom">
                <Check v-if="enableNotifications" :size="14" />
              </div>
              <div class="notif-text-col">
                <span class="notif-label-title">
                  <Bell :size="15" class="notif-bell-icon" />
                  Notifications Web (PWA)
                </span>
                <span class="notif-label-desc">
                  Alertes directes sur cet appareil (absences, invités, agenda)
                </span>
              </div>
            </label>

            <!-- Notifications par Email -->
            <label class="notif-checkbox-card" :class="{ 'is-checked': enableEmailNotifications }">
              <input 
                type="checkbox" 
                v-model="enableEmailNotifications" 
                class="notif-native-checkbox"
              />
              <div class="notif-checkbox-custom">
                <Check v-if="enableEmailNotifications" :size="14" />
              </div>
              <div class="notif-text-col">
                <span class="notif-label-title">
                  <Mail :size="15" class="notif-mail-icon" />
                  Notifications par Email
                </span>
                <span class="notif-label-desc">
                  Recevoir un récapitulatif par email pour chaque nouveauté
                </span>
              </div>
            </label>
          </div>

          <button type="submit" class="btn btn-primary btn-block" :disabled="submitting">
            <span v-if="!submitting">Enregistrer et accéder à FamilyGest</span>
            <span v-else>Enregistrement en cours...</span>
          </button>
        </form>
      </div>

      <div class="login-footer">
        <span>Portail sécurisé FamilyGest &bull; Espace Familial</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { 
  Sparkles, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  Eye, 
  EyeOff,
  Bell,
  Check,
  Mail
} from '@lucide/vue'
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator.vue'
import { isPasswordValid, getPasswordErrorMessage } from '../utils/passwordValidator'
import { subscribeUserToPush } from '../utils/pushNotifications'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()

const token = ref('')
const verifying = ref(true)
const tokenError = ref('')
const memberUser = ref(null)
const enableNotifications = ref(true)
const enableEmailNotifications = ref(true)

const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const submitting = ref(false)
const formError = ref('')
const success = ref(false)

onMounted(async () => {
  // Déconnexion de toute session active pour éviter de contourner la définition du mot de passe
  if (authStore.isAuthenticated) {
    authStore.logout()
  }

  token.value = route.query.token || ''

  if (!token.value) {
    verifying.value = false
    tokenError.value = 'Aucun jeton de sécurité n\'a été fourni dans le lien. Veuillez utiliser le lien reçu par email.'
    return
  }

  try {
    const res = await fetch(`/api/auth/verify-token?token=${encodeURIComponent(token.value)}`)
    const data = await res.json()

    if (res.ok && data.valid) {
      memberUser.value = data.user
    } else {
      tokenError.value = data.error || 'Ce lien d\'invitation est invalide ou a expiré (durée de validité : 2 heures).'
    }
  } catch (err) {
    tokenError.value = 'Impossible de joindre le serveur pour vérifier votre lien.'
  } finally {
    verifying.value = false
  }
})

const handleSetPassword = async () => {
  formError.value = ''

  if (!isPasswordValid(password.value)) {
    formError.value = getPasswordErrorMessage(password.value)
    return
  }

  if (password.value !== confirmPassword.value) {
    formError.value = 'Les deux mots de passe ne correspondent pas.'
    return
  }

  submitting.value = true

  try {
    const res = await fetch('/api/auth/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token.value,
        password: password.value,
        pushNotificationsEnabled: enableNotifications.value,
        emailNotificationsEnabled: enableEmailNotifications.value
      })
    })

    const data = await res.json()

    if (!res.ok) {
      formError.value = data.error || 'Erreur lors de la définition du mot de passe.'
      return
    }

    // Connecter directement l'utilisateur
    authStore.setAuth(data.user, data.token)
    await familyStore.fetchAllData()

    // Si l'utilisateur a autorisé les notifications, enregistrer la souscription push
    if (enableNotifications.value) {
      subscribeUserToPush(data.token).catch(err => {
        console.warn('[WebPush] Demande push différée ou non accordée:', err)
      })
    }

    success.value = true

    // Redirection automatique vers le tableau de bord
    setTimeout(() => {
      router.push('/')
    }, 1800)
  } catch (err) {
    formError.value = 'Erreur de connexion au serveur.'
  } finally {
    submitting.value = false
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
  background: radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.12) 0%, transparent 40%),
              radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.12) 0%, transparent 40%),
              var(--bg-primary);
}

.login-card {
  width: 100%;
  max-width: 440px;
  padding: 2.5rem 2rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
  animation: fadeIn 0.4s ease-out;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-badge {
  width: 56px;
  height: 56px;
  margin: 0 auto 1rem;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
}

.login-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 0.25rem;
  color: var(--text-primary);
}

.login-subtitle {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.5rem 0.5rem;
}

.state-text {
  margin-top: 1rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.state-sub {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.text-primary {
  color: var(--accent-primary);
}

.error-badge-icon {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-full);
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.error-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.error-description {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 1rem;
}

.tip-box {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: #b45309;
  font-size: 0.825rem;
  line-height: 1.4;
  text-align: left;
}

[data-theme="dark"] .tip-box {
  color: #fbbf24;
}

.success-badge-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-full);
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.success-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.success-description {
  font-size: 0.925rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.welcome-user-box {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  margin-bottom: 1.25rem;
}

.user-avatar-badge {
  font-size: 1.75rem;
  line-height: 1;
}

.user-details-col {
  display: flex;
  flex-direction: column;
}

.user-greeting {
  font-size: 0.95rem;
  color: var(--text-primary);
}

.user-email-sub {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.form-instructions {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 1.25rem;
}

.error-alert {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #dc2626;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 1.25rem;
}

[data-theme="dark"] .error-alert {
  color: #f87171;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 0.85rem;
  color: var(--text-muted);
  pointer-events: none;
}

.btn-toggle-eye {
  position: absolute;
  right: 0.85rem;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.btn-toggle-eye:hover {
  color: var(--text-primary);
}

.form-input {
  width: 100%;
  padding: 0.75rem 2.75rem 0.75rem 2.6rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: all var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  background: var(--bg-secondary);
}

.btn-block {
  width: 100%;
  padding: 0.85rem;
  font-size: 0.95rem;
  font-weight: 700;
  margin-top: 0.5rem;
}

.margin-top-md {
  margin-top: 1rem;
}

/* Styles pour la case à cocher des notifications */
.notifications-consent-group {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin: 1.15rem 0 0.85rem 0;
}

.notif-checkbox-card {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.75rem 0.95rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  user-select: none;
}

.notif-checkbox-card:hover {
  background: var(--bg-card-hover, var(--bg-secondary));
  border-color: rgba(99, 102, 241, 0.4);
}

.notif-checkbox-card.is-checked {
  border-color: var(--accent-primary);
  background: rgba(99, 102, 241, 0.08);
}

.notif-native-checkbox {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.notif-checkbox-custom {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1.5px solid var(--border-color);
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
  margin-top: 0.1rem;
  transition: all var(--transition-fast);
}

.notif-checkbox-card.is-checked .notif-checkbox-custom {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);
}

.notif-text-col {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.notif-label-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--text-primary);
}

.notif-bell-icon {
  color: var(--accent-primary);
}

.notif-mail-icon {
  color: #8b5cf6;
}

.notif-label-desc {
  font-size: 0.76rem;
  color: var(--text-secondary);
  line-height: 1.35;
}

.login-footer {
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border-color);
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-muted);
}
</style>
