import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import './utils/theme.js'
import App from './App.vue'
import { registerSW } from 'virtual:pwa-register'

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

app.mount('#app')
