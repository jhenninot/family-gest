<template>
  <div class="usage-detail">
    <div class="usage-facts">
      <div class="usage-fact">
        <span class="usage-fact-value">{{ family.activeMembers7 }} / {{ family.memberCount }}</span>
        <span class="usage-fact-label">{{ t('superAdmin.stats.active7') }}</span>
      </div>
      <div class="usage-fact">
        <span class="usage-fact-value">{{ family.activeMembers30 }} / {{ family.memberCount }}</span>
        <span class="usage-fact-label">{{ t('superAdmin.stats.active30') }}</span>
      </div>
      <div class="usage-fact">
        <span class="usage-fact-value">{{ family.lastActivityAt ? formatRelative(family.lastActivityAt) : t('superAdmin.stats.never') }}</span>
        <span class="usage-fact-label">{{ t('superAdmin.stats.lastActivity') }}</span>
      </div>
      <div class="usage-fact" :class="{ warn: family.pendingInvitations > 0 }">
        <span class="usage-fact-value">{{ family.pendingInvitations }}</span>
        <span class="usage-fact-label">
          {{ t('superAdmin.stats.pendingInvitations') }}
          <template v-if="family.oldestPendingInvitationAt"> · {{ t('superAdmin.stats.oldestInvitation', { age: formatRelative(family.oldestPendingInvitationAt) }) }}</template>
        </span>
      </div>
      <div class="usage-fact" :class="{ warn: quotaRatio >= 0.9 }">
        <span class="usage-fact-value">{{ Math.round(quotaRatio * 100) }} %</span>
        <span class="usage-fact-label">{{ t('superAdmin.stats.quotaUsed', { n: family.memberCount, max: family.maxMembers }) }}</span>
      </div>
      <div class="usage-fact">
        <span class="usage-fact-value">{{ formatDate(family.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
        <span class="usage-fact-label">{{ t('superAdmin.stats.createdAt') }}</span>
      </div>
    </div>

    <div class="usage-modules">
      <span class="usage-modules-title">{{ t('superAdmin.stats.modulesTitle') }}</span>
      <div v-for="module in MODULES" :key="module.key" class="usage-module">
        <span class="usage-module-name">{{ module.icon }} {{ t(`superAdmin.stats.modules.${module.key}`) }}</span>
        <span class="usage-module-track">
          <span class="usage-module-bar" :style="{ width: `${barWidth(module.key)}%` }" />
        </span>
        <span class="usage-module-count" :class="{ zero: !count(module.key) }">{{ count(module.key) }}</span>
      </div>
      <p class="usage-note">{{ t('superAdmin.stats.privacyNote') }}</p>
    </div>
  </div>
</template>

<script setup>
// Fiche d'utilisation d'une famille (ligne dépliée du tableau de la console Super Admin) :
// uniquement des nombres et des dates, calculés par server/stats/usage.js.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDate, formatRelative } from '../i18n/format'

const props = defineProps({ family: { type: Object, required: true } })
const { t } = useI18n()

const MODULES = [
  { key: 'presence', icon: '🏠' },
  { key: 'meals', icon: '🍽️' },
  { key: 'mealPlans', icon: '🗳️' },
  { key: 'shopping', icon: '🛒' },
  { key: 'tasks', icon: '✅' },
  { key: 'calendar', icon: '📅' }
]

const count = (key) => props.family.usage30?.[key] || 0
const maxCount = computed(() => Math.max(1, ...MODULES.map(m => count(m.key))))
const barWidth = (key) => (count(key) ? Math.max(3, Math.round((count(key) / maxCount.value) * 100)) : 0)
const quotaRatio = computed(() => (props.family.maxMembers ? props.family.memberCount / props.family.maxMembers : 0))
</script>

<style scoped>
.usage-detail {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.2rem;
  padding: 0.5rem 0.25rem;
}

@media (min-width: 900px) {
  .usage-detail {
    grid-template-columns: 1fr 1fr;
  }
}

.usage-facts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.6rem;
  align-content: start;
}

.usage-fact {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.7rem 0.85rem;
  border-radius: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
}

.usage-fact.warn {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.usage-fact-value {
  font-weight: 800;
  font-size: 1.05rem;
}

.usage-fact-label,
.usage-note {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.usage-modules {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.usage-modules-title {
  font-weight: 700;
  font-size: 0.88rem;
  margin-bottom: 0.2rem;
}

.usage-module {
  display: grid;
  grid-template-columns: 11rem 1fr 3rem;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.86rem;
}

.usage-module-track {
  height: 10px;
  border-radius: 999px;
  background: var(--bg-tertiary);
  overflow: hidden;
}

.usage-module-bar {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
}

.usage-module-count {
  text-align: right;
  font-weight: 700;
}

.usage-module-count.zero {
  color: var(--text-muted);
  font-weight: 400;
}

.usage-note {
  margin: 0.4rem 0 0;
}

@media (max-width: 600px) {
  .usage-facts {
    grid-template-columns: repeat(2, 1fr);
  }

  .usage-module {
    grid-template-columns: 8.5rem 1fr 2.5rem;
  }
}
</style>
