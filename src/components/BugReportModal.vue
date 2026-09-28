<template>
  <teleport to="body">
    <div v-if="isOpen" class="modal-overlay bug-overlay" @click.self="close">
      <div class="modal-content glass-card bug-modal" role="dialog" aria-modal="true" :aria-label="t('bugReport.title')" @paste="onPaste">
        <div class="modal-header">
          <h3>🐞 {{ t('bugReport.title') }}</h3>
          <button type="button" class="btn-close" :aria-label="t('common.close')" @click="close">&times;</button>
        </div>

        <!-- Envoyé -->
        <div v-if="sentReference" class="bug-sent">
          <span class="bug-sent-icon">✅</span>
          <h4>{{ t('bugReport.sentTitle') }}</h4>
          <p>{{ t('bugReport.sentText') }}</p>
          <p class="bug-muted">{{ t('bugReport.reference', { ref: sentReference }) }}</p>
          <button type="button" class="btn btn-primary" @click="close">{{ t('common.close') }}</button>
        </div>

        <form v-else class="bug-form" @submit.prevent="submit">
          <p class="bug-intro">{{ t('bugReport.intro') }}</p>

          <div class="form-group">
            <label class="form-label" for="bug-description">{{ t('bugReport.description') }} *</label>
            <textarea
              id="bug-description"
              ref="descriptionRef"
              v-model="description"
              class="form-input bug-textarea"
              rows="5"
              maxlength="5000"
              required
              :placeholder="t('bugReport.descriptionPlaceholder')"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="bug-expected">{{ t('bugReport.expected') }}</label>
            <textarea
              id="bug-expected"
              v-model="expected"
              class="form-input bug-textarea"
              rows="2"
              maxlength="5000"
              :placeholder="t('bugReport.expectedPlaceholder')"
            />
          </div>

          <!-- Pièces jointes -->
          <div class="form-group">
            <span class="form-label">{{ t('bugReport.attachments') }}</span>
            <div class="bug-files">
              <div v-for="(file, i) in files" :key="file.id" class="bug-file">
                <img v-if="file.preview" :src="file.preview" :alt="file.name" class="bug-thumb" />
                <span v-else class="bug-thumb bug-thumb-doc">PDF</span>
                <span class="bug-file-name" :title="file.name">{{ file.name }}</span>
                <span class="bug-file-size">{{ formatSize(file.size) }}</span>
                <button type="button" class="bug-file-remove" :aria-label="t('bugReport.removeFile', { name: file.name })" @click="removeFile(i)">&times;</button>
              </div>
              <button
                v-if="files.length < MAX_FILES"
                type="button"
                class="bug-add-file"
                :disabled="processing"
                @click="fileInput?.click()"
              >
                <Paperclip :size="18" />
                <span>{{ processing ? t('bugReport.processing') : t('bugReport.addFile') }}</span>
              </button>
            </div>
            <input
              ref="fileInput"
              type="file"
              multiple
              accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
              class="bug-hidden-input"
              @change="onFilesChosen"
            />
            <span class="bug-hint">{{ t('bugReport.filesHint', { max: MAX_FILES }) }}</span>
          </div>

          <!-- Informations techniques -->
          <label class="bug-context-toggle">
            <input v-model="includeContext" type="checkbox" />
            <span>{{ t('bugReport.includeContext') }}</span>
          </label>
          <details v-if="includeContext" class="bug-context">
            <summary>{{ t('bugReport.seeContext') }}</summary>
            <dl>
              <template v-for="(value, key) in context" :key="key">
                <dt>{{ t(`bugReport.context.${key}`) }}</dt>
                <dd>{{ value }}</dd>
              </template>
            </dl>
          </details>

          <p v-if="error" class="bug-error">{{ error }}</p>

          <div class="bug-actions">
            <button type="button" class="btn btn-secondary" @click="close">{{ t('common.cancel') }}</button>
            <button type="submit" class="btn btn-primary" :disabled="sending || processing || description.trim().length < 5">
              <Send :size="16" /> {{ sending ? t('bugReport.sending') : t('bugReport.send') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </teleport>
</template>

<script setup>
// Formulaire « Signaler un bug » : description, pièces jointes (captures d'écran, PDF — aussi par
// coller Ctrl+V), et informations techniques sur l'écran affiché. Envoi par email aux Super Admins
// via POST /api/bug-reports (server/bugReports/). Les grandes images sont réduites avant l'envoi.
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Paperclip, Send } from '@lucide/vue'
import { useAuthStore } from '../stores/authStore'
import { useBugReport } from '../composables/useBugReport'

const { t, locale } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const { isOpen, closeBugReport } = useBugReport()

const MAX_FILES = 5
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_TOTAL_BYTES = 12 * 1024 * 1024
// Une capture d'écran plus grande est réduite (côté le plus long) et recompressée
const MAX_IMAGE_SIDE = 1920
const RECOMPRESS_ABOVE = 1.5 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf']

const description = ref('')
const expected = ref('')
const files = ref([])
const includeContext = ref(true)
const processing = ref(false)
const sending = ref(false)
const error = ref('')
const sentReference = ref('')
const fileInput = ref(null)
const descriptionRef = ref(null)
let nextId = 1

// Écran d'où part le signalement (figé à l'ouverture)
const context = ref({})
const buildContext = () => ({
  page: route.path,
  screen: String(route.name || ''),
  family: route.params.familySlug || '',
  version: __APP_VERSION__,
  build: __APP_BUILD_SHA__,
  language: locale.value,
  userAgent: navigator.userAgent,
  viewport: `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio || 1}x`,
  online: navigator.onLine ? 'online' : 'offline',
  time: new Date().toString()
})

const reset = () => {
  description.value = ''
  expected.value = ''
  files.value.forEach(f => f.preview && URL.revokeObjectURL(f.preview))
  files.value = []
  includeContext.value = true
  error.value = ''
  sentReference.value = ''
}

watch(isOpen, async (open) => {
  if (!open) return
  reset()
  context.value = Object.fromEntries(Object.entries(buildContext()).filter(([, v]) => v))
  await nextTick()
  descriptionRef.value?.focus()
})

const close = () => {
  if (sending.value) return
  closeBugReport()
  reset()
}

const totalSize = computed(() => files.value.reduce((sum, f) => sum + f.size, 0))

const formatSize = (bytes) => (bytes >= 1024 * 1024
  ? t('bugReport.sizeMb', { n: (bytes / 1024 / 1024).toFixed(1) })
  : t('bugReport.sizeKb', { n: Math.max(1, Math.round(bytes / 1024)) }))

const readAsDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(blob)
})

// Réduit une grande image en JPEG ; les GIF (animés) et petites images restent telles quelles
const shrinkImage = async (file) => {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size <= RECOMPRESS_ABOVE) return file
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob || blob.size >= file.size) return file
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg' })
}

const addFiles = async (list) => {
  error.value = ''
  processing.value = true
  try {
    for (const original of list) {
      if (files.value.length >= MAX_FILES) {
        error.value = t('bugReport.errors.tooMany', { max: MAX_FILES })
        break
      }
      if (!ACCEPTED.includes(original.type)) {
        error.value = t('bugReport.errors.type', { name: original.name || '' })
        continue
      }
      const file = await shrinkImage(original)
      if (file.size > MAX_FILE_BYTES) {
        error.value = t('bugReport.errors.tooLarge', { name: file.name, max: 5 })
        continue
      }
      if (totalSize.value + file.size > MAX_TOTAL_BYTES) {
        error.value = t('bugReport.errors.totalTooLarge', { max: 12 })
        continue
      }
      files.value.push({
        id: nextId++,
        name: file.name || `capture-${nextId}.png`,
        size: file.size,
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      })
    }
  } finally {
    processing.value = false
  }
}

const onFilesChosen = async (event) => {
  const chosen = Array.from(event.target.files || [])
  event.target.value = ''
  await addFiles(chosen)
}

// Coller une capture d'écran (Ctrl+V / Cmd+V) directement dans le formulaire
const onPaste = async (event) => {
  const pasted = Array.from(event.clipboardData?.files || [])
  if (pasted.length === 0) return
  event.preventDefault()
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  await addFiles(pasted.map((f, i) => (f.name && f.name !== 'image.png') ? f : new File([f], `capture-${stamp}${i ? `-${i}` : ''}.png`, { type: f.type })))
}

const removeFile = (index) => {
  const [removed] = files.value.splice(index, 1)
  if (removed?.preview) URL.revokeObjectURL(removed.preview)
}

const submit = async () => {
  if (sending.value || description.value.trim().length < 5) return
  sending.value = true
  error.value = ''
  try {
    const attachments = await Promise.all(files.value.map(async f => ({ name: f.name, data: await readAsDataUrl(f.file) })))
    const res = await fetch('/api/bug-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
      body: JSON.stringify({
        description: description.value,
        expected: expected.value,
        context: includeContext.value ? context.value : null,
        attachments
      })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || t('bugReport.errors.send'))
    sentReference.value = data.reference
  } catch (err) {
    error.value = err.message || t('bugReport.errors.send')
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.bug-overlay {
  z-index: 1300;
}

.bug-modal {
  width: min(560px, 100%);
  max-height: 92vh;
  overflow-y: auto;
}

.bug-intro,
.bug-muted,
.bug-hint {
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.5;
}

.bug-intro {
  margin: 0 0 1rem;
}

.bug-hint {
  display: block;
  margin-top: 0.4rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.bug-textarea {
  resize: vertical;
  min-height: 3rem;
  font-family: inherit;
}

.bug-files {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.bug-file {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
}

.bug-thumb {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 6px;
  object-fit: cover;
  background: var(--bg-tertiary);
}

.bug-thumb-doc {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 800;
  color: #dc2626;
}

.bug-file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.88rem;
}

.bug-file-size {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.bug-file-remove {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 1.1rem;
  cursor: pointer;
}

.bug-add-file {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1.5px dashed var(--border-color);
  border-radius: 10px;
  background: transparent;
  color: var(--accent-primary);
  font-weight: 600;
  cursor: pointer;
}

.bug-add-file:disabled {
  opacity: 0.6;
  cursor: wait;
}

.bug-hidden-input {
  display: none;
}

.bug-context-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.bug-context {
  margin: 0.5rem 0 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.bug-context summary {
  cursor: pointer;
  color: var(--accent-primary);
}

.bug-context dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.2rem 0.8rem;
  margin: 0.5rem 0 0;
}

.bug-context dt {
  color: var(--text-muted);
}

.bug-context dd {
  margin: 0;
  word-break: break-word;
}

.bug-error {
  margin: 0.8rem 0 0;
  color: #dc2626;
  font-size: 0.88rem;
}

.bug-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 1.2rem;
}

.bug-actions .btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.bug-sent {
  text-align: center;
  padding: 1rem 0.5rem;
}

.bug-sent-icon {
  font-size: 2.4rem;
}

.bug-sent h4 {
  margin: 0.6rem 0 0.3rem;
}

.bug-sent p {
  margin: 0 0 0.6rem;
  color: var(--text-secondary);
}
</style>
