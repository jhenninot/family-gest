<template>
  <div class="poll-grid-wrap" data-no-screen-swipe>
    <table class="poll-grid">
      <thead>
        <tr>
          <th class="poll-name-col"></th>
          <th
            v-for="d in poll.dates"
            :key="d"
            :class="{ best: d === bestDate, chosen: d === poll.chosenDate }"
          >
            <span class="poll-day">{{ weekday(d) }}</span>
            <span class="poll-date">{{ dayMonth(d) }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="g in poll.guests" :key="g.id" :class="{ mine: g.id === highlightGuestId }">
          <th class="poll-name-col" scope="row">
            <span>{{ g.name }}<span v-if="(g.count || 1) > 1" class="poll-count"> ×{{ g.count }}</span></span>
            <span v-if="g.comment" class="poll-comment" :title="g.comment">💬 {{ g.comment }}</span>
          </th>
          <td v-for="d in poll.dates" :key="d" :class="['cell', answerOf(g.id, d) || 'none', { chosen: d === poll.chosenDate, editable }]">
            <button v-if="editable" type="button" class="cell-btn" :title="t('mealPolls.editVote', { name: g.name })" :aria-label="`${g.name} : ${t(`mealPolls.answers.${answerOf(g.id, d) || 'none'}`)}`" @click="emit('vote', { guestId: g.id, date: d, answer: nextAnswer(answerOf(g.id, d)) })">{{ ICONS[answerOf(g.id, d) || 'none'] }}</button>
            <span v-else :aria-label="t(`mealPolls.answers.${answerOf(g.id, d) || 'none'}`)">{{ ICONS[answerOf(g.id, d) || 'none'] }}</span>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th class="poll-name-col">{{ t('mealPolls.total') }}</th>
          <td v-for="c in counts" :key="c.date" :class="{ best: c.date === bestDate, chosen: c.date === poll.chosenDate }">
            <strong>{{ c.yes }}</strong><span v-if="c.maybe" class="poll-maybe"> +{{ c.maybe }}</span>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup>
// Tableau des disponibilités d'un repas à organiser : une ligne par invité, une colonne par date
// proposée (✓ oui, ~ si besoin, ✗ non), et le décompte en bas ; la meilleure date est surlignée.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDate } from '../i18n/format'

const props = defineProps({
  poll: { type: Object, required: true },
  highlightGuestId: { type: Number, default: null },
  // Les membres de la famille peuvent cocher les cases à la place des invités
  editable: { type: Boolean, default: false }
})
const emit = defineEmits(['vote'])

// Un clic fait défiler : pas de réponse → oui → si besoin → non → pas de réponse
const CYCLE = [null, 'yes', 'maybe', 'no']
const nextAnswer = (current) => CYCLE[(CYCLE.indexOf(current || null) + 1) % CYCLE.length]

const { t } = useI18n()
const ICONS = { yes: '✓', maybe: '~', no: '✗', none: '·' }

const answers = computed(() => new Map((props.poll.votes || []).map(v => [`${v.guestId}|${v.date}`, v.answer])))
const answerOf = (guestId, date) => answers.value.get(`${guestId}|${date}`)

// Totaux en personnes : une ligne « couple » (× 2) compte deux couverts
const sizes = computed(() => new Map(props.poll.guests.map(g => [g.id, Math.max(1, Number(g.count) || 1)])))
const counts = computed(() => props.poll.dates.map(date => {
  const votes = (props.poll.votes || []).filter(v => v.date === date)
  const people = (answer) => votes.filter(v => v.answer === answer).reduce((n, v) => n + (sizes.value.get(v.guestId) || 1), 0)
  return { date, yes: people('yes'), maybe: people('maybe') }
}))
const bestDate = computed(() => props.poll.summary?.bestDate || null)

const toDate = (d) => new Date(`${d}T00:00:00`)
const weekday = (d) => formatDate(toDate(d), { weekday: 'short' }).replace(/\.$/, '')
const dayMonth = (d) => formatDate(toDate(d), { day: 'numeric', month: 'short' }).replace(/\.$/, '')
</script>

<style scoped>
.poll-grid-wrap {
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 10px);
}

.poll-grid {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.88rem;
}

.poll-grid th,
.poll-grid td {
  padding: 0.5rem 0.6rem;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
}

.poll-grid thead th {
  background: var(--bg-tertiary);
  font-weight: 600;
}

.poll-day,
.poll-date {
  display: block;
  line-height: 1.2;
}

.poll-day {
  font-size: 0.72rem;
  text-transform: uppercase;
  color: var(--text-muted);
}

.poll-name-col {
  text-align: left !important;
  position: sticky;
  left: 0;
  background: var(--bg-secondary, var(--bg-primary));
  z-index: 1;
  max-width: 11rem;
  white-space: normal !important;
}

.poll-name-col span {
  display: block;
}

.poll-count {
  display: inline !important;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--accent-primary);
}

.poll-comment {
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

tr.mine .poll-name-col {
  color: var(--accent-primary);
}

.cell.yes { color: #059669; background: rgba(16, 185, 129, 0.1); font-weight: 700; }
.cell.maybe { color: #b45309; background: rgba(245, 158, 11, 0.12); font-weight: 700; }
.cell.no { color: #dc2626; background: rgba(239, 68, 68, 0.08); }
.cell.none { color: var(--text-muted); }

.cell.editable { padding: 0; }

.cell-btn {
  display: block;
  width: 100%;
  min-width: 2.75rem;
  min-height: 2.5rem;
  padding: 0.5rem 0.6rem;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.cell-btn:hover,
.cell-btn:focus-visible { background: rgba(127, 127, 127, 0.15); }

.poll-grid .best {
  box-shadow: inset 0 -3px 0 #10b981;
}

.poll-grid .chosen {
  outline: 2px solid var(--accent-primary);
  outline-offset: -2px;
}

.poll-grid tfoot td,
.poll-grid tfoot th {
  border-bottom: none;
}

.poll-maybe {
  color: #b45309;
  font-size: 0.8rem;
}
</style>
