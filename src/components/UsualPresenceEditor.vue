<template>
  <div class="usual-presence-editor">
    <!-- Mode : simple ou personnalisé par jour -->
    <div class="mode-switch">
      <button
        type="button"
        class="mode-card"
        :class="{ active: config.mode === 'simple' }"
        :disabled="readonly"
        @click="setMode('simple')"
      >
        <CircleDot :size="18" />
        <strong>{{ t('presence.editor.simple') }}</strong>
        <span>{{ t('presence.editor.simpleDesc') }}</span>
      </button>
      <button
        type="button"
        class="mode-card"
        :class="{ active: config.mode === 'weekly' }"
        :disabled="readonly"
        @click="setMode('weekly')"
      >
        <CalendarRange :size="18" />
        <strong>{{ t('presence.editor.custom') }}</strong>
        <span>{{ t('presence.editor.customDesc') }}</span>
      </button>
    </div>

    <!-- MODE SIMPLE -->
    <div v-if="config.mode === 'simple'" class="form-group simple-block">
      <label class="form-label">{{ t('profile.usualPresence') }}</label>
      <select
        class="form-select"
        :value="config.simple"
        :disabled="readonly"
        @change="setSimple($event.target.value)"
      >
        <option value="present">🟢 {{ t('presence.editor.usuallyPresentOption') }}</option>
        <option value="absent">⚪ {{ t('presence.editor.usuallyAbsentOption') }}</option>
      </select>
      <span class="help-subtext">
        {{ subject === 'self' ? t('presence.editor.helpSelf') : t('presence.editor.helpMember') }}
      </span>
    </div>

    <!-- MODE PERSONNALISÉ -->
    <div v-else class="weekly-editor">
      <!-- Alternance A/B -->
      <button
        type="button"
        class="alternating-toggle"
        :class="{ active: config.alternating }"
        :disabled="readonly"
        @click="toggleAlternating"
      >
        <input type="checkbox" :checked="config.alternating" tabindex="-1" class="slot-toggle-check" />
        <span class="alternating-text">
          <strong>{{ t('presence.editor.alternate') }}</strong>
          <span class="help-subtext">{{ t('presence.editor.alternateDesc') }}</span>
        </span>
      </button>

      <!-- Onglets Semaine A / Semaine B -->
      <div v-if="config.alternating" class="week-tabs">
        <button
          v-for="w in ['A', 'B']"
          :key="w"
          type="button"
          class="week-tab"
          :class="{ active: activeWeek === w }"
          @click="activeWeek = w"
        >
          {{ t('presence.editor.weekTab', { week: w }) }}
          <span v-if="currentPhase === w" class="week-tab-badge">{{ t('presence.editor.current') }}</span>
        </button>
      </div>

      <!-- Grille 7 jours × 3 créneaux.
           Le même DOM sert aux deux mises en page : tableau créneaux × jours sur écran large,
           liste par jour sur mobile (bascule purement CSS, voir la media query plus bas). -->
      <div class="presence-grid" role="group" :aria-label="t('presence.editor.gridLabel', { week: activeWeek })">
        <span class="grid-corner"></span>

        <button
          v-for="day in DAY_KEYS"
          :key="`h-${day}`"
          type="button"
          class="grid-head grid-head-day"
          :disabled="readonly"
          :title="t('presence.editor.toggleDay', { day: dayLabel(day) })"
          @click="toggleDay(day)"
        >
          {{ dayShortLabel(day) }}
        </button>

        <template v-for="slot in SLOT_KEYS" :key="slot">
          <button
            type="button"
            class="grid-head grid-head-slot"
            :disabled="readonly"
            :title="t('presence.editor.toggleSlot', { slot: slotLabel(slot) })"
            @click="toggleSlot(slot)"
          >
            <component :is="SLOT_ICONS[slot]" :size="16" :style="{ color: SLOT_COLORS[slot] }" />
            <span>{{ slotLabel(slot) }}</span>
          </button>

          <button
            v-for="day in DAY_KEYS"
            :key="`${day}-${slot}`"
            type="button"
            class="grid-cell"
            :class="{ on: activeGrid[day][slot] }"
            :disabled="readonly"
            :aria-pressed="activeGrid[day][slot]"
            :aria-label="`${dayLabel(day)} ${slotInlineLabel(slot)} : ${activeGrid[day][slot] ? t('presence.editor.cellPresent') : t('presence.editor.cellAbsent')}`"
            @click="toggleCell(day, slot)"
          >
            <span class="grid-cell-day">{{ dayShortLabel(day) }}</span>
            <Check v-if="activeGrid[day][slot]" :size="15" />
            <Minus v-else :size="15" />
          </button>
        </template>
      </div>

      <!-- Préréglages -->
      <div v-if="!readonly" class="presets">
        <button type="button" class="btn btn-secondary btn-sm" @click="applyPreset('all')">{{ t('presence.editor.presetAll') }}</button>
        <button type="button" class="btn btn-secondary btn-sm" @click="applyPreset('none')">{{ t('presence.editor.presetNone') }}</button>
        <button type="button" class="btn btn-secondary btn-sm" @click="applyPreset('no-weekday-lunch')">{{ t('presence.editor.presetNoWeekdayLunch') }}</button>
        <button type="button" class="btn btn-secondary btn-sm" @click="applyPreset('weekend')">{{ t('presence.editor.presetWeekend') }}</button>
        <button v-if="config.alternating" type="button" class="btn btn-secondary btn-sm" @click="copyAToB">{{ t('presence.editor.copyAB') }}</button>
        <button v-if="config.alternating" type="button" class="btn btn-secondary btn-sm" @click="swapWeeks">{{ t('presence.editor.swapAB') }}</button>
      </div>
    </div>

    <p class="presence-summary">{{ summary }}</p>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { BedDouble, CalendarRange, Check, CircleDot, Minus, Sun, Sunset } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import {
  DAY_KEYS,
  SLOT_KEYS,
  fullGrid,
  normalizeUsualPresenceConfig,
  weekPhaseFor
} from '@shared/presence.js'
import { dayLabel, dayShortLabel, slotLabel, slotInlineLabel, describePresence } from '../i18n/presence'

const props = defineProps({
  modelValue: { type: Object, default: null },
  // Valeur de repli quand modelValue est absent (membre créé avant la grille hebdomadaire).
  legacyUsualPresence: { type: String, default: 'present' },
  weekAnchor: { type: String, default: null },
  // Date servant à indiquer quelle semaine (A ou B) est « en cours ».
  today: { type: String, default: null },
  readonly: { type: Boolean, default: false },
  // Décrit le sujet dans les textes d'aide : soi-même ou un autre membre.
  subject: { type: String, default: 'self' }
})

const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()

const SLOT_ICONS = { lunch: Sun, dinner: Sunset, night: BedDouble }
// Les trois couleurs de créneau sont constantes dans toute l'app (calendrier, repas, présence).
const SLOT_COLORS = { lunch: '#f59e0b', dinner: '#6366f1', night: '#10b981' }

const config = computed(() => normalizeUsualPresenceConfig(props.modelValue, props.legacyUsualPresence))

const activeWeek = ref('A')
// Une grille B masquée ne doit pas rester sélectionnée quand on désactive l'alternance.
watch(() => config.value.alternating, (on) => { if (!on) activeWeek.value = 'A' })

const currentPhase = computed(() =>
  props.today ? weekPhaseFor(props.today, props.weekAnchor || undefined) : null
)

const activeGrid = computed(() => (activeWeek.value === 'B' ? config.value.weekB : config.value.weekA))

const summary = computed(() =>
  describePresence(config.value, props.today, props.weekAnchor || undefined)
)

// Toute modification republie une config complète : le composant est entièrement contrôlé et ne
// garde aucun état de présence en propre (seul l'onglet A/B affiché est local).
const commit = (patch) => {
  if (props.readonly) return
  emit('update:modelValue', { ...config.value, ...patch })
}

const withActiveGrid = (grid) =>
  commit(activeWeek.value === 'B' ? { weekB: grid } : { weekA: grid })

const cloneGrid = (grid) =>
  Object.fromEntries(DAY_KEYS.map(d => [d, { ...grid[d] }]))

const setMode = (mode) => commit({ mode })

const setSimple = (simple) => {
  // En mode simple, on aligne aussi les grilles : si la personne passe ensuite en mode
  // personnalisé, elle part de son habitude actuelle plutôt que d'un « tout présent ».
  const grid = fullGrid(simple !== 'absent')
  commit({ simple, weekA: grid, weekB: grid })
}

const toggleAlternating = () => {
  const next = !config.value.alternating
  // À l'activation, B part d'une copie de A : on ajuste ensuite ce qui diffère.
  commit(next ? { alternating: true, weekB: cloneGrid(config.value.weekA) } : { alternating: false })
}

const toggleCell = (day, slot) => {
  const grid = cloneGrid(activeGrid.value)
  grid[day][slot] = !grid[day][slot]
  withActiveGrid(grid)
}

// Un en-tête bascule toute sa ligne ou toute sa colonne : « jamais le midi » en un clic.
// Si tout est déjà coché, on décoche ; sinon on coche tout.
const toggleDay = (day) => {
  const grid = cloneGrid(activeGrid.value)
  const next = !SLOT_KEYS.every(s => grid[day][s])
  for (const s of SLOT_KEYS) grid[day][s] = next
  withActiveGrid(grid)
}

const toggleSlot = (slot) => {
  const grid = cloneGrid(activeGrid.value)
  const next = !DAY_KEYS.every(d => grid[d][slot])
  for (const d of DAY_KEYS) grid[d][slot] = next
  withActiveGrid(grid)
}

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri']

const applyPreset = (preset) => {
  let grid
  if (preset === 'all') grid = fullGrid(true)
  else if (preset === 'none') grid = fullGrid(false)
  else if (preset === 'no-weekday-lunch') {
    grid = fullGrid(true)
    for (const d of WEEKDAYS) grid[d].lunch = false
  } else if (preset === 'weekend') {
    grid = fullGrid(false)
    for (const d of ['sat', 'sun']) for (const s of SLOT_KEYS) grid[d][s] = true
  }
  if (grid) withActiveGrid(grid)
}

const copyAToB = () => commit({ weekB: cloneGrid(config.value.weekA) })

const swapWeeks = () => commit({
  weekA: cloneGrid(config.value.weekB),
  weekB: cloneGrid(config.value.weekA)
})
</script>

<style scoped>
.usual-presence-editor {
  display: flex;
  flex-direction: column;
}

/* --- Sélecteur de mode --- */
.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.65rem;
}

.mode-card {
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.75rem 0.6rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  cursor: pointer;
  text-align: center;
  color: var(--text-primary);
  font: inherit;
  transition: all var(--transition-fast);
}

.mode-card:hover:not(:disabled) {
  border-color: var(--accent-primary);
  transform: translateY(-2px);
}

.mode-card.active {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-primary);
}

.mode-card:disabled {
  cursor: default;
  opacity: 0.7;
}

.mode-card span {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.help-subtext {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.35rem;
}

.simple-block {
  margin-top: 1rem;
  margin-bottom: 0;
}

/* --- Alternance --- */
.weekly-editor {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: 1rem;
}

.alternating-toggle {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.7rem 0.8rem;
  cursor: pointer;
  text-align: left;
  color: var(--text-primary);
  font: inherit;
  transition: all var(--transition-fast);
}

.alternating-toggle:hover:not(:disabled) { border-color: var(--accent-primary); }
.alternating-toggle.active {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary);
}
.alternating-toggle:disabled { cursor: default; opacity: 0.7; }

.alternating-text { display: flex; flex-direction: column; }
.alternating-text .help-subtext { margin-top: 0.15rem; }

.week-tabs {
  display: flex;
  gap: 0.4rem;
}

.week-tab {
  flex: 1;
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.5rem 0.6rem;
  cursor: pointer;
  color: var(--text-secondary);
  font: inherit;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  transition: all var(--transition-fast);
}

.week-tab.active {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary);
  color: var(--text-primary);
}

.week-tab-badge {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  background: var(--accent-secondary);
  color: #fff;
  border-radius: var(--radius-full);
  padding: 0.1rem 0.4rem;
}

/* --- Grille : tableau créneaux (lignes) × jours (colonnes) sur écran large --- */
.presence-grid {
  display: grid;
  grid-template-columns: auto repeat(7, minmax(0, 1fr));
  gap: 0.3rem;
  align-items: stretch;
}

.grid-corner { display: block; }

.grid-head {
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.3rem 0.35rem;
  transition: all var(--transition-fast);
}

.grid-head:hover:not(:disabled) {
  background: var(--bg-tertiary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

.grid-head:disabled { cursor: default; }

.grid-head-slot {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  justify-content: flex-start;
  white-space: nowrap;
  padding-right: 0.6rem;
}

.grid-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.grid-cell:hover:not(:disabled) { border-color: var(--accent-primary); }
.grid-cell:disabled { cursor: default; }

.grid-cell.on {
  background: var(--accent-secondary-light);
  border-color: var(--accent-secondary);
  color: var(--accent-secondary);
}

/* Le libellé du jour n'apparaît que dans la mise en page mobile (liste par jour). */
.grid-cell-day { display: none; }

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.presence-summary {
  margin: 0.85rem 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-style: italic;
}

/*
  Sous 720 px, 7 colonnes donneraient des cases de moins de 40 px, intappables. On replie donc
  la grille en blocs par créneau : un en-tête pleine largeur (Midi / Soir / Nuit) suivi des 7
  jours sur 4 colonnes. Même DOM, bascule purement CSS — d'où l'ordre créneau-majeur plutôt que
  jour-majeur, qu'une grille CSS ne peut pas produire sans dupliquer le markup. Chaque case
  porte alors son propre libellé de jour, et les en-têtes de colonne deviennent inutiles.
*/
@media (max-width: 719px) {
  .presence-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .grid-corner,
  .grid-head-day {
    display: none;
  }

  .grid-head-slot {
    grid-column: 1 / -1;
    justify-content: center;
    margin-top: 0.4rem;
    border-bottom: 1px solid var(--border-color);
    border-radius: 0;
  }

  .grid-cell {
    flex-direction: column;
    gap: 0.1rem;
    min-height: 48px;
  }

  .grid-cell-day {
    display: block;
    font-size: 0.65rem;
    font-weight: 600;
  }

  .mode-switch {
    grid-template-columns: 1fr;
  }
}
</style>
