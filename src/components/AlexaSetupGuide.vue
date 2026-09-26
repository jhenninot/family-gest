<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content alexa-guide">
      <div class="modal-header">
        <h3><Mic :size="20" class="guide-title-icon" /> {{ t('alexaGuide.title') }}</h3>
        <button type="button" class="btn-close" :aria-label="t('common.close')" @click="$emit('close')">&times;</button>
      </div>

      <p class="guide-intro">{{ t('alexaGuide.intro', params) }}</p>

      <ol class="guide-steps">
        <li v-for="step in STEPS" :key="step.key" class="guide-step">
          <h4>{{ t(`alexaGuide.steps.${step.key}.title`) }}</h4>
          <ul>
            <li v-for="item in step.items" :key="item.key">
              {{ t(`alexaGuide.steps.${step.key}.${item.key}`, params) }}
              <a v-if="item.link" :href="item.link" target="_blank" rel="noopener" class="guide-link">
                {{ item.linkLabel || item.link.replace('https://', '') }} <ExternalLink :size="12" />
              </a>
            </li>
          </ul>

          <!-- Étape 2 : les actions de la carte Alexa, accessibles sans quitter le guide -->
          <div v-if="step.key === 'prepare'" class="guide-actions">
            <div v-if="endpointUrl" class="guide-url">
              <input type="text" readonly :value="endpointUrl" @click="$event.target.select()" />
              <button type="button" class="btn btn-secondary btn-sm" @click="copyUrl">
                <Copy :size="14" /> {{ copied ? t('alexaGuide.copied') : t('familySettings.mcp.copy') }}
              </button>
            </div>
            <button v-else-if="!exists" type="button" class="btn btn-primary btn-sm" :disabled="busy" @click="$emit('generate')">
              <RefreshCw :size="14" /> {{ t('familySettings.alexa.generate') }}
            </button>
            <p v-else class="guide-note">{{ t('alexaGuide.alreadyGenerated') }}</p>
            <button type="button" class="btn btn-secondary btn-sm" :disabled="busy" @click="$emit('download')">
              <Download :size="14" /> {{ t('familySettings.alexa.downloadModel') }}
            </button>
          </div>
        </li>
      </ol>

      <p class="guide-note">{{ t('alexaGuide.consoleNote') }}</p>

      <div class="modal-footer">
        <button type="button" class="btn btn-primary" @click="$emit('close')">{{ t('common.close') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Guide pas à pas de création de la skill Alexa privée, consultable par l'administrateur de la
// famille depuis la carte « Assistant vocal Alexa » (pendant de ALEXA.md, dans l'application).
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Mic, ExternalLink, Copy, Download, RefreshCw } from '@lucide/vue'

const props = defineProps({
  invocationName: { type: String, required: true },
  exists: { type: Boolean, default: false },
  endpointUrl: { type: String, default: '' },
  busy: { type: Boolean, default: false }
})
defineEmits(['close', 'generate', 'download'])

const { t } = useI18n()

const STEPS = [
  { key: 'prereq', items: [{ key: 'https' }, { key: 'serverUrl' }, { key: 'account' }, { key: 'private' }] },
  { key: 'prepare', items: [{ key: 'name' }, { key: 'generate' }, { key: 'download' }] },
  { key: 'devAccount', items: [{ key: 'open', link: 'https://developer.amazon.com' }, { key: 'profile' }] },
  { key: 'create', items: [{ key: 'console', link: 'https://developer.amazon.com/alexa/console/ask' }, { key: 'name' }, { key: 'type' }, { key: 'template' }] },
  { key: 'model', items: [{ key: 'json' }, { key: 'drop' }, { key: 'build' }] },
  { key: 'endpoint', items: [{ key: 'menu' }, { key: 'url' }, { key: 'cert' }] },
  { key: 'test', items: [{ key: 'enable' }, { key: 'type' }, { key: 'echo' }] },
  { key: 'usage', items: [{ key: 'event' }, { key: 'shopping' }, { key: 'meal' }, { key: 'absence' }, { key: 'guest' }, { key: 'who' }, { key: 'tasks' }, { key: 'menu' }, { key: 'conversation' }] },
  { key: 'maintenance', items: [{ key: 'newMember' }, { key: 'rename' }, { key: 'regenerate' }] },
  { key: 'troubleshooting', items: [{ key: 'amazonList' }, { key: 'problem' }, { key: 'unreachable' }, { key: 'firstName' }] }
]

const params = computed(() => ({ name: props.invocationName, origin: window.location.origin }))

const copied = ref(false)
const copyUrl = async () => {
  try {
    await navigator.clipboard.writeText(props.endpointUrl)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch (err) {
    console.error('Copie dans le presse-papiers impossible :', err)
  }
}
</script>

<style scoped>
.alexa-guide {
  max-width: 720px;
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.guide-title-icon {
  color: var(--accent-primary);
}

.guide-intro {
  margin: 0 0 1.25rem;
  color: var(--text-secondary);
  line-height: 1.55;
}

.guide-steps {
  margin: 0;
  padding-left: 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.guide-step::marker {
  font-weight: 800;
  color: var(--accent-primary);
}

.guide-step h4 {
  margin: 0 0 0.4rem;
  font-size: 1rem;
  color: var(--text-primary);
}

.guide-step ul {
  margin: 0;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}

.guide-link {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  color: var(--accent-primary);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.guide-link:hover {
  text-decoration: underline;
}

.guide-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.guide-url {
  display: flex;
  gap: 0.5rem;
  flex: 1 1 100%;
}

.guide-url input {
  flex: 1;
  min-width: 0;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-family: monospace;
  font-size: 0.8rem;
}

.guide-note {
  margin: 1rem 0 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.guide-actions .guide-note {
  margin: 0;
  flex: 1 1 100%;
}
</style>
