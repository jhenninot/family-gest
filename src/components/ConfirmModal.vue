<template>
  <transition name="confirm-fade">
    <div 
      v-if="isVisible" 
      class="modal-overlay" 
      @click.self="handleCancel"
      @keydown.esc="handleCancel"
      @keydown.enter="handleConfirm"
      tabindex="-1"
      ref="overlayRef"
    >
      <div class="modal-content modal-sm confirm-modal-box">
        <div class="modal-header">
          <h3>{{ modalOptions.title }}</h3>
          <button @click="handleCancel" class="btn-close" :aria-label="t('common.close')">&times;</button>
        </div>

        <div class="confirm-body">
          <p class="confirm-text" v-if="modalOptions.message" v-html="modalOptions.message"></p>
          
          <p class="confirm-desc" v-if="modalOptions.description">
            {{ modalOptions.description }}
          </p>

          <!-- Encadré d'avertissement optionnel -->
          <div v-if="modalOptions.warning" class="confirm-warning-box">
            <div class="warning-icon">⚠️</div>
            <div class="warning-content">
              <span class="warning-title">{{ t('confirm.warningTitle') }}</span>
              <p class="warning-desc" v-html="modalOptions.warning"></p>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" @click="handleCancel" class="btn btn-secondary">
            {{ modalOptions.cancelText || t('common.cancel') }}
          </button>
          <button 
            type="button" 
            @click="handleConfirm" 
            class="btn"
            :class="confirmBtnClass"
            autofocus
          >
            {{ modalOptions.confirmText || t('confirm.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useConfirm } from '../composables/useConfirm'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { isVisible, modalOptions, handleConfirm, handleCancel } = useConfirm()
const overlayRef = ref(null)

const confirmBtnClass = computed(() => {
  if (modalOptions.value.type === 'primary') return 'btn-primary'
  if (modalOptions.value.type === 'warning') return 'btn-warning'
  return 'btn-danger'
})

watch(isVisible, (newVal) => {
  if (newVal) {
    nextTick(() => {
      if (overlayRef.value) {
        overlayRef.value.focus()
      }
    })
  }
})
</script>

<style scoped>
.confirm-modal-box {
  max-width: 440px;
  width: 92%;
  animation: modalScaleIn 0.18s ease-out;
}

@keyframes modalScaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.18s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.modal-header h3 {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
  padding: 0;
  transition: color var(--transition-fast);
}

.btn-close:hover {
  color: var(--text-primary);
}

.confirm-body {
  margin-bottom: 1.5rem;
}

.confirm-text {
  margin: 0 0 0.5rem;
  color: var(--text-primary);
  line-height: 1.6;
  font-size: 0.95rem;
}

.confirm-desc {
  margin: 0.35rem 0 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.5;
}

/* Encadré d'avertissement */
.confirm-warning-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: var(--accent-amber-light);
  border: 1px solid rgba(245, 158, 11, 0.35);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  margin-top: 1rem;
  text-align: left;
}

.warning-icon {
  font-size: 1.25rem;
  line-height: 1;
  flex-shrink: 0;
}

.warning-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.warning-title {
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--accent-amber);
}

.warning-desc {
  font-size: 0.825rem;
  color: var(--text-primary);
  line-height: 1.45;
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* .btn-danger vient du style global (src/style.css) */

.btn-warning {
  background: var(--accent-amber);
  color: white;
  border-color: transparent;
}

.btn-warning:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}
</style>
