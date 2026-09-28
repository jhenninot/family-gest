<template>
  <div class="plans-view">
    <div class="glass-card plans-header">
      <router-link :to="`/${slug}/meals`" class="plans-back">
        <ChevronLeft :size="18" /> {{ t('mealPolls.backToMeals') }}
      </router-link>
      <div class="plans-title-row">
        <div>
          <h2>{{ t('mealPolls.title') }}</h2>
          <p class="plans-muted">{{ t('mealPolls.intro') }}</p>
        </div>
        <button type="button" class="btn btn-primary plans-new" @click="openEditor()">
          <Plus :size="18" /> {{ t('mealPolls.new') }}
        </button>
      </div>
    </div>

    <p v-if="loading" class="plans-muted">{{ t('common.loading') }}</p>
    <div v-else-if="polls.length === 0" class="glass-card plans-empty">
      🍽️ {{ t('mealPolls.empty') }}
    </div>

    <div v-for="poll in polls" :key="poll.id" class="glass-card plan-card" :class="{ closed: poll.status === 'closed' }">
      <button type="button" class="plan-summary" :aria-expanded="openId === poll.id" @click="openId = openId === poll.id ? null : poll.id">
        <div class="plan-summary-main">
          <span class="plan-title">{{ poll.title }}</span>
          <span class="plan-meta">
            <span class="plan-slot">{{ poll.slot === 'lunch' ? '☀️' : '🌙' }} {{ t(`mealPolls.slots.${poll.slot}`) }}</span>
            <template v-if="poll.status === 'closed' && poll.chosenDate">
              · <strong class="plan-chosen">{{ longDate(poll.chosenDate) }}</strong>
            </template>
            <template v-else>
              · {{ t('mealPolls.peopleCount', { n: poll.summary.people || poll.guests.length }, poll.summary.people || poll.guests.length) }}
              · {{ t('mealPolls.answered', { n: poll.summary.answered, total: poll.summary.total }) }}
              <template v-if="poll.summary.bestDate"> · {{ t('mealPolls.best', { date: shortDate(poll.summary.bestDate) }) }}</template>
            </template>
          </span>
        </div>
        <span class="plan-status" :class="poll.status">{{ t(`mealPolls.status.${poll.status}`) }}</span>
      </button>

      <div v-if="openId === poll.id" class="plan-detail">
        <p v-if="poll.note" class="plan-note">{{ poll.note }}</p>

        <!-- Lien de vote à partager -->
        <div v-if="poll.status === 'open'" class="plan-share">
          <label class="form-label">{{ t('mealPolls.share.label') }}</label>
          <div class="plan-link-row">
            <input type="text" readonly class="form-input" :value="voteUrl(poll)" @click="$event.target.select()" />
            <button type="button" class="btn btn-secondary" @click="copyLink(poll)">
              <Copy :size="15" /> {{ copiedId === poll.id ? t('mealPolls.share.copied') : t('mealPolls.share.copy') }}
            </button>
          </div>
          <div class="plan-share-actions">
            <a class="btn plan-whatsapp" :href="whatsappUrl(poll)" target="_blank" rel="noopener">
              <MessageCircle :size="16" /> {{ t('mealPolls.share.whatsapp') }}
            </a>
            <button v-if="canShare" type="button" class="btn btn-secondary" @click="shareLink(poll)">
              <Share2 :size="16" /> {{ t('mealPolls.share.other') }}
            </button>
          </div>
        </div>

        <MealPollGrid v-if="poll.dates.length && poll.guests.length" :poll="poll" />
        <p v-else class="plans-muted">{{ t('mealPolls.incomplete') }}</p>

        <div class="plan-actions">
          <button type="button" class="btn btn-secondary btn-icon-only" :title="t('common.delete')" :aria-label="t('common.delete')" @click="remove(poll)">
            <Trash2 :size="17" />
          </button>
          <button type="button" class="btn btn-secondary" @click="openEditor(poll)">
            <Edit3 :size="16" /> {{ t('common.edit') }}
          </button>
          <button v-if="poll.status === 'open'" type="button" class="btn btn-primary" :disabled="!poll.dates.length" @click="openClosing(poll)">
            <CalendarCheck :size="16" /> {{ t('mealPolls.close.button') }}
          </button>
          <button v-else type="button" class="btn btn-secondary" @click="reopen(poll)">
            <RotateCcw :size="16" /> {{ t('mealPolls.reopen') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Création / modification -->
    <div v-if="editor" class="modal-overlay" @click.self="editor = null">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editor.id ? t('mealPolls.editTitle') : t('mealPolls.new') }}</h3>
          <button type="button" class="btn-close" :aria-label="t('common.close')" @click="editor = null">&times;</button>
        </div>
        <form class="plan-form" @submit.prevent="saveEditor">
          <div class="form-group">
            <label class="form-label" for="poll-title">{{ t('mealPolls.form.title') }}</label>
            <input id="poll-title" v-model="editor.title" type="text" class="form-input" maxlength="120" required :placeholder="t('mealPolls.form.titlePlaceholder')" />
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('mealPolls.form.slot') }}</label>
            <div class="plan-slot-choice">
              <button v-for="s in ['lunch', 'dinner']" :key="s" type="button" class="slot-chip" :class="{ selected: editor.slot === s }" @click="editor.slot = s">
                {{ s === 'lunch' ? '☀️' : '🌙' }} {{ t(`mealPolls.slots.${s}`) }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="poll-guest">{{ t('mealPolls.form.guests') }}</label>
            <div class="plan-add-row">
              <input id="poll-guest" v-model="guestInput" type="text" class="form-input" :placeholder="t('mealPolls.form.guestPlaceholder')" @keydown.enter.prevent="addGuests" />
              <label class="plan-count-input" :title="t('mealPolls.form.people')">
                <Users :size="15" />
                <input v-model.number="guestCountInput" type="number" min="1" max="20" :aria-label="t('mealPolls.form.people')" @keydown.enter.prevent="addGuests" />
              </label>
              <button type="button" class="btn btn-secondary" @click="addGuests">{{ t('common.add') }}</button>
            </div>
            <span class="field-hint">{{ t('mealPolls.form.peopleHint') }}</span>
            <ul class="plan-guest-list">
              <li v-for="(g, i) in editor.guests" :key="g.id ?? `new-${i}`" class="plan-guest">
                <span class="plan-guest-name">{{ g.name }}</span>
                <div class="plan-stepper" role="group" :aria-label="t('mealPolls.form.people')">
                  <button type="button" :disabled="g.count <= 1" :aria-label="t('mealPolls.form.less')" @click="g.count--">−</button>
                  <span>{{ t('mealPolls.peopleCount', { n: g.count }, g.count) }}</span>
                  <button type="button" :disabled="g.count >= 20" :aria-label="t('mealPolls.form.more')" @click="g.count++">+</button>
                </div>
                <button type="button" class="plan-guest-remove" :aria-label="t('common.delete')" @click="editor.guests.splice(i, 1)">×</button>
              </li>
            </ul>
            <p v-if="editor.guests.length" class="plans-muted">{{ t('mealPolls.form.totalPeople', { n: editorPeople }, editorPeople) }}</p>
          </div>

          <div class="form-group">
            <label class="form-label" for="poll-date">{{ t('mealPolls.form.dates') }}</label>
            <div class="plan-add-row">
              <input id="poll-date" v-model="dateInput" type="date" class="form-input" :min="store.todayStr" />
              <button type="button" class="btn btn-secondary" :disabled="!dateInput" @click="addDate">{{ t('common.add') }}</button>
            </div>
            <div class="plan-chips">
              <span v-for="(d, i) in editor.dates" :key="d" class="plan-chip">
                {{ shortDate(d) }}
                <button type="button" :aria-label="t('common.delete')" @click="editor.dates.splice(i, 1)">×</button>
              </span>
            </div>
            <span v-if="editor.id" class="field-hint">{{ t('mealPolls.form.datesHint') }}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="poll-note">{{ t('mealPolls.form.note') }}</label>
            <textarea id="poll-note" v-model="editor.note" class="form-input" rows="2" maxlength="500" :placeholder="t('mealPolls.form.notePlaceholder')"></textarea>
          </div>

          <p v-if="formError" class="plan-error">{{ formError }}</p>
          <div class="modal-footer plan-footer">
            <button type="button" class="btn btn-secondary" @click="editor = null">{{ t('common.cancel') }}</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? t('common.saving') : t('common.save') }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Choix de la date -->
    <div v-if="closing" class="modal-overlay" @click.self="closing = null">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ t('mealPolls.close.title') }}</h3>
          <button type="button" class="btn-close" :aria-label="t('common.close')" @click="closing = null">&times;</button>
        </div>
        <div class="plan-form">
          <div class="form-group">
            <label class="form-label">{{ t('mealPolls.close.date') }}</label>
            <label v-for="c in closing.poll.summary.perDate" :key="c.date" class="plan-radio">
              <input v-model="closing.date" type="radio" :value="c.date" @change="presetClosingGuests" />
              <span>{{ longDate(c.date) }}</span>
              <span class="plans-muted">✓ {{ c.yes }} · ~ {{ c.maybe }} · ✗ {{ c.no }}</span>
            </label>
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('mealPolls.close.guests') }} · {{ t('mealPolls.peopleCount', { n: closingPeople }, closingPeople) }}</label>
            <label v-for="g in closing.poll.guests" :key="g.id" class="plan-check">
              <input v-model="closing.guestIds" type="checkbox" :value="g.id" />
              <span>{{ g.name }}<template v-if="(g.count || 1) > 1"> · {{ t('mealPolls.peopleCount', { n: g.count }, g.count) }}</template></span>
            </label>
          </div>
          <label class="plan-check">
            <input v-model="closing.createGuests" type="checkbox" />
            <span>{{ t('mealPolls.close.createGuests', { slot: t(`mealPolls.slots.${closing.poll.slot}`).toLowerCase() }) }}</span>
          </label>
          <label class="plan-check">
            <input v-model="closing.createEvent" type="checkbox" />
            <span>{{ t('mealPolls.close.createEvent') }}</span>
          </label>
          <p class="plans-muted">{{ t('mealPolls.close.hint') }}</p>
          <p v-if="formError" class="plan-error">{{ formError }}</p>
          <div class="modal-footer plan-footer">
            <button type="button" class="btn btn-secondary" @click="closing = null">{{ t('common.cancel') }}</button>
            <button type="button" class="btn btn-primary" :disabled="saving || !closing.date" @click="confirmClosing">{{ t('mealPolls.close.confirm') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Repas à organiser : liste des sondages de dates (un par repas), partage du lien public de vote
// (WhatsApp…), résultats, puis choix de la date qui inscrit les invités au repas et crée un
// événement. Voir server/mealPolls/ et MealPollVoteView (page publique).
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, Plus, Copy, MessageCircle, Share2, Trash2, Edit3, CalendarCheck, RotateCcw, Users } from '@lucide/vue'
import { useFamilyStore } from '../stores/familyStore'
import { useConfirm } from '../composables/useConfirm'
import { escapeHtml } from '../utils/escapeHtml'
import { formatDate } from '../i18n/format'
import MealPollGrid from '../components/MealPollGrid.vue'

const { t } = useI18n()
const route = useRoute()
const store = useFamilyStore()
const { confirm } = useConfirm()

const slug = computed(() => route.params.familySlug)
const polls = ref([])
const loading = ref(true)
const openId = ref(null)
const editor = ref(null)
const closing = ref(null)
const guestInput = ref('')
const guestCountInput = ref(1)
const dateInput = ref('')
const saving = ref(false)
const formError = ref('')
const copiedId = ref(null)
const clampCount = (n) => Math.min(20, Math.max(1, Math.round(Number(n)) || 1))
const editorPeople = computed(() => (editor.value?.guests || []).reduce((n, g) => n + clampCount(g.count), 0))
const closingPeople = computed(() => {
  if (!closing.value) return 0
  const ids = new Set(closing.value.guestIds)
  return closing.value.poll.guests.filter(g => ids.has(g.id)).reduce((n, g) => n + clampCount(g.count), 0)
})
const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

const toDate = (d) => new Date(`${d}T00:00:00`)
const longDate = (d) => formatDate(toDate(d), { weekday: 'long', day: 'numeric', month: 'long' })
const shortDate = (d) => formatDate(toDate(d), { weekday: 'short', day: 'numeric', month: 'short' })

const api = async (path, options = {}) => {
  const res = await fetch(`/api/meal-polls${path}`, { ...options, headers: { ...store.getHeaders(), 'X-Family-Slug': slug.value } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || res.statusText)
  return body
}

const load = async () => {
  try {
    polls.value = await api('')
  } catch { /* liste vide */ } finally {
    loading.value = false
  }
}
onMounted(load)

const replacePoll = (updated) => {
  const i = polls.value.findIndex(p => p.id === updated.id)
  if (i === -1) polls.value.unshift(updated)
  else polls.value[i] = updated
}

// --- Partage ---
const voteUrl = (poll) => `${window.location.origin}/sondage/${poll.token}`
const shareText = (poll) => t('mealPolls.share.message', { title: poll.title, url: voteUrl(poll) })
const whatsappUrl = (poll) => `https://wa.me/?text=${encodeURIComponent(shareText(poll))}`
const copyLink = async (poll) => {
  try {
    await navigator.clipboard.writeText(voteUrl(poll))
    copiedId.value = poll.id
    setTimeout(() => { if (copiedId.value === poll.id) copiedId.value = null }, 2000)
  } catch { /* sélection manuelle possible */ }
}
const shareLink = async (poll) => {
  try { await navigator.share({ title: poll.title, text: shareText(poll) }) } catch { /* partage annulé */ }
}

// --- Création / modification ---
const openEditor = (poll = null) => {
  formError.value = ''
  guestInput.value = ''
  guestCountInput.value = 1
  dateInput.value = ''
  editor.value = poll
    ? { id: poll.id, title: poll.title, slot: poll.slot, note: poll.note, guests: poll.guests.map(g => ({ id: g.id, name: g.name, count: clampCount(g.count) })), dates: [...poll.dates] }
    : { id: null, title: '', slot: 'dinner', note: '', guests: [], dates: [] }
}

// « Mamie, Papi » : plusieurs lignes d'un coup, chacune avec le nombre de personnes choisi
// (« Les Dupont » × 2 : une seule réponse, deux couverts)
const addGuests = () => {
  const count = clampCount(guestCountInput.value)
  for (const name of guestInput.value.split(',').map(n => n.trim()).filter(Boolean)) {
    if (!editor.value.guests.some(g => g.name.toLowerCase() === name.toLowerCase())) editor.value.guests.push({ id: null, name, count })
  }
  guestInput.value = ''
  guestCountInput.value = 1
}

const addDate = () => {
  if (dateInput.value && !editor.value.dates.includes(dateInput.value)) {
    editor.value.dates = [...editor.value.dates, dateInput.value].sort()
  }
  dateInput.value = ''
}

const saveEditor = async () => {
  if (guestInput.value.trim()) addGuests()
  if (dateInput.value) addDate()
  saving.value = true
  formError.value = ''
  try {
    const { id, ...payload } = editor.value
    payload.guests = payload.guests.map(g => ({ ...(g.id != null ? { id: g.id } : {}), name: g.name, count: clampCount(g.count) }))
    const saved = await api(id ? `/${id}` : '', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) })
    replacePoll(saved)
    openId.value = saved.id
    editor.value = null
  } catch (err) {
    formError.value = err.message
  } finally {
    saving.value = false
  }
}

const remove = async (poll) => {
  const ok = await confirm({
    title: t('mealPolls.delete.title'),
    message: t('mealPolls.delete.message', { title: escapeHtml(poll.title) }),
    description: poll.status === 'closed' ? t('mealPolls.delete.keepsMeal') : t('common.irreversible'),
    confirmText: t('common.delete'),
    type: 'danger'
  })
  if (!ok) return
  await api(`/${poll.id}`, { method: 'DELETE' }).catch(() => {})
  polls.value = polls.value.filter(p => p.id !== poll.id)
}

// --- Choix de la date ---
const declinedOn = (poll, date) => new Set(poll.votes.filter(v => v.date === date && v.answer === 'no').map(v => v.guestId))
const presetClosingGuests = () => {
  const declined = declinedOn(closing.value.poll, closing.value.date)
  closing.value.guestIds = closing.value.poll.guests.filter(g => !declined.has(g.id)).map(g => g.id)
}

const openClosing = (poll) => {
  formError.value = ''
  closing.value = { poll, date: poll.summary.bestDate || poll.dates[0], guestIds: [], createGuests: true, createEvent: true }
  presetClosingGuests()
}

const confirmClosing = async () => {
  saving.value = true
  formError.value = ''
  try {
    const { poll, date, guestIds, createGuests, createEvent } = closing.value
    replacePoll(await api(`/${poll.id}/close`, { method: 'POST', body: JSON.stringify({ date, guestIds, createGuests, createEvent }) }))
    closing.value = null
    store.fetchAllData()
  } catch (err) {
    formError.value = err.message
  } finally {
    saving.value = false
  }
}

const reopen = async (poll) => {
  const ok = await confirm({
    title: t('mealPolls.reopen'),
    message: t('mealPolls.reopenMessage'),
    confirmText: t('mealPolls.reopen'),
    type: 'primary'
  })
  if (!ok) return
  try {
    replacePoll(await api(`/${poll.id}/reopen`, { method: 'POST' }))
    store.fetchAllData()
  } catch { /* état inchangé */ }
}
</script>

<style scoped>
.plans-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 900px;
}

.plans-header {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.plans-back {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--accent-primary);
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
}

.plans-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.plans-title-row h2 {
  margin: 0 0 0.25rem;
}

.plans-muted {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.88rem;
  line-height: 1.5;
}

.plans-new {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.plans-empty {
  padding: 2rem 1.5rem;
  text-align: center;
  color: var(--text-muted);
}

.plan-card {
  padding: 0;
  overflow: hidden;
}

.plan-card.closed {
  opacity: 0.9;
}

.plan-summary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: none;
  border: none;
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.plan-summary-main {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.plan-title {
  font-weight: 700;
  font-size: 1.02rem;
  overflow-wrap: anywhere;
}

.plan-meta {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.plan-chosen {
  color: var(--accent-primary);
}

.plan-status {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}

.plan-status.open {
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
}

.plan-status.closed {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.plan-detail {
  padding: 0 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.plan-note {
  margin: 0;
  white-space: pre-wrap;
  color: var(--text-secondary);
}

.plan-share {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.plan-link-row,
.plan-add-row {
  display: flex;
  gap: 0.5rem;
}

.plan-link-row input {
  flex: 1;
  min-width: 0;
  font-size: 0.82rem;
}

.plan-add-row input {
  flex: 1;
  min-width: 0;
}

.plan-link-row .btn,
.plan-share-actions .btn,
.plan-actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.plan-share-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.plan-whatsapp {
  background: #25d366;
  color: #fff;
  text-decoration: none;
}

.plan-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.plan-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.plan-slot-choice {
  display: flex;
  gap: 0.5rem;
}

.slot-chip {
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-weight: 600;
  cursor: pointer;
}

.slot-chip.selected {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: rgba(99, 102, 241, 0.1);
}

.plan-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.plan-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.4rem 0.3rem 0.7rem;
  border-radius: 999px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  font-size: 0.85rem;
  font-weight: 600;
}

.plan-chip button {
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 0.2rem;
}

.plan-radio,
.plan-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;
  flex-wrap: wrap;
  cursor: pointer;
}

.plan-check {
  flex-wrap: nowrap;
  align-items: flex-start;
}

.plan-check input {
  margin-top: 0.2rem;
  flex-shrink: 0;
}

.plan-radio span:first-of-type::first-letter {
  text-transform: uppercase;
}

.plan-count-input {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 10px);
  color: var(--text-muted);
}

.plan-count-input input {
  flex: none;
  width: 2.6rem;
  border: none;
  background: none;
  color: var(--text-primary);
  font-size: 0.95rem;
  text-align: center;
}

.plan-guest-list {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.plan-guest {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.4rem 0.35rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 10px);
  background: var(--bg-tertiary);
}

.plan-guest-name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.plan-stepper {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.plan-stepper button,
.plan-guest-remove {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary, var(--bg-primary));
  color: var(--text-secondary);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.plan-stepper button:disabled {
  opacity: 0.4;
  cursor: default;
}

.plan-guest-remove {
  border: none;
  background: none;
  color: var(--text-muted);
}

.plan-error {
  margin: 0;
  color: #dc2626;
}

.plan-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
