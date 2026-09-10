<template>
  <transition name="slide-up">
    <div v-if="showPrompt" class="pwa-prompt-container">
      <div class="pwa-prompt-card">
        <!-- Logo miniature FamilyGest -->
        <div class="pwa-logo-badge">
          <img src="/favicon.svg" alt="FamilyGest" class="pwa-badge-icon" />
        </div>

        <div class="pwa-prompt-info">
          <h4 class="pwa-prompt-title">Installer FamilyGest</h4>
          <p class="pwa-prompt-desc">
            Installez l'application sur votre appareil pour un accès rapide en plein écran.
          </p>
        </div>

        <div class="pwa-prompt-actions">
          <!-- Bouton installation Chrome / Android / Edge -->
          <button 
            v-if="deferredPrompt" 
            @click="installPwa" 
            class="pwa-btn pwa-btn-primary"
          >
            <Download :size="16" />
            <span>Installer</span>
          </button>

          <!-- Bouton Guide pour iOS Safari -->
          <button 
            v-else-if="isIos" 
            @click="showIosGuide = !showIosGuide" 
            class="pwa-btn pwa-btn-primary"
          >
            <Share :size="16" />
            <span>{{ showIosGuide ? 'Fermer' : 'Installer' }}</span>
          </button>

          <!-- Bouton fermer / masquer -->
          <button 
            @click="dismissPrompt" 
            class="pwa-btn pwa-btn-close" 
            aria-label="Fermer"
            title="Masquer"
          >
            <X :size="16" />
          </button>
        </div>

        <!-- Guide interactif pour iOS Safari -->
        <div v-if="showIosGuide" class="pwa-ios-instructions">
          <div class="ios-step">
            <span class="step-num">1</span>
            <span class="step-text">Appuyez sur le bouton de partage Safari <Share :size="15" class="inline-icon" /></span>
          </div>
          <div class="ios-step">
            <span class="step-num">2</span>
            <span class="step-text">Sélectionnez <strong>« Sur l'écran d'accueil »</strong> <PlusSquare :size="15" class="inline-icon" /></span>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Download, X, Share, PlusSquare } from '@lucide/vue'

const showPrompt = ref(false)
const deferredPrompt = ref(null)
const isIos = ref(false)
const showIosGuide = ref(false)

const DISMISS_KEY = 'familygest_pwa_dismissed_at'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 jours

const isAlreadyInstalled = () => {
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true
  }
  if (window.navigator.standalone === true) {
    return true
  }
  return false
}

const isRecentlyDismissed = () => {
  const dismissedAt = localStorage.getItem(DISMISS_KEY)
  if (!dismissedAt) return false
  const elapsed = Date.now() - parseInt(dismissedAt, 10)
  return elapsed < DISMISS_DURATION_MS
}

const checkIosSafari = () => {
  const ua = window.navigator.userAgent
  const isIPhoneOrIPad = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome/.test(ua)
  return isIPhoneOrIPad && isSafari
}

const installPwa = async () => {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  if (outcome === 'accepted') {
    showPrompt.value = false
  }
  deferredPrompt.value = null
}

const dismissPrompt = () => {
  showPrompt.value = false
  localStorage.setItem(DISMISS_KEY, Date.now().toString())
}

const handleBeforeInstallPrompt = (e) => {
  e.preventDefault()
  deferredPrompt.value = e
  if (!isAlreadyInstalled() && !isRecentlyDismissed()) {
    showPrompt.value = true
  }
}

const handleAppInstalled = () => {
  showPrompt.value = false
  deferredPrompt.value = null
}

onMounted(() => {
  if (isAlreadyInstalled()) {
    return
  }

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)

  // Détection iOS Safari
  if (checkIosSafari() && !isRecentlyDismissed()) {
    isIos.value = true
    showPrompt.value = true
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('appinstalled', handleAppInstalled)
})
</script>

<style scoped>
.pwa-prompt-container {
  position: fixed;
  bottom: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 2.5rem);
  max-width: 520px;
  z-index: 9999;
  pointer-events: none;
}

.pwa-prompt-card {
  pointer-events: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.85rem;
  padding: 0.9rem 1.15rem;
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(99, 102, 241, 0.15);
}

.pwa-logo-badge {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pwa-badge-icon {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
}

.pwa-prompt-info {
  flex: 1;
  min-width: 180px;
}

.pwa-prompt-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.15rem 0;
}

.pwa-prompt-desc {
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.35;
  margin: 0;
}

.pwa-prompt-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.pwa-btn {
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 600;
  border-radius: var(--radius-md, 10px);
  transition: all var(--transition-fast, 0.2s);
}

.pwa-btn-primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #ffffff;
  padding: 0.55rem 0.95rem;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
}

.pwa-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.45);
}

.pwa-btn-close {
  width: 32px;
  height: 32px;
  background: var(--bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--text-secondary);
  border-radius: var(--radius-full, 9999px);
}

.pwa-btn-close:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.pwa-ios-instructions {
  width: 100%;
  margin-top: 0.4rem;
  padding-top: 0.65rem;
  border-top: 1px dashed var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.ios-step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: var(--accent-primary-light, rgba(99, 102, 241, 0.15));
  color: var(--accent-primary, #6366f1);
  border-radius: 50%;
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
}

.inline-icon {
  display: inline-block;
  vertical-align: middle;
  margin: 0 0.15rem;
  color: var(--accent-primary, #6366f1);
}

/* Animations */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}

@media (max-width: 480px) {
  .pwa-prompt-container {
    bottom: 0.75rem;
    width: calc(100% - 1.25rem);
  }
  .pwa-prompt-card {
    padding: 0.75rem 0.85rem;
    gap: 0.65rem;
  }
  .pwa-logo-badge {
    width: 36px;
    height: 36px;
  }
}
</style>
