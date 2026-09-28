<template>
  <div class="release-panel glass-card">
    <div class="release-header">
      <h3>{{ t('superAdmin.releases.title') }}</h3>
      <span v-if="data.release" class="release-status" :class="data.state">{{ t(`superAdmin.releases.state.${data.state}`) }}</span>
    </div>
    <p class="release-intro">{{ t('superAdmin.releases.intro') }}</p>

    <p v-if="loading" class="release-muted">{{ t('common.loading') }}</p>
    <p v-else-if="!data.release" class="release-muted">{{ t('superAdmin.releases.none') }}</p>

    <template v-else>
      <p class="release-version">
        {{ t('superAdmin.releases.version', { version: data.release.version }) }}
        <span v-if="data.release.date" class="release-muted"> · {{ formatDay(data.release.date) }}</span>
      </p>
      <p v-if="data.state === 'published' && data.publishedAt" class="release-muted">
        {{ t('superAdmin.releases.publishedOn', { date: formatDay(data.publishedAt) }) }}
      </p>

      <div class="release-langs" role="tablist">
        <button
          v-for="lang in LANGS"
          :key="lang"
          type="button"
          role="tab"
          class="release-lang"
          :class="{ active: previewLang === lang }"
          :aria-selected="previewLang === lang"
          @click="previewLang = lang"
        >{{ lang.toUpperCase() }}</button>
      </div>
      <ul class="release-notes">
        <li v-for="(note, i) in (data.release.notes[previewLang] || data.release.notes.fr)" :key="i">{{ note }}</li>
      </ul>

      <p v-if="message" class="release-message" :class="{ error: messageIsError }">{{ message }}</p>

      <div class="release-actions">
        <button v-if="data.state === 'pending'" type="button" class="btn btn-secondary" :disabled="busy" @click="dismiss">
          {{ t('superAdmin.releases.dismiss') }}
        </button>
        <button type="button" class="btn btn-primary" :disabled="busy" @click="publish">
          <Send :size="16" />
          {{ data.state === 'published' ? t('superAdmin.releases.republish') : t('superAdmin.releases.publish') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
// Nouveautés de la dernière version (server/releases/releases.json) : le Super Admin, prévenu par
// push au démarrage du serveur, les relit puis les publie aux utilisateurs ou les écarte.
import { reactive, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Send } from '@lucide/vue'
import { useAuthStore } from '../stores/authStore'
import { useConfirm } from '../composables/useConfirm'
import { formatDate } from '../i18n/format'

const { t } = useI18n()
const authStore = useAuthStore()
const { confirm } = useConfirm()

const LANGS = ['fr', 'en', 'es']
const data = reactive({ release: null, state: 'none', publishedAt: null })
const loading = ref(true)
const busy = ref(false)
const previewLang = ref('fr')
const message = ref('')
const messageIsError = ref(false)

const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` })
const formatDay = (value) => formatDate(new Date(String(value).length === 10 ? `${value}T00:00:00` : value), { day: 'numeric', month: 'long', year: 'numeric' })

const load = async () => {
  loading.value = true
  try {
    const res = await fetch('/api/super-admin/releases', { headers: headers() })
    if (res.ok) Object.assign(data, await res.json())
  } catch { /* panneau vide */ } finally {
    loading.value = false
  }
}
onMounted(load)

const post = async (action) => {
  busy.value = true
  message.value = ''
  try {
    const res = await fetch(`/api/super-admin/releases/${encodeURIComponent(data.release.version)}/${action}`, { method: 'POST', headers: headers() })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || res.statusText)
    return body
  } catch (err) {
    messageIsError.value = true
    message.value = err.message
    return null
  } finally {
    busy.value = false
  }
}

const publish = async () => {
  const ok = await confirm({
    title: t('superAdmin.releases.confirmTitle'),
    message: t('superAdmin.releases.confirmMessage', { version: data.release.version }),
    confirmText: t('superAdmin.releases.publish'),
    type: 'primary'
  })
  if (!ok) return
  const result = await post('publish')
  if (!result) return
  messageIsError.value = false
  message.value = t('superAdmin.releases.published', { push: result.push, email: result.email })
  await load()
}

const dismiss = async () => {
  if (!await post('dismiss')) return
  messageIsError.value = false
  message.value = t('superAdmin.releases.dismissed')
  await load()
}
</script>

<style scoped>
.release-panel {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 760px;
}

.release-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.release-header h3 {
  margin: 0;
}

.release-intro,
.release-muted {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.88rem;
  line-height: 1.5;
}

.release-status {
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: var(--bg-tertiary);
  color: var(--text-muted);
}

.release-status.pending {
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
}

.release-status.published {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.release-version {
  margin: 0.25rem 0 0;
  font-weight: 700;
}

.release-langs {
  display: flex;
  gap: 0.35rem;
}

.release-lang {
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 999px;
  padding: 0.2rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.release-lang.active {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.release-notes {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.release-message {
  margin: 0;
  font-size: 0.88rem;
  color: #059669;
}

.release-message.error {
  color: #dc2626;
}

.release-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.release-actions .btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
</style>
