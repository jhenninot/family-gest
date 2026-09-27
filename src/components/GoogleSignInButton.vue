<template>
  <div v-if="enabled" class="google-signin">
    <div v-if="separator" class="google-separator"><span>{{ t('login.google.or') }}</span></div>
    <a :href="href" class="google-btn">
      <!-- Logo « G » de Google (couleurs officielles) -->
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      <span>{{ label || t('login.google.continue') }}</span>
    </a>
  </div>
</template>

<script setup>
// Bouton « Continuer avec Google » : affiché seulement si le Super Admin a configuré la
// connexion avec Google (voir server/auth/google.js). Navigation complète vers le serveur, qui
// redirige vers la page de Google.
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { currentLocale } from '../i18n'
import { isGoogleAuthEnabled } from '../utils/googleAuthStatus'

const props = defineProps({
  invite: { type: String, default: '' },
  label: { type: String, default: '' },
  separator: { type: Boolean, default: true }
})

const { t } = useI18n()

const enabled = ref(false)
onMounted(async () => { enabled.value = await isGoogleAuthEnabled() })

const href = computed(() => {
  const params = new URLSearchParams({ lang: currentLocale.value })
  if (props.invite) params.set('invite', props.invite)
  return `/api/auth/google/start?${params}`
})
</script>

<style scoped>
.google-signin {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin-top: 1rem;
}

.google-separator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.google-separator::before,
.google-separator::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-color);
}

.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.7rem 1rem;
  border: 1px solid #dadce0;
  border-radius: var(--radius-md, 10px);
  background: #fff;
  color: #3c4043;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}

.google-btn:hover {
  background: #f8f9fa;
  box-shadow: 0 1px 3px rgba(60, 64, 67, 0.2);
}
</style>
