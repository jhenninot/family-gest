<template>
  <div class="vote-page">
    <div class="vote-card glass-card">
      <div class="vote-brand">
        <span class="vote-logo"><BrandLogo :size="22" /></span>
        <span>FamilyGest</span>
      </div>

      <p v-if="loading" class="vote-muted">{{ t('common.loading') }}</p>
      <p v-else-if="error" class="vote-error">{{ error }}</p>

      <template v-else-if="poll">
        <p class="vote-host">{{ t('mealPolls.vote.invitedBy', { family: poll.familyName }) }}</p>
        <h1 class="vote-title">{{ poll.title }}</h1>
        <p class="vote-slot">{{ poll.slot === 'lunch' ? '☀️' : '🌙' }} {{ t(`mealPolls.slots.${poll.slot}`) }}</p>
        <p v-if="poll.note" class="vote-note">{{ poll.note }}</p>

        <!-- Date fixée : rendez-vous -->
        <div v-if="poll.status === 'closed' && poll.chosenDate" class="vote-chosen">
          🎉 {{ t('mealPolls.vote.chosen', { date: longDate(poll.chosenDate), slot: t(`mealPolls.slots.${poll.slot}`).toLowerCase() }) }}
        </div>

        <!-- 1. Qui êtes-vous ? -->
        <template v-if="poll.status === 'open' && !guest">
          <h2 class="vote-step">{{ t('mealPolls.vote.who') }}</h2>
          <div class="vote-names">
            <button v-for="g in poll.guests" :key="g.id" type="button" class="vote-name" @click="pickGuest(g.id)">
              {{ g.name }}<span v-if="(g.count || 1) > 1" class="vote-count">×{{ g.count }}</span><span v-if="g.voted" class="vote-done">✓</span>
            </button>
          </div>
        </template>

        <!-- 2. Disponibilités -->
        <template v-else-if="poll.status === 'open' && guest">
          <div class="vote-me">
            <h2 class="vote-step">{{ t('mealPolls.vote.hello', { name: guest.name }) }}</h2>
            <button type="button" class="vote-link" @click="pickGuest(null)">{{ t('mealPolls.vote.notMe') }}</button>
          </div>
          <p class="vote-muted">{{ guest.count > 1 ? t('mealPolls.vote.instructionsGroup', { n: guest.count }) : t('mealPolls.vote.instructions') }}</p>

          <ul class="vote-dates">
            <li v-for="d in poll.dates" :key="d" class="vote-date">
              <span class="vote-date-label">{{ longDate(d) }}</span>
              <div class="vote-answers" role="radiogroup" :aria-label="longDate(d)">
                <button
                  v-for="a in ANSWERS"
                  :key="a"
                  type="button"
                  role="radio"
                  :aria-checked="answers[d] === a"
                  class="vote-answer"
                  :class="[a, { active: answers[d] === a }]"
                  @click="answers[d] = a"
                >{{ ICONS[a] }} {{ t(`mealPolls.answers.${a}`) }}</button>
              </div>
            </li>
          </ul>

          <label class="vote-comment">
            <span>{{ t('mealPolls.vote.comment') }}</span>
            <textarea v-model="comment" rows="2" maxlength="300" class="form-input"></textarea>
          </label>

          <p v-if="saved" class="vote-saved">✅ {{ t('mealPolls.vote.saved') }}</p>
          <p v-if="saveError" class="vote-error">{{ saveError }}</p>
          <button type="button" class="btn btn-primary vote-submit" :disabled="saving" @click="save">
            {{ saving ? t('common.saving') : t('mealPolls.vote.submit') }}
          </button>
        </template>

        <!-- Réponses de tous -->
        <h2 v-if="poll.dates.length" class="vote-step">{{ t('mealPolls.vote.everyone') }}</h2>
        <MealPollGrid v-if="poll.dates.length" :poll="poll" :highlight-guest-id="guest?.id ?? null" />
      </template>
    </div>
    <p class="vote-footer">{{ t('mealPolls.vote.footer') }}</p>
  </div>
</template>

<script setup>
// Page publique de vote d'un repas à organiser (/sondage/<token>) : ouverte depuis un lien partagé
// (WhatsApp…), sans compte. L'invité choisit son nom puis répond pour chaque date proposée.
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { formatDate } from '../i18n/format'
import BrandLogo from '../components/BrandLogo.vue'
import MealPollGrid from '../components/MealPollGrid.vue'

const { t } = useI18n()
const route = useRoute()
const token = String(route.params.token || '')

const ANSWERS = ['yes', 'maybe', 'no']
const ICONS = { yes: '✓', maybe: '~', no: '✗' }
const GUEST_KEY = `familygest_poll_guest_${token}`

const poll = ref(null)
const loading = ref(true)
const error = ref('')
const guestId = ref(null)
const answers = reactive({})
const comment = ref('')
const saving = ref(false)
const saved = ref(false)
const saveError = ref('')

const guest = computed(() => poll.value?.guests.find(g => g.id === guestId.value) || null)
const longDate = (d) => formatDate(new Date(`${d}T00:00:00`), { weekday: 'long', day: 'numeric', month: 'long' })

const readStored = () => { try { return Number(localStorage.getItem(GUEST_KEY)) || null } catch { return null } }
const store = (id) => {
  try {
    if (id == null) localStorage.removeItem(GUEST_KEY)
    else localStorage.setItem(GUEST_KEY, String(id))
  } catch { /* stockage indisponible */ }
}

// Réponses déjà données par l'invité (ou vides)
const fillAnswers = () => {
  for (const key of Object.keys(answers)) delete answers[key]
  if (!guest.value) return
  for (const v of poll.value.votes) if (v.guestId === guest.value.id) answers[v.date] = v.answer
  comment.value = guest.value.comment || ''
}

const pickGuest = (id) => {
  guestId.value = id
  saved.value = false
  store(id)
  fillAnswers()
}

onMounted(async () => {
  try {
    const res = await fetch(`/api/public/meal-polls/${encodeURIComponent(token)}`)
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || t('mealPolls.vote.notFound'))
    poll.value = body
    const stored = readStored()
    if (stored && body.guests.some(g => g.id === stored)) pickGuest(stored)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})

const save = async () => {
  saving.value = true
  saved.value = false
  saveError.value = ''
  try {
    const res = await fetch(`/api/public/meal-polls/${encodeURIComponent(token)}/votes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId: guestId.value, answers: { ...answers }, comment: comment.value })
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || res.statusText)
    poll.value = body
    saved.value = true
  } catch (err) {
    saveError.value = err.message
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.vote-page {
  min-height: 100vh;
  padding: 1.5rem 1rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg-primary);
}

.vote-card {
  width: 100%;
  max-width: 640px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.vote-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 800;
  color: var(--accent-primary);
  margin-bottom: 0.25rem;
}

.vote-logo {
  display: inline-flex;
  padding: 0.35rem;
  border-radius: 10px;
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

.vote-host {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.vote-title {
  margin: 0;
  font-size: 1.5rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.vote-slot {
  margin: 0;
  font-weight: 600;
  color: var(--text-secondary);
}

.vote-note {
  margin: 0;
  white-space: pre-wrap;
  color: var(--text-secondary);
}

.vote-chosen {
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md, 10px);
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
  font-weight: 600;
}

.vote-step {
  margin: 0.75rem 0 0;
  font-size: 1.05rem;
}

.vote-names {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.vote-name {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
}

.vote-name:hover {
  border-color: var(--accent-primary);
}

.vote-count {
  font-size: 0.8rem;
  color: var(--accent-primary);
}

.vote-done {
  color: #059669;
}

.vote-me {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.vote-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--accent-primary);
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
}

.vote-muted {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.vote-dates {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.vote-date {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.7rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 10px);
}

.vote-date-label {
  font-weight: 600;
}

.vote-date-label::first-letter {
  text-transform: uppercase;
}

.vote-answers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}

.vote-answer {
  padding: 0.55rem 0.3rem;
  border-radius: var(--radius-md, 10px);
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
}

.vote-answer.yes.active { background: #10b981; border-color: #10b981; color: #fff; }
.vote-answer.maybe.active { background: #f59e0b; border-color: #f59e0b; color: #fff; }
.vote-answer.no.active { background: #ef4444; border-color: #ef4444; color: #fff; }

.vote-comment {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.vote-submit {
  align-self: stretch;
}

.vote-saved {
  margin: 0;
  color: #059669;
  font-weight: 600;
}

.vote-error {
  margin: 0;
  color: #dc2626;
}

.vote-footer {
  margin-top: 1rem;
  font-size: 0.78rem;
  color: var(--text-muted);
}
</style>
