<template>
  <div class="platform-stats">
    <div class="stats-tiles">
      <div class="stats-tile">
        <span class="stats-value">{{ stats ? stats.activeFamilies : '–' }}<small v-if="stats"> / {{ stats.families }}</small></span>
        <span class="stats-label">{{ t('superAdmin.stats.activeFamilies') }}</span>
      </div>
      <div class="stats-tile">
        <span class="stats-value">{{ stats ? stats.activeUsers30 : '–' }}<small v-if="stats"> / {{ stats.users }}</small></span>
        <span class="stats-label">{{ t('superAdmin.stats.activeUsers') }}</span>
      </div>
      <div class="stats-tile">
        <span class="stats-value">{{ stats ? formatNumber(stats.created30) : '–' }}</span>
        <span class="stats-label">{{ t('superAdmin.stats.created30') }}</span>
      </div>
      <div class="stats-tile">
        <span class="stats-value">{{ stats ? formatNumber(assistantTotal) : '–' }}</span>
        <span class="stats-label">{{ t('superAdmin.stats.assistants30') }}</span>
        <span v-if="stats" class="stats-sub">🎙️ {{ stats.assistants30?.voice || 0 }} · Alexa {{ stats.assistants30?.alexa || 0 }} · Claude {{ stats.assistants30?.mcp || 0 }}</span>
      </div>
    </div>

    <div v-if="stats" class="stats-weekly">
      <div class="stats-weekly-header">
        <span>{{ t('superAdmin.stats.weeklyTitle') }}</span>
        <span class="stats-muted">{{ t('superAdmin.stats.weeklyHint') }}</span>
      </div>
      <div class="stats-bars" role="img" :aria-label="t('superAdmin.stats.weeklyTitle')">
        <div v-for="week in stats.weekly" :key="week.weekStart" class="stats-bar-col" :title="t('superAdmin.stats.weekTooltip', { date: shortDate(week.weekStart), n: week.count }, week.count)">
          <span class="stats-bar-value">{{ week.count || '' }}</span>
          <span class="stats-bar" :style="{ height: `${barHeight(week.count)}%` }" />
          <span class="stats-bar-label">{{ shortDate(week.weekStart) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Vue d'ensemble de l'utilisation de la plateforme (en haut de l'onglet Familles de la console) :
// familles et utilisateurs actifs, éléments créés sur 30 jours, activité des 12 dernières semaines.
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/authStore'
import { formatDate, formatNumber } from '../i18n/format'

const { t } = useI18n()
const authStore = useAuthStore()
const stats = ref(null)

const assistantTotal = computed(() => Object.values(stats.value?.assistants30 || {}).reduce((sum, n) => sum + n, 0))
const maxWeek = computed(() => Math.max(1, ...(stats.value?.weekly || []).map(w => w.count)))
const barHeight = (count) => (count ? Math.max(4, Math.round((count / maxWeek.value) * 100)) : 0)
const shortDate = (value) => formatDate(new Date(value), { day: 'numeric', month: 'short' })

const load = async () => {
  try {
    const res = await fetch('/api/super-admin/stats', { headers: { Authorization: `Bearer ${authStore.token}` } })
    if (res.ok) stats.value = await res.json()
  } catch { /* tuiles laissées vides */ }
}

onMounted(load)
defineExpose({ reload: load })
</script>

<style scoped>
.platform-stats {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.stats-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.stats-tile,
.stats-weekly {
  padding: 1rem 1.2rem;
  border-radius: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.stats-tile {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.stats-value {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--text-primary);
}

.stats-value small {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-muted);
}

.stats-sub {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.stats-label,
.stats-muted {
  font-size: 0.82rem;
  color: var(--text-muted);
}

.stats-weekly-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.92rem;
  margin-bottom: 0.8rem;
}

.stats-weekly-header .stats-muted {
  font-weight: 400;
}

.stats-bars {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 0.35rem;
  height: 140px;
  align-items: end;
}

.stats-bar-col {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 0.2rem;
  min-width: 0;
}

.stats-bar {
  width: 100%;
  max-width: 34px;
  border-radius: 6px 6px 2px 2px;
  background: linear-gradient(180deg, #8b5cf6, #6366f1);
}

.stats-bar-value {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.stats-bar-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  max-width: 100%;
}

/* Téléphone : trois tuiles compactes sur une ligne, dates des semaines une sur trois */
@media (max-width: 600px) {
  .stats-tiles {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .stats-tile {
    padding: 0.7rem 0.6rem;
  }

  .stats-value {
    font-size: 1.25rem;
  }

  .stats-value small {
    font-size: 0.75rem;
  }

  .stats-label {
    font-size: 0.7rem;
    line-height: 1.3;
  }

  .stats-bar-value {
    font-size: 0.6rem;
  }

  .stats-bar-col:not(:nth-child(3n + 1)) .stats-bar-label {
    visibility: hidden;
  }

  .stats-bar-label {
    overflow: visible;
  }
}
</style>
