<template>
  <div class="google-settings glass-card">
    <div class="google-settings-header">
      <h3>{{ t('superAdmin.google.title') }}</h3>
      <span class="google-status" :class="{ on: state.ready }">{{ state.ready ? t('superAdmin.google.statusOn') : t('superAdmin.google.statusOff') }}</span>
    </div>
    <p class="google-intro">{{ t('superAdmin.google.intro') }}</p>

    <details class="google-guide">
      <summary>{{ t('superAdmin.google.guideTitle') }}</summary>
      <ol>
        <li>
          {{ t('superAdmin.google.steps.project') }}
          <a href="https://console.cloud.google.com/" target="_blank" rel="noopener">console.cloud.google.com</a>
        </li>
        <li>{{ t('superAdmin.google.steps.consent') }}</li>
        <li>{{ t('superAdmin.google.steps.publish') }}</li>
        <li>{{ t('superAdmin.google.steps.client') }}</li>
        <li>{{ t('superAdmin.google.steps.redirect') }}</li>
        <li>{{ t('superAdmin.google.steps.copy') }}</li>
      </ol>
    </details>

    <label class="form-label">{{ t('superAdmin.google.redirectUri') }}</label>
    <div class="google-copy-row">
      <input type="text" readonly :value="state.redirectUri" class="form-input" @click="$event.target.select()" />
      <button type="button" class="btn btn-secondary" @click="copyRedirect">
        <Copy :size="15" /> {{ copied ? t('superAdmin.google.copied') : t('superAdmin.google.copy') }}
      </button>
    </div>

    <form class="google-form" @submit.prevent="save">
      <div class="form-group">
        <label class="form-label" for="google-client-id">{{ t('superAdmin.google.clientId') }}</label>
        <input id="google-client-id" v-model="form.clientId" type="text" class="form-input" placeholder="123456789-abc.apps.googleusercontent.com" autocomplete="off" />
      </div>
      <div class="form-group">
        <label class="form-label" for="google-client-secret">{{ t('superAdmin.google.clientSecret') }}</label>
        <input
          id="google-client-secret"
          v-model="form.clientSecret"
          type="password"
          class="form-input"
          :placeholder="state.hasSecret ? t('superAdmin.google.secretKept') : 'GOCSPX-…'"
          autocomplete="new-password"
        />
      </div>
      <label class="google-toggle">
        <input v-model="form.enabled" type="checkbox" />
        <span>{{ t('superAdmin.google.enable') }}</span>
      </label>
      <p v-if="message" class="google-message" :class="{ error: messageIsError }">{{ message }}</p>
      <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? t('common.saving') : t('common.save') }}</button>
    </form>
  </div>
</template>

<script setup>
// Réglages de la connexion avec Google (console Super Admin) : voir server/auth/google.js
import { reactive, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Copy } from '@lucide/vue'
import { useAuthStore } from '../stores/authStore'

const { t } = useI18n()
const authStore = useAuthStore()

const state = reactive({ clientId: '', hasSecret: false, enabled: false, ready: false, redirectUri: '' })
const form = reactive({ clientId: '', clientSecret: '', enabled: false })
const saving = ref(false)
const message = ref('')
const messageIsError = ref(false)
const copied = ref(false)

const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` })

const apply = (data) => {
  Object.assign(state, data)
  form.clientId = data.clientId || ''
  form.clientSecret = ''
  form.enabled = Boolean(data.enabled)
}

onMounted(async () => {
  try {
    const res = await fetch('/api/super-admin/google-auth', { headers: headers() })
    if (res.ok) apply(await res.json())
  } catch { /* affiché vide */ }
})

const save = async () => {
  saving.value = true
  message.value = ''
  try {
    const res = await fetch('/api/super-admin/google-auth', { method: 'PUT', headers: headers(), body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || res.statusText)
    apply(data)
    messageIsError.value = false
    message.value = t('superAdmin.google.saved')
  } catch (err) {
    messageIsError.value = true
    message.value = err.message
  } finally {
    saving.value = false
  }
}

const copyRedirect = async () => {
  try {
    await navigator.clipboard.writeText(state.redirectUri)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { /* sélection manuelle possible */ }
}
</script>

<style scoped>
.google-settings {
  padding: 1.5rem;
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.google-settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.google-settings-header h3 {
  margin: 0;
}

.google-status {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: var(--bg-tertiary);
  color: var(--text-muted);
}

.google-status.on {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.google-intro {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}

.google-guide summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--accent-primary);
}

.google-guide ol {
  margin: 0.6rem 0 0;
  padding-left: 1.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.88rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.google-copy-row {
  display: flex;
  gap: 0.5rem;
}

.google-copy-row input {
  flex: 1;
  min-width: 0;
  font-family: monospace;
  font-size: 0.8rem;
}

.google-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-width: 560px;
}

.google-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.google-message {
  margin: 0;
  font-size: 0.85rem;
  color: #059669;
}

.google-message.error {
  color: #dc2626;
}

.google-form .btn {
  align-self: flex-start;
}
</style>
