<template>
  <div v-if="available" class="voice-assistant">
    <!-- Bouton micro flottant -->
    <button
      v-if="!open"
      type="button"
      class="voice-fab"
      :title="t('voice.open')"
      :aria-label="t('voice.open')"
      @click="openAndListen"
    >
      <Mic :size="24" />
    </button>

    <!-- Fenêtre de dialogue -->
    <transition name="voice-panel">
      <section v-if="open" class="voice-panel glass-card" role="dialog" :aria-label="t('voice.title')">
        <header class="voice-header">
          <div class="voice-title">
            <Mic :size="18" />
            <h2>{{ t('voice.title') }}</h2>
          </div>
          <div class="voice-header-actions">
            <button
              type="button"
              class="voice-icon-btn"
              :class="{ active: speakReplies }"
              :title="speakReplies ? t('voice.muteReplies') : t('voice.speakReplies')"
              :aria-pressed="speakReplies"
              @click="toggleSpeak"
            >
              <Volume2 v-if="speakReplies" :size="18" />
              <VolumeX v-else :size="18" />
            </button>
            <button type="button" class="voice-icon-btn" :title="t('common.close')" :aria-label="t('common.close')" @click="close">
              <X :size="18" />
            </button>
          </div>
        </header>

        <div ref="messagesRef" class="voice-messages">
          <div v-if="messages.length === 0" class="voice-intro">
            <p>{{ recognitionSupported ? t('voice.introVoice') : t('voice.introText') }}</p>
            <div class="voice-examples">
              <button v-for="key in EXAMPLES" :key="key" type="button" class="voice-example" @click="send(t(`voice.examples.${key}`), false)">
                « {{ t(`voice.examples.${key}`) }} »
              </button>
            </div>
          </div>
          <div v-for="(msg, i) in messages" :key="i" class="voice-message" :class="msg.from">
            <span>{{ msg.text }}</span>
          </div>
          <div v-if="interim" class="voice-message user interim"><span>{{ interim }}</span></div>
        </div>

        <p class="voice-status" :class="{ listening }" aria-live="polite">
          <template v-if="listening"><span class="voice-pulse"></span>{{ t('voice.listening') }}</template>
          <template v-else-if="busy">{{ t('voice.thinking') }}</template>
          <template v-else-if="error">{{ error }}</template>
        </p>

        <form class="voice-input-row" @submit.prevent="submitTyped">
          <input
            v-model="typed"
            type="text"
            class="form-input voice-input"
            :placeholder="t('voice.typePlaceholder')"
            :disabled="busy"
            enterkeyhint="send"
          />
          <button v-if="typed.trim()" type="submit" class="voice-round-btn" :disabled="busy" :title="t('voice.send')">
            <Send :size="18" />
          </button>
          <button
            v-else-if="recognitionSupported"
            type="button"
            class="voice-round-btn mic"
            :class="{ listening }"
            :disabled="busy"
            :title="listening ? t('voice.stopListening') : t('voice.listen')"
            @click="listening ? stopListening() : startListening()"
          >
            <Mic :size="20" />
          </button>
        </form>
      </section>
    </transition>
  </div>
</template>

<script setup>
// Assistant vocal de l'application : dictée par la reconnaissance vocale du navigateur (en
// français), phrase comprise par le serveur sans IA avec les mêmes commandes et questions que la
// skill Alexa (POST /api/voice/command, voir server/voice/). Saisie au clavier en secours.
import { ref, computed, nextTick, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Mic, X, Send, Volume2, VolumeX } from '@lucide/vue'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { currentLocale } from '../i18n'

const EXAMPLES = ['shopping', 'event', 'meal', 'absence', 'menu', 'summary']
const SPEAK_KEY = 'familygest_voice_speak'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const store = useFamilyStore()

const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
const recognitionSupported = Boolean(SpeechRecognition)

// Commandes en français uniquement (celles de la skill Alexa) : l'assistant n'apparaît qu'en français
const available = computed(() => authStore.isAuthenticated && Boolean(route.params.familySlug) && currentLocale.value === 'fr')

const open = ref(false)
const messages = ref([])
const interim = ref('')
const typed = ref('')
const listening = ref(false)
const busy = ref(false)
const error = ref('')
const messagesRef = ref(null)
const readSetting = () => { try { return localStorage.getItem(SPEAK_KEY) !== '0' } catch { return true } }
const speakReplies = ref(readSetting())

// État de la conversation renvoyé par le serveur (questions en cours)
let conversation = { session: {}, pending: null }
let recognition = null
let lastInputWasVoice = false

const scrollDown = () => nextTick(() => {
  if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
})

const toggleSpeak = () => {
  speakReplies.value = !speakReplies.value
  try { localStorage.setItem(SPEAK_KEY, speakReplies.value ? '1' : '0') } catch { /* stockage indisponible */ }
  if (!speakReplies.value) window.speechSynthesis?.cancel()
}

const speak = (text) => new Promise(resolve => {
  if (!speakReplies.value || !window.speechSynthesis || !text) return resolve()
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'fr-FR'
  const voice = window.speechSynthesis.getVoices().find(v => v.lang?.startsWith('fr'))
  if (voice) utterance.voice = voice
  utterance.onend = resolve
  utterance.onerror = resolve
  window.speechSynthesis.speak(utterance)
})

const startListening = () => {
  if (!recognitionSupported || listening.value || busy.value) return
  window.speechSynthesis?.cancel()
  error.value = ''
  interim.value = ''
  recognition = new SpeechRecognition()
  recognition.lang = 'fr-FR'
  recognition.interimResults = true
  recognition.continuous = false
  recognition.maxAlternatives = 1
  let finalText = ''
  let lastHeard = ''
  recognition.onresult = (event) => {
    let partial = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      if (result.isFinal) finalText += result[0].transcript
      else partial += result[0].transcript
    }
    interim.value = (finalText + partial).trim()
    if (interim.value) lastHeard = interim.value
    scrollDown()
  }
  recognition.onerror = (event) => {
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') error.value = t('voice.micDenied')
    else if (event.error !== 'no-speech' && event.error !== 'aborted') error.value = t('voice.micError')
  }
  recognition.onend = () => {
    listening.value = false
    interim.value = ''
    recognition = null
    // Sur Android, un mot très court (« midi ») peut rester « provisoire » jusqu'à la fin de
    // l'écoute : on envoie alors le dernier texte entendu plutôt que de ne rien faire
    const heard = finalText.trim() || lastHeard.trim()
    if (heard) send(heard, true)
    else if (!error.value && conversation.pending) error.value = t('voice.nothingHeard')
  }
  try {
    recognition.start()
    listening.value = true
  } catch {
    listening.value = false
    error.value = t('voice.micError')
  }
}

const stopListening = () => {
  recognition?.stop()
}

const send = async (text, fromVoice) => {
  if (!text || busy.value) return
  lastInputWasVoice = fromVoice
  error.value = ''
  messages.value.push({ from: 'user', text })
  scrollDown()
  busy.value = true
  let reply = null
  try {
    const res = await fetch('/api/voice/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
        'X-Family-Slug': route.params.familySlug
      },
      body: JSON.stringify({ text, session: conversation.session, pending: conversation.pending })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || res.statusText)
    reply = data
  } catch (err) {
    error.value = err.message || t('voice.failed')
  } finally {
    busy.value = false
  }
  if (!reply) return

  conversation = reply.ended ? { session: {}, pending: null } : { session: reply.session || {}, pending: reply.pending || null }
  messages.value.push({ from: 'assistant', text: reply.speech })
  scrollDown()
  // Un ajout a eu lieu : l'écran affiché se met à jour
  if (reply.changed) store.fetchAllData()
  await speak(reply.speech)
  // Question posée à la voix : on réécoute aussitôt la réponse
  if (!reply.ended && reply.pending?.prompt && lastInputWasVoice && open.value) startListening()
}

const submitTyped = () => {
  const text = typed.value.trim()
  typed.value = ''
  send(text, false)
}

const openAndListen = () => {
  open.value = true
  if (recognitionSupported) startListening()
}

const close = () => {
  recognition?.abort()
  window.speechSynthesis?.cancel()
  open.value = false
  listening.value = false
  interim.value = ''
  error.value = ''
  messages.value = []
  conversation = { session: {}, pending: null }
}

// Changement de famille : la conversation en cours n'a plus de sens
watch(() => route.params.familySlug, () => { if (open.value) close() })
onBeforeUnmount(() => {
  recognition?.abort()
  window.speechSynthesis?.cancel()
})
</script>

<style scoped>
.voice-fab {
  position: fixed;
  right: calc(1.1rem + env(safe-area-inset-right, 0px));
  bottom: calc(1.1rem + env(safe-area-inset-bottom, 0px));
  z-index: 900;
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, var(--accent-primary, #6366f1), #8b5cf6);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.35);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.voice-fab:active {
  transform: scale(0.94);
}

.voice-panel {
  position: fixed;
  right: calc(1rem + env(safe-area-inset-right, 0px));
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  z-index: 950;
  width: min(420px, calc(100vw - 2rem));
  max-height: min(560px, calc(100vh - 6rem));
  display: flex;
  flex-direction: column;
  padding: 0.9rem;
  gap: 0.6rem;
  background: var(--bg-secondary, #fff);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
}

.voice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.voice-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--accent-primary);
}

.voice-title h2 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.voice-header-actions {
  display: flex;
  gap: 0.25rem;
}

.voice-icon-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.voice-icon-btn.active {
  color: var(--accent-primary);
}

.voice-icon-btn:hover {
  background: var(--bg-tertiary);
}

.voice-messages {
  flex: 1;
  min-height: 120px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.2rem;
}

.voice-intro p {
  margin: 0 0 0.6rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.voice-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.voice-example {
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 999px;
  padding: 0.3rem 0.7rem;
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  text-align: left;
}

.voice-message {
  display: flex;
}

.voice-message span {
  max-width: 85%;
  padding: 0.5rem 0.75rem;
  border-radius: 14px;
  font-size: 0.92rem;
  line-height: 1.4;
}

.voice-message.user {
  justify-content: flex-end;
}

.voice-message.user span {
  background: var(--accent-primary, #6366f1);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.voice-message.user.interim span {
  opacity: 0.6;
}

.voice-message.assistant span {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-bottom-left-radius: 4px;
}

.voice-status {
  min-height: 1.2em;
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.voice-status.listening {
  color: var(--accent-primary);
  font-weight: 600;
}

.voice-pulse {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #ef4444;
  animation: voice-pulse 1.1s ease-in-out infinite;
}

@keyframes voice-pulse {
  0%, 100% { transform: scale(0.8); opacity: 0.6; }
  50% { transform: scale(1.25); opacity: 1; }
}

.voice-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.voice-input {
  flex: 1;
  min-width: 0;
}

.voice-round-btn {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: var(--accent-primary, #6366f1);
  cursor: pointer;
}

.voice-round-btn.mic.listening {
  background: #ef4444;
  animation: voice-pulse 1.1s ease-in-out infinite;
}

.voice-round-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.voice-panel-enter-active,
.voice-panel-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.voice-panel-enter-from,
.voice-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@media (max-width: 600px) {
  .voice-panel {
    left: 0.5rem;
    right: 0.5rem;
    bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
    width: auto;
    max-height: 70vh;
  }
}

@media (prefers-reduced-motion: reduce) {
  .voice-pulse,
  .voice-round-btn.mic.listening {
    animation: none;
  }
}
</style>
