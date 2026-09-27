<template>
  <div class="google-callback">
    <div class="spinner"></div>
    <p>{{ t('login.google.signingIn') }}</p>
  </div>
</template>

<script setup>
// Retour de la connexion avec Google : le serveur (server/auth/google.js) renvoie ici le jeton de
// session, ou un code d'erreur, dans le fragment de l'adresse (#token=… / #error=…).
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()

onMounted(async () => {
  const params = new URLSearchParams(window.location.hash.slice(1))
  // Le jeton ne doit pas rester dans l'historique du navigateur
  window.history.replaceState(null, '', window.location.pathname)

  const token = params.get('token')
  if (!token) {
    return router.replace({ name: 'login', query: { googleError: params.get('error') || 'failed', ...(params.get('email') ? { email: params.get('email') } : {}) } })
  }
  if (!await authStore.loginWithToken(token)) {
    return router.replace({ name: 'login', query: { googleError: 'failed' } })
  }
  const fams = authStore.families || []
  const target = params.get('family') || (fams.length === 1 ? fams[0].slug : null)
  if (target) {
    await familyStore.switchFamily(target)
    return router.replace(`/${target}`)
  }
  router.replace('/select-family')
})
</script>

<style scoped>
.google-callback {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--text-secondary);
}
</style>
