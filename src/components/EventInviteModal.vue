<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content invite-modal">
      <div class="modal-header">
        <h3>{{ t('eventInvite.title') }}</h3>
        <button type="button" class="btn-close" :aria-label="t('common.close')" @click="$emit('close')">&times;</button>
      </div>

      <div class="invite-body">
        <p class="invite-event">{{ event.title }}</p>
        <p class="invite-hint">{{ t('eventInvite.hint') }}</p>

        <p v-if="candidates.length === 0" class="invite-empty">{{ t('eventInvite.noMember') }}</p>
        <label v-for="m in candidates" :key="m.id" class="invite-member">
          <input v-model="selected" type="checkbox" :value="m.id" />
          <UserAvatar :avatar="m.avatar" :name="m.name" size="xs" />
          <span>{{ m.name }}</span>
        </label>

        <p v-if="feedback" class="invite-feedback" :class="{ 'is-error': isError }" role="status">{{ feedback }}</p>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="$emit('close')">{{ t('common.close') }}</button>
        <button type="button" class="btn btn-primary" :disabled="!selected.length || sending" @click="send">
          <Send :size="15" />
          <span>{{ t('eventInvite.send') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Send } from '@lucide/vue'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import UserAvatar from './UserAvatar.vue'

const props = defineProps({
  event: { type: Object, required: true }
})
defineEmits(['close'])

const { t } = useI18n()
const authStore = useAuthStore()
const store = useFamilyStore()

const selected = ref([])
const sending = ref(false)
const feedback = ref('')
const isError = ref(false)

// On n'invite pas soi-même
const candidates = computed(() => store.members.filter(m => m.id !== authStore.user?.id))

const send = async () => {
  sending.value = true
  feedback.value = ''
  const result = await store.inviteToEvent(props.event.id, selected.value)
  sending.value = false
  isError.value = !result.success
  feedback.value = result.success ? t('eventInvite.sent', { n: result.invited }, result.invited) : (result.error || t('eventInvite.failed'))
  if (result.success) selected.value = []
}
</script>

<style scoped>
.invite-modal { max-width: 420px; }
.invite-body { display: flex; flex-direction: column; gap: 0.5rem; padding: 0 1.25rem 0.5rem; }
.invite-event { font-weight: 700; margin: 0; }
.invite-hint, .invite-empty { color: var(--text-muted, #64748b); font-size: 0.85rem; margin: 0; }
.invite-member { display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem 0.25rem; cursor: pointer; }
.invite-feedback { margin: 0.25rem 0 0; font-size: 0.9rem; color: #16a34a; }
.invite-feedback.is-error { color: #dc2626; }
</style>
