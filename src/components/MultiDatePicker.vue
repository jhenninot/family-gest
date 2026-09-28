<template>
  <div class="mdp" data-no-screen-swipe>
    <div class="mdp-header">
      <button type="button" class="mdp-nav" :disabled="!canGoBack" :aria-label="t('calendar.prevMonth')" @click="shift(-1)">
        <ChevronLeft :size="18" />
      </button>
      <span class="mdp-month">{{ monthLabel }}</span>
      <button type="button" class="mdp-nav" :aria-label="t('calendar.nextMonth')" @click="shift(1)">
        <ChevronRight :size="18" />
      </button>
    </div>
    <div class="mdp-grid" role="group" :aria-label="monthLabel">
      <span v-for="name in weekdays" :key="name" class="mdp-weekday">{{ name }}</span>
      <span v-for="n in leading" :key="`pad-${n}`" aria-hidden="true"></span>
      <button
        v-for="day in days"
        :key="day.date"
        type="button"
        class="mdp-day"
        :class="{ selected: day.selected, today: day.date === today, busy: day.busy }"
        :disabled="day.disabled"
        :aria-pressed="day.selected"
        :aria-label="day.label"
        :data-date="day.date"
        :title="day.busy ? t('mealPolls.form.busyDay') : null"
        @click="toggle(day.date)"
      >
        {{ day.num }}
      </button>
    </div>
  </div>
</template>

<script setup>
// Calendrier d'un mois où l'on coche/décoche plusieurs jours d'un geste (dates proposées d'un repas
// à organiser). Les jours déjà occupés (isBusy) portent un point ; les jours passés sont grisés.
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { formatDate, weekdayNames } from '../i18n/format'

const props = defineProps({
  modelValue: { type: Array, default: () => [] }, // AAAA-MM-JJ
  min: { type: String, default: '' },
  today: { type: String, default: '' },
  isBusy: { type: Function, default: () => false }
})
const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()

const pad = (n) => String(n).padStart(2, '0')
const start = props.modelValue[0] || props.min || props.today || new Date().toISOString().slice(0, 10)
const year = ref(Number(start.slice(0, 4)))
const month = ref(Number(start.slice(5, 7)) - 1)

const weekdays = computed(() => weekdayNames('narrow'))
const monthLabel = computed(() => {
  const label = formatDate(new Date(year.value, month.value, 1), { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
})
const leading = computed(() => (new Date(year.value, month.value, 1).getDay() + 6) % 7)
const canGoBack = computed(() => !props.min || `${year.value}-${pad(month.value + 1)}` > props.min.slice(0, 7))

const days = computed(() => {
  const count = new Date(year.value, month.value + 1, 0).getDate()
  const selected = new Set(props.modelValue)
  return Array.from({ length: count }, (_, i) => {
    const date = `${year.value}-${pad(month.value + 1)}-${pad(i + 1)}`
    return {
      date,
      num: i + 1,
      selected: selected.has(date),
      disabled: Boolean(props.min) && date < props.min && !selected.has(date),
      busy: props.isBusy(date),
      label: formatDate(new Date(year.value, month.value, i + 1), { weekday: 'long', day: 'numeric', month: 'long' })
    }
  })
})

const shift = (delta) => {
  const d = new Date(year.value, month.value + delta, 1)
  year.value = d.getFullYear()
  month.value = d.getMonth()
}

const toggle = (date) => {
  const list = props.modelValue.includes(date)
    ? props.modelValue.filter(d => d !== date)
    : [...props.modelValue, date].sort()
  emit('update:modelValue', list)
}
</script>

<style scoped>
.mdp {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 10px);
  padding: 0.6rem;
  max-width: 340px;
}

.mdp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.mdp-month {
  font-weight: 700;
}

.mdp-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
}

.mdp-nav:disabled {
  opacity: 0.35;
  cursor: default;
}

.mdp-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.2rem;
}

.mdp-weekday {
  text-align: center;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  padding-bottom: 0.2rem;
}

.mdp-day {
  position: relative;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1px solid transparent;
  background: none;
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
}

.mdp-day:hover:not(:disabled) {
  border-color: var(--accent-primary);
}

.mdp-day.today {
  font-weight: 800;
  border-color: var(--border-color);
}

.mdp-day.selected {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #fff;
  font-weight: 700;
}

.mdp-day.busy::after {
  content: '';
  position: absolute;
  bottom: 12%;
  left: 50%;
  width: 5px;
  height: 5px;
  margin-left: -2.5px;
  border-radius: 50%;
  background: #f59e0b;
}

.mdp-day:disabled {
  color: var(--text-muted);
  opacity: 0.4;
  cursor: default;
}
</style>
