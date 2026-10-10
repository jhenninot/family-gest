<template>
  <section class="prep" :data-poll-prep="poll.id">
    <button type="button" class="prep-toggle" :aria-expanded="open" @click="open = !open">
      <ShoppingBasket :size="17" />
      <span class="prep-toggle-label">{{ t('receptionPrep.title') }}</span>
      <span v-if="items.length" class="prep-toggle-total">{{ money(poll.itemTotals?.total || 0) }}</span>
    </button>

    <div v-if="open" class="prep-body">
      <p class="prep-muted">{{ t('receptionPrep.intro') }}</p>

      <div class="prep-tabs" role="tablist">
        <button
          v-for="s in sections"
          :key="s"
          type="button"
          role="tab"
          class="prep-tab"
          :class="{ active: section === s }"
          :aria-selected="section === s"
          @click="section = s"
        >
          {{ s === 'dishes' ? '🍽️' : '🍷' }} {{ t(`receptionPrep.sections.${s}`) }}
          <span class="prep-tab-total">{{ money(poll.itemTotals?.[s] || 0) }}</span>
        </button>
      </div>

      <ul v-if="sectionItems.length" class="prep-list">
        <li v-for="item in sectionItems" :key="item.id" class="prep-line" :class="{ checked: item.checked, sent: item.sentAt }">
          <input type="checkbox" class="prep-check" :checked="item.checked" :aria-label="t('receptionPrep.bought')" @change="patch(item, { checked: $event.target.checked })" />
          <div class="prep-line-main">
            <span class="prep-name">{{ item.name }}</span>
            <span v-if="item.sentAt" class="prep-sent">{{ t('receptionPrep.sent') }}</span>
            <div class="prep-fields">
              <label class="prep-field">
                <span>{{ t('receptionPrep.quantity') }}</span>
                <input type="number" min="0" step="any" inputmode="decimal" class="form-input" :value="item.quantity" @change="patch(item, { quantity: $event.target.value })" />
              </label>
              <label class="prep-field prep-field-unit">
                <span>{{ t('receptionPrep.unit') }}</span>
                <input type="text" maxlength="20" class="form-input" :value="item.unit" :placeholder="t('receptionPrep.unitPlaceholder')" @change="patch(item, { unit: $event.target.value })" />
              </label>
              <label class="prep-field">
                <span>{{ t('receptionPrep.unitPrice') }}</span>
                <input type="number" min="0" step="0.01" inputmode="decimal" class="form-input" :value="item.unitPrice || ''" placeholder="0" @change="patch(item, { unitPrice: $event.target.value })" />
              </label>
            </div>
          </div>
          <div class="prep-line-side">
            <strong class="prep-line-total">{{ money(item.quantity * item.unitPrice) }}</strong>
            <button type="button" class="btn btn-secondary btn-icon-only" :title="t('common.delete')" :aria-label="t('common.delete')" @click="remove(item)">
              <Trash2 :size="15" />
            </button>
          </div>
        </li>
      </ul>
      <p v-else class="prep-muted">{{ t(`receptionPrep.empty.${section}`) }}</p>

      <form class="prep-add" @submit.prevent="add">
        <input v-model="draft.name" type="text" maxlength="80" class="form-input prep-add-name" :placeholder="t(`receptionPrep.namePlaceholder.${section}`)" />
        <input v-model="draft.quantity" type="number" min="0" step="any" inputmode="decimal" class="form-input prep-add-qty" :aria-label="t('receptionPrep.quantity')" />
        <input v-model="draft.unitPrice" type="number" min="0" step="0.01" inputmode="decimal" class="form-input prep-add-price" :placeholder="t('receptionPrep.unitPrice')" :aria-label="t('receptionPrep.unitPrice')" />
        <button type="submit" class="btn btn-primary btn-icon-only" :disabled="!draft.name.trim() || busy" :aria-label="t('common.add')" :title="t('common.add')">
          <Plus :size="18" />
        </button>
      </form>
      <p v-if="error" class="prep-error">{{ error }}</p>

      <div v-if="items.length" class="prep-totals">
        <div v-for="s in sections" :key="s" class="prep-total-row">
          <span>{{ t(`receptionPrep.sections.${s}`) }}</span><span>{{ money(poll.itemTotals?.[s] || 0) }}</span>
        </div>
        <div class="prep-total-row prep-total-main">
          <span>{{ t('receptionPrep.total') }}</span><span>{{ money(poll.itemTotals?.total || 0) }}</span>
        </div>
      </div>

      <div v-if="pendingCount" class="prep-send">
        <button type="button" class="btn btn-secondary" :disabled="busy" @click="sendToShopping">
          <Send :size="16" /> {{ t('receptionPrep.send', { n: pendingCount }, pendingCount) }}
        </button>
        <p class="prep-muted">{{ t('receptionPrep.sendHint') }}</p>
      </div>
      <p v-if="notice" class="prep-notice">{{ notice }}</p>
    </div>
  </section>
</template>

<script setup>
// Préparation d'une réception : liste de courses propre à la réception (plats / boissons,
// quantités, prix par unité), séparée de la liste commune mais pouvant y être envoyée.
// Voir server/mealPolls/logic.js (sanitizeItem, itemTotals) et les routes /api/meal-polls/:id/items.
import { ref, computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ShoppingBasket, Plus, Trash2, Send } from '@lucide/vue'
import { useFamilyStore } from '../stores/familyStore'
import { intlLocale } from '../i18n/format'

const props = defineProps({ poll: { type: Object, required: true } })
const emit = defineEmits(['updated'])

const { t } = useI18n()
const route = useRoute()
const store = useFamilyStore()

const sections = ['dishes', 'drinks']
const open = ref(false)
const section = ref('dishes')
const busy = ref(false)
const error = ref('')
const notice = ref('')
const draft = reactive({ name: '', quantity: 1, unitPrice: '' })

const items = computed(() => props.poll.items || [])
const sectionItems = computed(() => items.value.filter(i => i.section === section.value))
const pendingCount = computed(() => items.value.filter(i => !i.checked && !i.sentAt).length)

const money = (n) => new Intl.NumberFormat(intlLocale(), { style: 'currency', currency: 'EUR' }).format(Number(n) || 0)

const call = async (path, options = {}) => {
  const res = await fetch(`/api/meal-polls/${props.poll.id}${path}`, {
    ...options,
    headers: { ...store.getHeaders(), 'X-Family-Slug': route.params.familySlug }
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || res.statusText)
  return body
}

const run = async (fn) => {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await fn()
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}

const add = () => run(async () => {
  const updated = await call('/items', {
    method: 'POST',
    body: JSON.stringify({ section: section.value, name: draft.name, quantity: draft.quantity, unitPrice: draft.unitPrice })
  })
  draft.name = ''
  draft.quantity = 1
  draft.unitPrice = ''
  emit('updated', updated)
})

const patch = (item, changes) => run(async () => {
  emit('updated', await call(`/items/${item.id}`, { method: 'PUT', body: JSON.stringify(changes) }))
})

const remove = (item) => run(async () => {
  emit('updated', await call(`/items/${item.id}`, { method: 'DELETE' }))
})

const sendToShopping = () => run(async () => {
  const { poll, added, merged } = await call('/items/send-to-shopping', { method: 'POST', body: JSON.stringify({}) })
  emit('updated', poll)
  notice.value = t('receptionPrep.sentNotice', { added, merged })
  store.fetchAllData?.()
})
</script>

<style scoped>
.prep { border-top: 1px solid var(--border-color, rgba(128, 128, 128, 0.25)); padding-top: 0.75rem; margin-top: 0.75rem; }
.prep-toggle { display: flex; align-items: center; gap: 0.5rem; width: 100%; background: none; border: 0; color: inherit; font: inherit; font-weight: 600; padding: 0.35rem 0; cursor: pointer; text-align: left; }
.prep-toggle-label { flex: 1; }
.prep-toggle-total { font-variant-numeric: tabular-nums; opacity: 0.85; }
.prep-body { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.5rem; }
.prep-muted { opacity: 0.7; font-size: 0.85rem; margin: 0; }
.prep-tabs { display: flex; gap: 0.5rem; }
.prep-tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.1rem; padding: 0.5rem; border-radius: 10px; border: 1px solid var(--border-color, rgba(128, 128, 128, 0.35)); background: transparent; color: inherit; font: inherit; cursor: pointer; }
.prep-tab.active { border-color: var(--primary-color, #6366f1); background: rgba(99, 102, 241, 0.12); font-weight: 600; }
.prep-tab-total { font-size: 0.8rem; opacity: 0.75; font-variant-numeric: tabular-nums; }
.prep-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.prep-line { display: flex; gap: 0.6rem; align-items: flex-start; padding: 0.6rem; border-radius: 10px; border: 1px solid var(--border-color, rgba(128, 128, 128, 0.25)); }
.prep-line.checked .prep-name { text-decoration: line-through; opacity: 0.6; }
.prep-check { margin-top: 0.2rem; width: 1.15rem; height: 1.15rem; }
.prep-line-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.prep-name { font-weight: 600; overflow-wrap: anywhere; }
.prep-sent { font-size: 0.75rem; opacity: 0.7; }
.prep-fields { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.4rem; }
.prep-field { display: flex; flex-direction: column; gap: 0.15rem; font-size: 0.72rem; opacity: 0.9; min-width: 0; }
.prep-field .form-input { padding: 0.35rem 0.5rem; min-width: 0; }
.prep-line-side { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; }
.prep-line-total { font-variant-numeric: tabular-nums; white-space: nowrap; }
.prep-add { display: grid; grid-template-columns: 1fr 4.2rem 5.2rem auto; gap: 0.4rem; align-items: center; }
.prep-add .form-input { min-width: 0; }
.prep-totals { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.6rem; border-radius: 10px; background: rgba(128, 128, 128, 0.1); font-variant-numeric: tabular-nums; }
.prep-total-row { display: flex; justify-content: space-between; }
.prep-total-main { font-weight: 700; border-top: 1px solid var(--border-color, rgba(128, 128, 128, 0.3)); padding-top: 0.3rem; margin-top: 0.2rem; }
.prep-send { display: flex; flex-direction: column; gap: 0.3rem; align-items: flex-start; }
.prep-error { color: var(--danger-color, #ef4444); margin: 0; font-size: 0.85rem; }
.prep-notice { margin: 0; font-size: 0.85rem; color: var(--success-color, #22c55e); }
@media (max-width: 480px) {
  .prep-add { grid-template-columns: 1fr 3.6rem 4.6rem auto; }
}
</style>
