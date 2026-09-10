<template>
  <transition name="prompt-fade">
    <div v-if="showPrompt" class="device-push-backdrop">
      <div class="device-push-modal">
        <!-- Bouton fermer rapide (équivaut à 'Pas pour le moment') -->
        <button 
          @click="handleRemindLater" 
          class="push-close-btn" 
          aria-label="Fermer"
          title="Fermer pour l'instant"
        >
          <X :size="16" />
        </button>

        <!-- En-tête avec badge icône -->
        <div class="push-modal-header">
          <div class="push-icon-badge">
            <Bell :size="22" class="badge-bell" />
          </div>
          <div class="push-header-text">
            <h3 class="push-modal-title">Notifications sur cet appareil</h3>
            <p class="push-modal-desc">
              Souhaitez-vous recevoir des alertes instantanées (nouvelle tâche, absence, invité aux repas, agenda) sur ce navigateur ?
            </p>
          </div>
        </div>

        <!-- Message d'erreur éventuel -->
        <div v-if="errorMessage" class="push-error-banner">
          {{ errorMessage }}
        </div>

        <!-- 3 Choix clairs pour l'utilisateur -->
        <div class="push-modal-actions">
          <!-- Option 1 : Accepter sur cet appareil -->
          <button 
            @click="handleAccept" 
            class="push-action-btn btn-accept" 
            :disabled="loading"
          >
            <BellRing v-if="!loading" :size="18" />
            <span v-if="!loading">Recevoir les notifications sur cet appareil</span>
            <span v-else>Activation en cours...</span>
          </button>

          <!-- Option 2 : Ne pas les recevoir pour le moment -->
          <button 
            @click="handleRemindLater" 
            class="push-action-btn btn-later" 
            :disabled="loading"
          >
            <Clock :size="16" />
            <span>Ne pas les recevoir pour le moment</span>
          </button>

          <!-- Option 3 : Ne jamais recevoir sur cet appareil -->
          <button 
            @click="handleNever" 
            class="push-action-btn btn-never" 
            :disabled="loading"
          >
            <BellOff :size="15" />
            <span>Ne jamais recevoir les notifications sur cet appareil</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { Bell, BellRing, BellOff, Clock, X } from '@lucide/vue'
import { 
  shouldPromptDeviceForPush, 
  subscribeUserToPush, 
  setDevicePushPref 
} from '../utils/pushNotifications'

const route = useRoute()
const authStore = useAuthStore()

const showPrompt = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const checkPromptEligibility = async () => {
  // Uniquement si l'utilisateur est authentifié et pas sur une page de login / mot de passe
  if (!authStore.isAuthenticated) {
    showPrompt.value = false
    return
  }

  const isAuthPage = route.name === 'login' || route.name === 'set-password' || route.path === '/login' || route.path === '/set-password'
  if (isAuthPage) {
    showPrompt.value = false
    return
  }

  const eligible = await shouldPromptDeviceForPush()
  showPrompt.value = eligible
}

// 1. Choix : Recevoir les notifications sur cet appareil
const handleAccept = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const res = await subscribeUserToPush()
    loading.value = false

    if (res.success) {
      showPrompt.value = false
    } else {
      if (res.reason === 'denied') {
        errorMessage.value = 'Les notifications ont été bloquées dans votre navigateur. Vous pouvez les autoriser dans les paramètres du site.'
        setTimeout(() => {
          showPrompt.value = false
        }, 3500)
      } else if (res.reason === 'unsupported') {
        errorMessage.value = 'Ce navigateur ne prend pas en charge les notifications Push.'
        setTimeout(() => {
          showPrompt.value = false
        }, 2500)
      } else {
        errorMessage.value = res.error || 'Impossible d\'activer les notifications sur cet appareil.'
      }
    }
  } catch (err) {
    loading.value = false
    errorMessage.value = 'Une erreur est survenue lors de l\'activation.'
  }
}

// 2. Choix : Ne pas les recevoir pour le moment (report 7 jours)
const handleRemindLater = () => {
  setDevicePushPref('remind_later')
  showPrompt.value = false
}

// 3. Choix : Ne jamais recevoir sur cet appareil
const handleNever = () => {
  setDevicePushPref('never')
  showPrompt.value = false
}

onMounted(() => {
  // Petit délai après le chargement pour une apparition fluide
  setTimeout(() => {
    checkPromptEligibility()
  }, 1200)
})

// Réévaluation si l'état de connexion change
watch(
  () => authStore.isAuthenticated,
  (isAuth) => {
    if (isAuth) {
      setTimeout(() => {
        checkPromptEligibility()
      }, 800)
    } else {
      showPrompt.value = false
    }
  }
)

// Réévaluation lors des changements de route (ex: après login)
watch(
  () => route.path,
  () => {
    if (authStore.isAuthenticated) {
      checkPromptEligibility()
    }
  }
)
</script>

<style scoped>
.device-push-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9995;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1.5rem;
  pointer-events: none;
}

@media (min-width: 640px) {
  .device-push-backdrop {
    align-items: center;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    pointer-events: auto;
  }
}

.device-push-modal {
  pointer-events: auto;
  position: relative;
  width: 100%;
  max-width: 480px;
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg, 16px);
  padding: 1.5rem;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(99, 102, 241, 0.2);
  animation: modal-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.push-close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full, 9999px);
  border: none;
  background: var(--bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s);
}

.push-close-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.push-modal-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
  padding-right: 1.5rem;
}

.push-icon-badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
  border: 1px solid rgba(99, 102, 241, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--accent-primary, #6366f1);
}

.badge-bell {
  animation: bell-ring 2.5s ease infinite;
}

@keyframes bell-ring {
  0%, 100% { transform: rotate(0); }
  5% { transform: rotate(14deg); }
  10% { transform: rotate(-14deg); }
  15% { transform: rotate(10deg); }
  20% { transform: rotate(-10deg); }
  25% { transform: rotate(0); }
}

.push-header-text {
  flex: 1;
}

.push-modal-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.35rem 0;
  line-height: 1.3;
}

.push-modal-desc {
  font-size: 0.84rem;
  color: var(--text-secondary);
  line-height: 1.45;
  margin: 0;
}

.push-error-banner {
  margin-bottom: 1rem;
  padding: 0.65rem 0.85rem;
  background: var(--accent-rose-light, rgba(244, 63, 94, 0.12));
  border: 1px solid var(--accent-rose, #f43f5e);
  color: var(--accent-rose, #f43f5e);
  border-radius: var(--radius-md, 8px);
  font-size: 0.82rem;
  line-height: 1.4;
}

.push-modal-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.push-action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md, 10px);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast, 0.2s);
}

.push-action-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* 1. Bouton Accepter */
.btn-accept {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
}

.btn-accept:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.45);
}

/* 2. Bouton Reporter */
.btn-later {
  background: var(--bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-later:hover:not(:disabled) {
  background: var(--bg-card-hover);
  border-color: var(--text-secondary);
}

/* 3. Bouton Ne Jamais Recevoir */
.btn-never {
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.5rem;
}

.btn-never:hover:not(:disabled) {
  color: var(--accent-rose, #f43f5e);
  text-decoration: underline;
}

/* Animations */
.prompt-fade-enter-active,
.prompt-fade-leave-active {
  transition: opacity 0.25s ease;
}

.prompt-fade-enter-from,
.prompt-fade-leave-to {
  opacity: 0;
}

@keyframes modal-enter {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 639px) {
  .device-push-backdrop {
    padding: 0.75rem;
  }
  .device-push-modal {
    padding: 1.25rem 1rem;
    border-radius: var(--radius-lg, 16px);
  }
  .push-action-btn {
    padding: 0.7rem 0.85rem;
    font-size: 0.84rem;
  }
}
</style>
