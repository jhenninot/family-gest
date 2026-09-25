<template>
  <div class="legal-page">
    <div class="glass-card legal-card">
      <div class="legal-header">
        <div class="logo-badge">
          <BrandLogo :size="24" />
        </div>
        <h1 class="legal-title">{{ t(route.meta.titleKey) }}</h1>
      </div>

      <div v-if="loading" class="legal-loading">{{ t('common.loading') }}</div>
      <pre v-else class="legal-content">{{ content }}</pre>

      <div class="legal-footer">
        <router-link to="/login" class="btn btn-secondary">{{ t('legal.backToLogin') }}</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BrandLogo from '../components/BrandLogo.vue'

const route = useRoute()
const { t } = useI18n()
const loading = ref(true)
const legalNotice = ref('')
const privacyPolicy = ref('')

const content = computed(() => {
  return route.meta.field === 'privacyPolicy' ? privacyPolicy.value : legalNotice.value
})

onMounted(async () => {
  try {
    const res = await fetch('/api/legal')
    const data = await res.json()
    legalNotice.value = data.legalNotice || ''
    privacyPolicy.value = data.privacyPolicy || ''
  } catch (err) {
    legalNotice.value = privacyPolicy.value = t('legal.loadError')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.legal-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent 40%),
              radial-gradient(circle at bottom left, rgba(236, 72, 153, 0.12), transparent 40%);
}

.legal-card {
  width: 100%;
  max-width: 720px;
  max-height: 85vh;
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  overflow: hidden;
}

.legal-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-badge {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: var(--shadow-glow);
}

.legal-title {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-primary);
}

.legal-loading {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.legal-content {
  overflow-y: auto;
  font-family: inherit;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  padding-right: 0.5rem;
}

.legal-footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--border-color);
  padding-top: 1rem;
}
</style>
