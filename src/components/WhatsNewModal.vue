<template>
  <div v-if="release && visible" class="modal-overlay" @click.self="close">
    <div class="modal-content whats-new" role="dialog" aria-modal="true" :aria-label="t('whatsNew.title')">
      <div class="modal-header">
        <h3><Sparkles :size="20" class="whats-new-icon" /> {{ t('whatsNew.title') }}</h3>
        <button type="button" class="btn-close" :aria-label="t('common.close')" @click="close">&times;</button>
      </div>
      <ul class="whats-new-list">
        <li v-for="(note, i) in release.notes" :key="i">{{ note }}</li>
      </ul>
      <div class="whats-new-footer">
        <button type="button" class="btn btn-primary" @click="close">{{ t('whatsNew.ok') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
// « Quoi de neuf ? » : nouveautés de la dernière version publiée par le Super Admin. Affichée une
// fois par appareil (localStorage), ou à la demande via ?whatsnew=1 (clic sur la notification).
// Un appareil qui n'a encore rien vu (nouveau compte) mémorise la version sans l'afficher.
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Sparkles } from '@lucide/vue'
import { useAuthStore } from '../stores/authStore'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const SEEN_KEY = 'familygest_seen_release'
const release = ref(null)
const visible = ref(false)

const readSeen = () => { try { return localStorage.getItem(SEEN_KEY) } catch { return null } }
const writeSeen = (version) => { try { localStorage.setItem(SEEN_KEY, version) } catch { /* stockage indisponible */ } }

const load = async () => {
  try {
    const res = await fetch('/api/releases/latest', { headers: { Authorization: `Bearer ${authStore.token}` } })
    if (!res.ok) return
    const { release: latest } = await res.json()
    if (!latest) return
    release.value = latest
    const seen = readSeen()
    if (route.query.whatsnew === '1' || (seen && seen !== latest.version)) visible.value = true
    else if (!seen) writeSeen(latest.version)
  } catch { /* pas de fenêtre */ }
}

watch(() => authStore.token, (token) => { if (token) load() }, { immediate: true })
watch(() => route.query.whatsnew, (flag) => { if (flag === '1' && release.value) visible.value = true })

const close = () => {
  visible.value = false
  if (release.value) writeSeen(release.value.version)
  if (route.query.whatsnew) router.replace({ query: { ...route.query, whatsnew: undefined } })
}
</script>

<style scoped>
.whats-new {
  max-width: 480px;
}

.whats-new .modal-header h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.whats-new-icon {
  color: var(--accent-primary);
}

.whats-new-list {
  margin: 0 0 1.25rem;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.whats-new-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
