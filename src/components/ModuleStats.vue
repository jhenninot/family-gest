<template>
  <div class="module-stats">
    <div class="module-stats-header">
      <span>{{ t('superAdmin.stats.byModuleTitle') }}</span>
      <span class="module-muted">{{ t('superAdmin.stats.byModuleHint') }}</span>
    </div>

    <div class="module-table" role="table">
      <div class="module-row module-head" role="row">
        <span role="columnheader">{{ t('superAdmin.stats.colModule') }}</span>
        <span role="columnheader" class="module-bar-cell" />
        <span role="columnheader" class="num">{{ t('superAdmin.stats.colCount') }}</span>
        <span role="columnheader" class="num">{{ t('superAdmin.stats.colTrend') }}</span>
        <span role="columnheader" class="num">{{ t('superAdmin.stats.colFamilies') }}</span>
      </div>

      <template v-for="group in groups" :key="group.key">
        <div class="module-group" role="row">
          <span role="cell">{{ t(`superAdmin.stats.groups.${group.key}`) }}</span>
        </div>
        <div v-for="row in group.rows" :key="row.key" class="module-row" role="row">
          <span role="cell" class="module-name">
            {{ row.icon }} {{ t(`superAdmin.stats.${group.key === 'assistants' ? 'assistants' : 'modules'}.${row.key}`) }}
            <small v-if="row.connected !== undefined" class="module-muted">{{ t('superAdmin.stats.connectedCount', { n: row.connected }, row.connected) }}</small>
          </span>
          <span role="cell" class="module-bar-cell">
            <span class="module-track"><span class="module-bar" :class="group.key" :style="{ width: `${barWidth(row.count30, group.max)}%` }" /></span>
          </span>
          <span role="cell" class="num strong">{{ formatNumber(row.count30) }}</span>
          <span role="cell" class="num trend" :class="trend(row).kind">{{ trend(row).label }}</span>
          <span role="cell" class="num">
            {{ row.families30 }} / {{ activeFamilies }}
            <small class="module-muted">{{ adoption(row.families30) }}</small>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
// Utilisation globale par module et par assistant (vue d'ensemble de la console Super Admin) :
// éléments créés ou commandes sur 30 jours, tendance par rapport aux 30 jours précédents et
// nombre de familles qui s'en servent. Données : byModule de GET /api/super-admin/stats.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatNumber } from '../i18n/format'

const props = defineProps({
  byModule: { type: Object, required: true },
  activeFamilies: { type: Number, default: 0 }
})
const { t } = useI18n()

const MODULES = [
  { key: 'presence', icon: '🏠' },
  { key: 'meals', icon: '🍽️' },
  { key: 'mealPlans', icon: '🗳️' },
  { key: 'shopping', icon: '🛒' },
  { key: 'tasks', icon: '✅' },
  { key: 'calendar', icon: '📅' }
]
const ASSISTANTS = [
  { key: 'voice', icon: '🎙️' },
  { key: 'alexa', icon: '🔵' },
  { key: 'mcp', icon: '✳️' }
]

const build = (list, source) => list.map(item => ({ ...item, count30: 0, previous30: 0, families30: 0, ...(source?.[item.key] || {}) }))
const groups = computed(() => [
  { key: 'modules', rows: build(MODULES, props.byModule.modules) },
  { key: 'assistants', rows: build(ASSISTANTS, props.byModule.assistants) }
].map(g => ({ ...g, max: Math.max(1, ...g.rows.map(r => r.count30)) })))

const barWidth = (count, max) => (count ? Math.max(2, Math.round((count / max) * 100)) : 0)

const trend = (row) => {
  if (!row.previous30 && !row.count30) return { kind: 'flat', label: '–' }
  if (!row.previous30) return { kind: 'up', label: t('superAdmin.stats.trendNew') }
  const pct = Math.round(((row.count30 - row.previous30) / row.previous30) * 100)
  if (pct === 0) return { kind: 'flat', label: '=' }
  return { kind: pct > 0 ? 'up' : 'down', label: `${pct > 0 ? '+' : ''}${pct} %` }
}

const adoption = (families) => (props.activeFamilies ? `${Math.round((families / props.activeFamilies) * 100)} %` : '')
</script>

<style scoped>
.module-stats {
  padding: 1rem 1.2rem;
  border-radius: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.module-stats-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.92rem;
  margin-bottom: 0.6rem;
}

.module-muted {
  font-size: 0.78rem;
  font-weight: 400;
  color: var(--text-muted);
}

.module-row {
  display: grid;
  grid-template-columns: minmax(10rem, 1.3fr) 2fr 4.5rem 5rem 6.5rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.88rem;
}

.module-head {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.module-group {
  padding: 0.8rem 0 0.2rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--accent-primary);
}

.module-name {
  min-width: 0;
}

.module-name small {
  display: block;
}

.num {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.strong {
  font-weight: 800;
}

.module-track {
  display: block;
  height: 10px;
  border-radius: 999px;
  background: var(--bg-tertiary);
  overflow: hidden;
}

.module-bar {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
}

.module-bar.assistants {
  background: linear-gradient(90deg, #0ea5e9, #38bdf8);
}

.trend {
  font-weight: 700;
}

.trend.up { color: #059669; }
.trend.down { color: #dc2626; }
.trend.flat { color: var(--text-muted); }

/* Téléphone : la barre passe sous le nom */
@media (max-width: 700px) {
  .module-stats {
    padding: 0.9rem 0.8rem;
  }

  .module-row {
    grid-template-columns: minmax(0, 1fr) 2.6rem 3.9rem 3.4rem;
    gap: 0.4rem;
    font-size: 0.8rem;
  }

  .module-head {
    font-size: 0.6rem;
    letter-spacing: 0;
  }

  .module-bar-cell {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .module-head .module-bar-cell {
    display: none;
  }
}
</style>
