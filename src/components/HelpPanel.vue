<template>
  <teleport to="body">
    <transition name="help-fade">
      <div v-if="modelValue" class="help-overlay" @click="close" />
    </transition>
    <transition name="help-slide">
      <aside
        v-if="modelValue"
        class="help-panel"
        role="dialog"
        aria-modal="true"
        :aria-label="t(`help.topics.${topic}.title`)"
      >
        <header class="help-header">
          <span class="help-icon" aria-hidden="true">{{ config.icon }}</span>
          <div class="help-heading">
            <span class="help-kicker">{{ t('help.kicker') }}</span>
            <h2>{{ t(`help.topics.${topic}.title`) }}</h2>
          </div>
          <button type="button" class="help-close" :aria-label="t('common.close')" @click="close">
            <X :size="20" />
          </button>
        </header>

        <div class="help-body">
          <p class="help-intro">{{ t(`help.topics.${topic}.intro`) }}</p>

          <section v-if="config.howto.length" class="help-section">
            <h3>{{ t('help.howto') }}</h3>
            <details v-for="key in config.howto" :key="key" class="help-howto">
              <summary>{{ t(`help.topics.${topic}.howto.${key}.q`) }}</summary>
              <p>{{ t(`help.topics.${topic}.howto.${key}.a`) }}</p>
            </details>
          </section>

          <section v-if="config.tips.length" class="help-section">
            <h3>{{ t('help.tips') }}</h3>
            <ul class="help-tips">
              <li v-for="key in config.tips" :key="key">{{ t(`help.tips_.${key}`) }}</li>
            </ul>
          </section>

          <section v-if="config.voice.length" class="help-section">
            <h3>🎙️ {{ t('help.voice') }}</h3>
            <p class="help-voice-intro">{{ t('help.voiceIntro') }}</p>
            <ul class="help-voice">
              <li v-for="key in config.voice" :key="key">« {{ t(`help.topics.${topic}.voice.${key}`) }} »</li>
            </ul>
          </section>
        </div>
      </aside>
    </transition>
  </teleport>
</template>

<script setup>
// Aide contextuelle : le bouton « ? » en haut à droite ouvre la fiche de l'écran affiché (à quoi
// il sert, « comment faire… », astuces, phrases vocales). Les textes sont dans
// src/locales/<lang>/help.json ; la liste des rubriques de chaque fiche est ci-dessous.
import { computed, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { X } from '@lucide/vue'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()
const route = useRoute()

const ROUTE_TOPICS = {
  'family-absences': 'presence',
  'family-meals': 'meals',
  'family-meal-plans': 'mealPlans'
}

const TOPICS = {
  presence: {
    icon: '🏠',
    howto: ['absence', 'longAbsence', 'guest', 'usual', 'alternate'],
    tips: ['swipe', 'rolling', 'defaultPresence'],
    voice: ['absent', 'present', 'guest', 'who']
  },
  meals: {
    icon: '🍽️',
    howto: ['dish', 'ingredients', 'headcount', 'guests'],
    tips: ['swipe', 'rolling'],
    voice: ['dish', 'menu', 'who']
  },
  mealPlans: {
    icon: '🗳️',
    howto: ['create', 'share', 'follow', 'close', 'reopen'],
    tips: ['noAccount', 'conflicts'],
    voice: []
  },
  general: {
    icon: '💡',
    howto: ['navigate', 'family', 'profile'],
    tips: ['swipe', 'voiceButton'],
    voice: []
  }
}

const topic = computed(() => ROUTE_TOPICS[route.name] || 'general')
const config = computed(() => TOPICS[topic.value])

const close = () => emit('update:modelValue', false)
const onKey = (e) => { if (e.key === 'Escape') close() }

watch(() => props.modelValue, (open) => {
  if (open) document.addEventListener('keydown', onKey)
  else document.removeEventListener('keydown', onKey)
})
// Changer d'écran ferme la fiche (elle ne correspondrait plus)
watch(() => route.fullPath, close)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<style scoped>
.help-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(15, 23, 42, 0.35);
}

.help-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1201;
  width: min(420px, 100vw);
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-color);
  box-shadow: -20px 0 50px rgba(15, 23, 42, 0.2);
  padding-top: env(safe-area-inset-top, 0px);
}

.help-header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 1.1rem 1.1rem 0.9rem;
  border-bottom: 1px solid var(--border-color);
}

.help-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  background: var(--bg-tertiary);
}

.help-heading {
  flex: 1;
  min-width: 0;
}

.help-kicker {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent-primary);
}

.help-heading h2 {
  margin: 0.1rem 0 0;
  font-size: 1.2rem;
}

.help-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.help-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.1rem calc(2rem + env(safe-area-inset-bottom, 0px));
}

.help-intro {
  margin: 0 0 1.2rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.help-section {
  margin-bottom: 1.4rem;
}

.help-section h3 {
  margin: 0 0 0.6rem;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.help-howto {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-secondary);
  margin-bottom: 0.5rem;
}

.help-howto summary {
  list-style: none;
  cursor: pointer;
  padding: 0.75rem 0.9rem;
  font-weight: 600;
  font-size: 0.93rem;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.help-howto summary::-webkit-details-marker {
  display: none;
}

.help-howto summary::after {
  content: '+';
  color: var(--accent-primary);
  font-weight: 700;
}

.help-howto[open] summary::after {
  content: '−';
}

.help-howto p {
  margin: 0;
  padding: 0 0.9rem 0.85rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.55;
}

.help-tips,
.help-voice {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.help-tips li {
  padding-left: 1.4rem;
  position: relative;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.help-tips li::before {
  content: '💡';
  position: absolute;
  left: 0;
  font-size: 0.85rem;
}

.help-voice-intro {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.help-voice li {
  padding: 0.55rem 0.8rem;
  border-radius: 10px;
  background: rgba(99, 102, 241, 0.08);
  color: var(--accent-primary);
  font-style: italic;
  font-size: 0.9rem;
}

.help-fade-enter-active,
.help-fade-leave-active {
  transition: opacity 0.2s ease;
}

.help-fade-enter-from,
.help-fade-leave-to {
  opacity: 0;
}

.help-slide-enter-active,
.help-slide-leave-active {
  transition: transform 0.25s ease;
}

.help-slide-enter-from,
.help-slide-leave-to {
  transform: translateX(100%);
}
</style>
