import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import './utils/theme.js'
import App from './App.vue'
import { registerSW } from 'virtual:pwa-register'
import { i18n, setLocale, detectLocale } from './i18n'
import './i18n/apiLanguage.js'
import { useAuthStore } from './stores/authStore'

// Enregistrement et vérification active des mises à jour PWA
registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // Vérification périodique des mises à jour toutes les 60 secondes
      setInterval(() => {
        registration.update()
      }, 60 * 1000)

      // Vérification immédiate quand l'utilisateur rouvre l'application mobile (changement de visibilité)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update()
        }
      })
    }
  }
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

// Langue : celle du compte connecté, sinon celle de l'appareil. Suit les changements de compte.
const authStore = useAuthStore()
watch(() => authStore.user?.language, (language) => { setLocale(language || detectLocale()) })

setLocale(authStore.user?.language || detectLocale()).finally(() => app.mount('#app'))
