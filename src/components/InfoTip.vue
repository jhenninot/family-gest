<template>
  <span class="info-tip" ref="rootRef">
    <button
      type="button"
      class="info-tip-btn"
      :aria-label="t('help.moreInfo')"
      :aria-expanded="open"
      @click.stop="open = !open"
    >i</button>
    <teleport to="body">
      <transition name="info-tip-fade">
        <span v-if="open" ref="bubbleRef" class="info-tip-bubble" :style="bubbleStyle" role="tooltip" @click.stop>
          <strong v-if="title" class="info-tip-title">{{ title }}</strong>
          <span>{{ text }}</span>
        </span>
      </transition>
    </teleport>
  </span>
</template>

<script setup>
// Petite bulle d'explication « i » à côté d'une notion difficile (présence habituelle, semaine A/B…).
// S'ouvre au toucher (pas au survol : l'appli est surtout utilisée sur téléphone), se ferme en
// touchant ailleurs ou avec Échap.
import { ref, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps({
  text: { type: String, required: true },
  title: { type: String, default: '' }
})

const { t } = useI18n()
const open = ref(false)
const rootRef = ref(null)
const bubbleRef = ref(null)
// Position fixe calculée à l'ouverture : la bulle reste toujours dans l'écran (téléphone compris)
const bubbleStyle = ref({})
const BUBBLE_WIDTH = 280
const MARGIN = 12

const place = () => {
  const btn = rootRef.value?.getBoundingClientRect()
  if (!btn) return
  const width = Math.min(BUBBLE_WIDTH, window.innerWidth - 2 * MARGIN)
  const left = Math.max(MARGIN, Math.min(btn.left + btn.width / 2 - width / 2, window.innerWidth - width - MARGIN))
  bubbleStyle.value = { top: `${btn.bottom + 8}px`, left: `${left}px`, width: `${width}px` }
}
const close = () => { open.value = false }

const onOutside = (e) => {
  if (rootRef.value?.contains(e.target) || bubbleRef.value?.contains(e.target)) return
  open.value = false
}
const onKey = (e) => { if (e.key === 'Escape') open.value = false }

watch(open, (value) => {
  if (value) {
    place()
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    document.addEventListener('pointerdown', onOutside)
    document.addEventListener('keydown', onKey)
  } else {
    window.removeEventListener('scroll', close, true)
    window.removeEventListener('resize', close)
    document.removeEventListener('pointerdown', onOutside)
    document.removeEventListener('keydown', onKey)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', close, true)
  window.removeEventListener('resize', close)
  document.removeEventListener('pointerdown', onOutside)
  document.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.info-tip {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
}

.info-tip-btn {
  width: 18px;
  height: 18px;
  padding: 0;
  border-radius: 50%;
  border: 1.5px solid var(--accent-primary);
  background: transparent;
  color: var(--accent-primary);
  font: italic 700 0.7rem/1 Georgia, serif;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-tip-btn:hover,
.info-tip-btn[aria-expanded="true"] {
  background: var(--accent-primary);
  color: #fff;
}

.info-tip-bubble {
  position: fixed;
  z-index: 1100;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 400;
  line-height: 1.5;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  white-space: normal;
  text-transform: none;
  letter-spacing: normal;
}

.info-tip-title {
  color: var(--text-primary);
  font-size: 0.88rem;
}

.info-tip-fade-enter-active,
.info-tip-fade-leave-active {
  transition: opacity 0.15s ease, translate 0.15s ease;
}

.info-tip-fade-enter-from,
.info-tip-fade-leave-to {
  opacity: 0;
  translate: 0 -4px;
}
</style>
