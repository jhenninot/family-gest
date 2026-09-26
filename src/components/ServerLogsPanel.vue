<template>
  <div class="server-logs">
    <!-- Niveau enregistré, choisi par le Super Admin -->
    <div class="logs-settings glass-card">
      <div class="logs-settings-main">
        <label class="form-label" for="log-level">{{ t('superAdmin.logs.levelLabel') }}</label>
        <select id="log-level" v-model="settings.level" class="form-input" :disabled="savingLevel" @change="saveLevel">
          <option v-for="level in LEVELS" :key="level" :value="level">
            {{ t(`superAdmin.logs.levels.${level}`) }} — {{ t(`superAdmin.logs.levelHints.${level}`) }}
          </option>
        </select>
      </div>
      <p v-if="settings.level === 'debug' && settings.debugUntil" class="logs-note logs-note-debug">
        <Bug :size="14" /> {{ t('superAdmin.logs.debugUntil', { time: formatDateTime(settings.debugUntil) }) }}
      </p>
      <p class="logs-note">{{ t('superAdmin.logs.retention') }}</p>
    </div>

    <!-- Filtres -->
    <div class="logs-filters glass-card">
      <div class="logs-filters-grid">
        <div class="form-group">
          <label class="form-label">{{ t('superAdmin.logs.minLevel') }}</label>
          <select v-model="filters.level" class="form-input" @change="reload">
            <option v-for="level in LEVELS" :key="level" :value="level">{{ t(`superAdmin.logs.levels.${level}`) }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('superAdmin.logs.source') }}</label>
          <select v-model="filters.source" class="form-input" @change="reload">
            <option value="">{{ t('superAdmin.logs.allSources') }}</option>
            <option v-for="source in sources" :key="source" :value="source">{{ sourceLabel(source) }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('superAdmin.logs.family') }}</label>
          <select v-model="filters.family" class="form-input" @change="reload">
            <option value="">{{ t('superAdmin.logs.allFamilies') }}</option>
            <option v-for="family in families" :key="family" :value="family">{{ family }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('superAdmin.logs.search') }}</label>
          <input v-model="filters.q" type="search" class="form-input" :placeholder="t('superAdmin.logs.searchPlaceholder')" @input="reloadSoon" />
        </div>
      </div>
      <div class="logs-actions">
        <label class="logs-auto">
          <input v-model="autoRefresh" type="checkbox" />
          <span>{{ t('superAdmin.logs.autoRefresh') }}</span>
        </label>
        <button type="button" class="btn btn-secondary" :disabled="loading" @click="reload">
          <RefreshCw :size="16" :class="{ spin: loading }" />
          <span>{{ t('superAdmin.logs.refresh') }}</span>
        </button>
        <button type="button" class="btn btn-secondary" :disabled="downloading" @click="download">
          <Download :size="16" />
          <span>{{ t('superAdmin.logs.download') }}</span>
        </button>
      </div>
    </div>

    <p v-if="fromMemory" class="logs-warning glass-card">
      <AlertTriangle :size="16" /> {{ t('superAdmin.logs.fromMemory') }}
    </p>
    <p v-if="error" class="logs-warning glass-card">{{ error }}</p>

    <div v-if="loading && entries.length === 0" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="entries.length === 0" class="empty-state glass-card">
      <ScrollText :size="32" />
      <p>{{ t('superAdmin.logs.empty') }}</p>
    </div>

    <div v-else class="logs-list glass-card">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="log-row"
        :class="`log-${entry.level}`"
        @click="toggle(entry.id)"
      >
        <span class="log-time">{{ formatDateTime(entry.at) }}</span>
        <span class="log-level">{{ t(`superAdmin.logs.levels.${entry.level}`) }}</span>
        <span class="log-source">{{ sourceLabel(entry.source) }}<template v-if="entry.family"> · {{ entry.family }}</template></span>
        <span class="log-message" :class="{ expanded: expanded.has(entry.id) }">{{ displayMessage(entry) }}</span>
      </div>
      <div class="logs-more">
        <button v-if="hasMore" type="button" class="btn btn-secondary btn-sm" :disabled="loading" @click="loadMore">
          {{ t('superAdmin.logs.more') }}
        </button>
        <span class="text-muted">{{ t('superAdmin.logs.count', { n: entries.length }, entries.length) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
// Journal technique du serveur (console Super Admin) : voir server/logging/logger.js
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RefreshCw, Download, AlertTriangle, ScrollText, Bug } from '@lucide/vue'
import { useAuthStore } from '../stores/authStore'
import { intlLocale } from '../i18n/format'

const LEVELS = ['debug', 'info', 'warn', 'error', 'critical']
const PAGE_SIZE = 200
const KNOWN_SOURCES = ['system', 'database', 'http']

const { t } = useI18n()
const authStore = useAuthStore()

const settings = reactive({ level: 'info', debugUntil: null })
const filters = reactive({ level: 'debug', source: '', family: '', q: '' })
const entries = ref([])
const sources = ref([])
const families = ref([])
const fromMemory = ref(false)
const hasMore = ref(false)
const loading = ref(false)
const downloading = ref(false)
const savingLevel = ref(false)
const error = ref('')
const autoRefresh = ref(false)
const expanded = ref(new Set())
let refreshTimer = null
let searchTimer = null

const authHeaders = () => ({ Authorization: `Bearer ${authStore.token}` })

const queryParams = (extra = {}) => {
  const params = new URLSearchParams({ level: filters.level, ...extra })
  if (filters.source) params.set('source', filters.source)
  if (filters.family) params.set('family', filters.family)
  if (filters.q.trim()) params.set('q', filters.q.trim())
  return params
}

const fetchEntries = async ({ before = null } = {}) => {
  loading.value = true
  error.value = ''
  try {
    const params = queryParams({ limit: String(PAGE_SIZE) })
    if (before) params.set('before', before)
    const res = await fetch(`/api/super-admin/server-logs?${params}`, { headers: authHeaders() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || res.statusText)
    entries.value = before ? [...entries.value, ...data.entries] : data.entries
    hasMore.value = data.entries.length === PAGE_SIZE
    sources.value = [...data.sources].sort()
    families.value = [...data.families].sort()
    fromMemory.value = data.fromMemory
    Object.assign(settings, data.settings)
  } catch (err) {
    error.value = t('superAdmin.logs.loadError', { message: err.message })
  } finally {
    loading.value = false
  }
}

const reload = () => fetchEntries()
const loadMore = () => fetchEntries({ before: entries.value[entries.value.length - 1]?.at })
const reloadSoon = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(reload, 400)
}

const saveLevel = async () => {
  savingLevel.value = true
  try {
    const res = await fetch('/api/super-admin/server-logs/settings', {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: settings.level })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || res.statusText)
    Object.assign(settings, data.settings)
    await reload()
  } catch (err) {
    error.value = t('superAdmin.logs.loadError', { message: err.message })
  } finally {
    savingLevel.value = false
  }
}

const download = async () => {
  downloading.value = true
  try {
    const res = await fetch(`/api/super-admin/server-logs/download?${queryParams()}`, { headers: authHeaders() })
    if (!res.ok) throw new Error(res.statusText)
    const url = URL.createObjectURL(await res.blob())
    const link = document.createElement('a')
    link.href = url
    link.download = `familygest-journal-${new Date().toISOString().slice(0, 10)}.txt`
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    error.value = t('superAdmin.logs.loadError', { message: err.message })
  } finally {
    downloading.value = false
  }
}

const toggle = (id) => {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

const sourceLabel = (source) => KNOWN_SOURCES.includes(source) ? t(`superAdmin.logs.sources.${source}`) : source

// Le préfixe « [Alexa] » répète la source affichée à côté
const displayMessage = (entry) => {
  const prefix = `[${entry.source}]`
  return entry.message.startsWith(prefix) ? entry.message.slice(prefix.length).trimStart() : entry.message
}

const formatDateTime = (value) => new Date(value).toLocaleString(intlLocale(), {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
})

watch(autoRefresh, (on) => {
  clearInterval(refreshTimer)
  if (on) refreshTimer = setInterval(() => { if (!loading.value) reload() }, 5000)
})

onMounted(reload)
onBeforeUnmount(() => {
  clearInterval(refreshTimer)
  clearTimeout(searchTimer)
})
</script>

<style scoped>
.server-logs {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.logs-settings,
.logs-filters {
  padding: 1.25rem;
}

.logs-settings-main {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-width: 560px;
}

.logs-note {
  margin: 0.6rem 0 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.logs-note-debug {
  color: var(--accent-warning, #d97706);
  font-weight: 600;
}

.logs-filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.logs-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.75rem;
}

.logs-auto {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-right: auto;
  font-size: 0.9rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.logs-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.75rem 1rem;
  color: var(--accent-warning, #d97706);
  font-size: 0.9rem;
}

.logs-list {
  padding: 0.5rem;
  overflow-x: auto;
}

.log-row {
  display: grid;
  grid-template-columns: 9.5rem 8rem 9rem minmax(0, 1fr);
  gap: 0.6rem;
  align-items: baseline;
  padding: 0.35rem 0.5rem;
  border-radius: var(--radius-sm);
  border-left: 3px solid transparent;
  font-size: 0.82rem;
  cursor: pointer;
}

.log-row:hover {
  background: var(--bg-tertiary);
}

.log-time {
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  white-space: nowrap;
}

.log-level {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.03em;
}

.log-source {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-message {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-message.expanded {
  white-space: pre-wrap;
  word-break: break-word;
}

.log-debug .log-level { color: var(--text-muted); }
.log-info .log-level { color: var(--accent-primary); }
.log-warn { border-left-color: #f59e0b; }
.log-warn .log-level { color: #d97706; }
.log-error { border-left-color: #ef4444; }
.log-error .log-level { color: #dc2626; }
.log-critical { border-left-color: #b91c1c; background: rgba(239, 68, 68, 0.08); }
.log-critical .log-level { color: #b91c1c; }

.logs-more {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 0.5rem 0.25rem;
}

.spin {
  animation: logs-spin 1s linear infinite;
}

@keyframes logs-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .log-row {
    grid-template-columns: auto auto minmax(0, 1fr);
  }

  .log-message {
    grid-column: 1 / -1;
  }
}
</style>
