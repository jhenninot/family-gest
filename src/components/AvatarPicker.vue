<template>
  <div class="avatar-picker-component">
    <!-- Aperçu de l'avatar actuellement sélectionné avec bouton d'import photo -->
    <div class="avatar-preview-action-card">
      <UserAvatar 
        :avatar="modelValue" 
        :name="name" 
        size="xl" 
        :border-color="color"
      />

      <div class="avatar-upload-col">
        <input 
          ref="fileInputRef" 
          type="file" 
          accept="image/png, image/jpeg, image/webp, image/*" 
          class="hidden-file-input" 
          @change="handleFileUpload" 
        />

        <div class="upload-buttons-row">
          <button 
            type="button" 
            class="btn-upload-avatar" 
            @click="triggerFileInput"
            :disabled="isProcessing"
          >
            <Camera :size="16" />
            <span>{{ isCustomPhoto ? 'Changer la photo' : 'Importer une photo' }}</span>
          </button>

          <button 
            v-if="isCustomPhoto" 
            type="button" 
            class="btn-reset-avatar" 
            @click="selectPreset(PRESET_3D_AVATARS[0].path)"
            title="Revenir aux modèles 3D"
          >
            <RotateCcw :size="14" />
            <span>Modèles 3D</span>
          </button>
        </div>

        <span v-if="errorMsg" class="upload-error-text">{{ errorMsg }}</span>
        <span v-else class="upload-help-text">Compatible iPhone, Android, Mac & PC (recadrage carré)</span>
      </div>
    </div>

    <!-- Grille des modèles 3D prédéfinis -->
    <div class="preset-label">Ou choisissez parmi les modèles 3D :</div>
    <div class="preset-3d-grid">
      <button 
        v-for="item in PRESET_3D_AVATARS" 
        :key="item.id" 
        type="button" 
        class="preset-3d-btn" 
        :class="{ selected: modelValue === item.path }" 
        @click="selectPreset(item.path)"
        :title="item.label"
      >
        <img :src="item.path" :alt="item.label" class="preset-3d-img" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Camera, RotateCcw } from '@lucide/vue'
import UserAvatar from './UserAvatar.vue'
import { PRESET_3D_AVATARS, processUploadedImage } from '../utils/avatarHelper'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const fileInputRef = ref(null)
const isProcessing = ref(false)
const errorMsg = ref('')

const isCustomPhoto = computed(() => {
  return typeof props.modelValue === 'string' && props.modelValue.startsWith('data:image/')
})

const triggerFileInput = () => {
  errorMsg.value = ''
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
    fileInputRef.value.click()
  }
}

const handleFileUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  isProcessing.value = true
  errorMsg.value = ''

  try {
    const dataUrl = await processUploadedImage(file, 256)
    emit('update:modelValue', dataUrl)
  } catch (err) {
    console.error('Erreur import photo:', err)
    errorMsg.value = err.message || 'Erreur lors du traitement de l\'image'
  } finally {
    isProcessing.value = false
  }
}

const selectPreset = (path) => {
  errorMsg.value = ''
  emit('update:modelValue', path)
}
</script>

<style scoped>
.avatar-picker-component {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.avatar-preview-action-card {
  display: flex;
  align-items: center;
  gap: 1.15rem;
  background: var(--bg-tertiary, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md, 12px);
}

.avatar-upload-col {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
}

.hidden-file-input {
  display: none;
}

.upload-buttons-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-upload-avatar {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: var(--accent-primary-light, rgba(99, 102, 241, 0.12));
  color: var(--accent-primary, #6366f1);
  border: 1px solid var(--accent-primary, #6366f1);
  padding: 0.45rem 0.85rem;
  border-radius: var(--radius-md, 8px);
  font-size: 0.825rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
}

.btn-upload-avatar:hover:not(:disabled) {
  background: var(--accent-primary, #6366f1);
  color: #ffffff;
  transform: translateY(-1px);
}

.btn-upload-avatar:disabled {
  opacity: 0.6;
  cursor: wait;
}

.btn-reset-avatar {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--bg-card, #ffffff);
  color: var(--text-muted, #94a3b8);
  border: 1px solid var(--border-color, #e2e8f0);
  padding: 0.45rem 0.7rem;
  border-radius: var(--radius-md, 8px);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
}

.btn-reset-avatar:hover {
  background: var(--bg-card-hover, #f1f5f9);
  color: var(--text-primary, #0f172a);
}

.upload-help-text {
  font-size: 0.72rem;
  color: var(--text-muted, #94a3b8);
}

.upload-error-text {
  font-size: 0.75rem;
  color: var(--accent-rose, #f43f5e);
  font-weight: 600;
}

.preset-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  margin-top: 0.25rem;
}

.preset-3d-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.55rem;
}

@media (max-width: 500px) {
  .preset-3d-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.preset-3d-btn {
  aspect-ratio: 1;
  border-radius: 50%;
  border: 2px solid var(--border-color, #e2e8f0);
  background: var(--bg-tertiary, #f8fafc);
  cursor: pointer;
  padding: 2px;
  overflow: hidden;
  transition: all var(--transition-fast, 0.15s ease);
  display: flex;
  align-items: center;
  justify-content: center;
}

.preset-3d-btn:hover {
  border-color: var(--accent-primary, #6366f1);
  transform: scale(1.08);
}

.preset-3d-btn.selected {
  border-color: var(--accent-primary, #6366f1);
  box-shadow: 0 0 0 3px var(--accent-primary, #6366f1);
  transform: scale(1.1);
}

.preset-3d-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
</style>
