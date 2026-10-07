<template>
  <div class="card glass-card voice-ai-card">
    <h2 class="voice-ai-title"><Sparkles :size="20" /> {{ t('familySettings.voiceAi.title') }}</h2>
    <p class="voice-ai-intro">{{ t('familySettings.voiceAi.intro') }}</p>

    <div v-if="loading" class="voice-ai-line"><Loader2 :size="16" class="spin" /> {{ t('common.loading') }}</div>
    <form v-else class="voice-ai-form" @submit.prevent="save">
      <p class="voice-ai-status" :class="{ on: state.configured && form.enabled }">
        <template v-if="!state.configured">{{ t('familySettings.voiceAi.statusNone') }}</template>
        <template v-else-if="!form.enabled">{{ t('familySettings.voiceAi.statusOff', { key: state.keyPreview }) }}</template>
        <template v-else>{{ t('familySettings.voiceAi.statusOn', { key: state.keyPreview }) }}</template>
      </p>

      <div class="form-group">
        <label class="form-label" for="voice-ai-key">{{ t('familySettings.voiceAi.apiKey') }}</label>
        <input
          id="voice-ai-key"
          v-model="form.apiKey"
          type="password"
          class="form-input"
          autocomplete="new-password"
          :placeholder="state.configured ? t('familySettings.voiceAi.keyKept') : ''"
        />
        <p class="voice-ai-hint">
          {{ t('familySettings.voiceAi.keyHelp') }}
          <a href="https://console.mistral.ai/api-keys" target="_blank" rel="noopener">console.mistral.ai</a>
        </p>
      </div>

      <div class="form-group">
        <label class="form-label" for="voice-ai-model">{{ t('familySettings.voiceAi.model') }}</label>
        <input id="voice-ai-model" v-model="form.model" type="text" class="form-input" maxlength="80" autocomplete="off" />
      </div>

      <template v-if="state.configured || form.apiKey">
        <label class="voice-ai-toggle">
          <input v-model="form.enabled" type="checkbox" />
          <span>{{ t('familySettings.voiceAi.enable') }}</span>
        </label>
        <label class="voice-ai-toggle">
          <input v-model="form.allowAgenda" type="checkbox" />
          <span>{{ t('familySettings.voiceAi.allowAgenda') }}</span>
        </label>
        <label class="voice-ai-toggle">
          <input v-model="form.allowPrivateTasks" type="checkbox" />
          <span>{{ t('familySettings.voiceAi.allowPrivateTasks') }}</span>
        </label>
        <p class="voice-ai-hint">{{ t('familySettings.voiceAi.allowHint') }}</p>
      </template>

      <p class="voice-ai-hint">{{ t('familySettings.voiceAi.privacy') }}</p>
      <p v-if="state.lastError" class="voice-ai-message error">{{ t(`familySettings.voiceAi.lastError.${state.lastError}`) }}</p>
      <p v-if="message" class="voice-ai-message" :class="{ error: messageIsError }">{{ message }}</p>

      <div class="voice-ai-actions">
        <button type="submit" class="btn btn-primary" :disabled="saving || (!state.configured && !form.apiKey.trim())">
          <Loader2 v-if="saving" :size="16" class="spin" /> {{ saving ? t('common.saving') : t('common.save') }}
        </button>
        <button v-if="state.configured" type="button" class="btn btn-secondary" :disabled="saving" @click="remove">
          <Trash2 :size="15" /> {{ t('familySettings.voiceAi.remove') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
// Repli « langage naturel » de l'assistant vocal (clé Mistral de la famille) : voir server/voice/ai.js
import { reactive, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Sparkles, Loader2, Trash2 } from '@lucide/vue'
import { useFamilyStore } from '../stores/familyStore'

const { t } = useI18n()
const familyStore = useFamilyStore()

const state = reactive({ configured: false, keyPreview: '', model: '', lastError: '' })
const form = reactive({ apiKey: '', model: 'ministral-8b-latest', enabled: true, allowAgenda: false, allowPrivateTasks: false })
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const messageIsError = ref(false)

const apply = (data) => {
  Object.assign(state, { configured: data.configured, keyPreview: data.keyPreview || '', model: data.model, lastError: data.lastError || '' })
  Object.assign(form, { apiKey: '', model: data.model, enabled: data.configured ? data.enabled : true, allowAgenda: data.allowAgenda, allowPrivateTasks: data.allowPrivateTasks })
}

const call = async (method, body) => {
  const res = await fetch('/api/family-settings/voice-ai', { method, headers: familyStore.getHeaders(), ...(body ? { body: JSON.stringify(body) } : {}) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data
}

onMounted(async () => {
  try {
    apply(await call('GET'))
  } catch { /* formulaire vide */ } finally {
    loading.value = false
  }
})

const run = async (method, body, doneKey) => {
  saving.value = true
  message.value = ''
  try {
    apply(await call(method, body))
    messageIsError.value = false
    message.value = t(doneKey)
  } catch (err) {
    messageIsError.value = true
    message.value = err.message
  } finally {
    saving.value = false
  }
}

const save = () => run('PUT', { ...form, apiKey: form.apiKey.trim() }, 'familySettings.voiceAi.saved')
const remove = () => run('DELETE', null, 'familySettings.voiceAi.removed')
</script>

<style scoped>
.voice-ai-card {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.voice-ai-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.25rem;
}

.voice-ai-intro,
.voice-ai-hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.voice-ai-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.voice-ai-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
}

.voice-ai-status {
  margin: 0;
  font-weight: 600;
  color: var(--text-secondary);
}

.voice-ai-status.on {
  color: var(--accent-green, #16a34a);
}

.voice-ai-toggle {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  cursor: pointer;
}

.voice-ai-message {
  margin: 0;
  font-size: 0.9rem;
}

.voice-ai-message.error {
  color: var(--accent-red, #dc2626);
}

.voice-ai-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
