<template>
  <div class="landing-settings glass-card">
    <div class="landing-settings-header">
      <h3>{{ t('superAdmin.landing.title') }}</h3>
      <div class="landing-badges">
        <span
          class="landing-views"
          :title="state.lastViewAt ? t('superAdmin.landing.viewsTitle', { last: formatRelative(state.lastViewAt), since: sinceLabel }) : t('superAdmin.landing.viewsTitleNone', { since: sinceLabel })"
        >👁 {{ t('superAdmin.landing.views', { n: state.views || 0 }, state.views || 0) }}</span>
        <span class="landing-status" :class="{ on: state.enabled }">{{ state.enabled ? t('superAdmin.landing.statusOn') : t('superAdmin.landing.statusOff') }}</span>
      </div>
    </div>
    <p class="landing-intro">{{ t('superAdmin.landing.intro') }}</p>

    <template v-if="state.enabled && state.key">
      <label class="form-label">{{ t('superAdmin.landing.link') }}</label>
      <div class="landing-copy-row">
        <input type="text" readonly class="form-input" :value="pageUrl" @click="$event.target.select()" />
        <button type="button" class="btn btn-secondary" @click="copyLink">
          <Copy :size="15" /> {{ copied ? t('superAdmin.landing.copied') : t('superAdmin.landing.copy') }}
        </button>
      </div>
      <div class="landing-link-actions">
        <a :href="`${pageUrl}?apercu=1`" target="_blank" rel="noopener" class="btn btn-secondary">
          <ExternalLink :size="15" /> {{ t('superAdmin.landing.open') }}
        </a>
        <button type="button" class="btn btn-secondary" :disabled="saving" @click="regenerate">
          <RefreshCw :size="15" /> {{ t('superAdmin.landing.regenerate') }}
        </button>
        <button v-if="state.views" type="button" class="btn btn-secondary" :disabled="saving" @click="resetViews">
          <RotateCcw :size="15" /> {{ t('superAdmin.landing.resetViews') }}
        </button>
      </div>
    </template>

    <form class="landing-form" @submit.prevent="save">
      <label class="landing-toggle">
        <input v-model="form.showContact" type="checkbox" />
        <span>{{ t('superAdmin.landing.showContact') }}</span>
      </label>
      <span class="landing-hint">{{ t('superAdmin.landing.showContactHint') }}</span>
      <template v-if="form.showContact">
      <div class="form-group">
        <label class="form-label" for="landing-contact-type">{{ t('superAdmin.landing.contactType') }}</label>
        <select id="landing-contact-type" v-model="form.contactType" class="form-select">
          <option v-for="type in TYPES" :key="type" :value="type">{{ t(`superAdmin.landing.types.${type}`) }}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="landing-contact-value">{{ t('superAdmin.landing.contactValue') }}</label>
        <input id="landing-contact-value" v-model="form.contactValue" type="text" class="form-input" :placeholder="t(`superAdmin.landing.placeholders.${form.contactType}`)" autocomplete="off" />
        <span class="landing-hint">{{ t('superAdmin.landing.contactHint') }}</span>
      </div>
      </template>
      <label class="landing-toggle">
        <input v-model="form.enabled" type="checkbox" />
        <span>{{ t('superAdmin.landing.enable') }}</span>
      </label>
      <p v-if="message" class="landing-message" :class="{ error: messageIsError }">{{ message }}</p>
      <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? t('common.saving') : t('common.save') }}</button>
    </form>
  </div>
</template>

<script setup>
// Page de présentation non référencée (LandingView, /decouvrir/<clé>) : activation, lien secret
// à partager, contact du bouton « Me contacter ». Voir la section « PAGE DE PRÉSENTATION » de
// server/index.js.
import { reactive, ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Copy, ExternalLink, RefreshCw, RotateCcw } from '@lucide/vue'
import { formatDate, formatRelative } from '../i18n/format'
import { useAuthStore } from '../stores/authStore'
import { useConfirm } from '../composables/useConfirm'

const { t } = useI18n()
const authStore = useAuthStore()
const { confirm } = useConfirm()

const TYPES = ['email', 'whatsapp', 'url']
const state = reactive({ enabled: false, key: null, showContact: false, contactType: 'email', contactValue: '', views: 0, lastViewAt: null, viewsSince: null })
const form = reactive({ enabled: false, showContact: false, contactType: 'email', contactValue: '' })
const saving = ref(false)
const message = ref('')
const messageIsError = ref(false)
const copied = ref(false)

const pageUrl = computed(() => (state.key ? `${window.location.origin}/decouvrir/${state.key}` : ''))
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` })

const apply = (data) => {
  Object.assign(state, data)
  form.enabled = Boolean(data.enabled)
  form.showContact = Boolean(data.showContact)
  form.contactType = data.contactType || 'email'
  form.contactValue = data.contactValue || ''
}

const request = async (url, options) => {
  saving.value = true
  message.value = ''
  try {
    const res = await fetch(url, { headers: headers(), ...options })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || res.statusText)
    apply(data)
    return true
  } catch (err) {
    messageIsError.value = true
    message.value = err.message
    return false
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const res = await fetch('/api/super-admin/landing', { headers: headers() })
    if (res.ok) apply(await res.json())
  } catch { /* affiché vide */ }
})

const save = async () => {
  if (await request('/api/super-admin/landing', { method: 'PUT', body: JSON.stringify(form) })) {
    messageIsError.value = false
    message.value = t('superAdmin.landing.saved')
  }
}

const regenerate = async () => {
  const ok = await confirm({
    title: t('superAdmin.landing.regenerate'),
    message: t('superAdmin.landing.regenerateMessage'),
    confirmText: t('superAdmin.landing.regenerate'),
    type: 'danger'
  })
  if (!ok) return
  if (await request('/api/super-admin/landing/regenerate', { method: 'POST' })) {
    messageIsError.value = false
    message.value = t('superAdmin.landing.regenerated')
  }
}

const sinceLabel = computed(() => (state.viewsSince ? formatDate(state.viewsSince, { day: 'numeric', month: 'long', year: 'numeric' }) : '–'))

const resetViews = async () => {
  const ok = await confirm({
    title: t('superAdmin.landing.resetViews'),
    message: t('superAdmin.landing.resetViewsMessage'),
    confirmText: t('superAdmin.landing.resetViews'),
    type: 'warning'
  })
  if (!ok) return
  await request('/api/super-admin/landing/reset-views', { method: 'POST' })
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(pageUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { /* sélection manuelle possible */ }
}
</script>

<style scoped>
.landing-settings {
  padding: 1.5rem;
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.landing-settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.landing-settings-header h3 {
  margin: 0;
}

.landing-badges {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.landing-views {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.12);
  color: var(--accent-primary);
  cursor: help;
  white-space: nowrap;
}

.landing-status {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: var(--bg-tertiary);
  color: var(--text-muted);
}

.landing-status.on {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.landing-intro,
.landing-hint {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.5;
}

.landing-hint {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.landing-copy-row {
  display: flex;
  gap: 0.5rem;
}

.landing-copy-row input {
  flex: 1;
  min-width: 0;
  font-family: monospace;
  font-size: 0.8rem;
}

.landing-copy-row .btn,
.landing-link-actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  text-decoration: none;
}

.landing-link-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.landing-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-width: 560px;
}

.landing-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.landing-message {
  margin: 0;
  font-size: 0.85rem;
  color: #059669;
}

.landing-message.error {
  color: #dc2626;
}

.landing-form .btn {
  align-self: flex-start;
}
</style>
