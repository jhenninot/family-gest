<template>
  <div class="empty-help glass-card">
    <span class="empty-help-icon" aria-hidden="true">{{ icon }}</span>
    <h3>{{ title }}</h3>
    <p>{{ text }}</p>
    <button v-if="actionLabel" type="button" class="btn btn-primary empty-help-action" @click="$emit('action')">
      {{ actionLabel }}
    </button>
    <slot />
  </div>
</template>

<script setup>
// État vide qui explique : quand une liste est vide, on dit à quoi elle sert et on propose
// l'action qui la remplit (aide contextuelle, là où l'utilisateur en a le plus besoin).
defineProps({
  icon: { type: String, default: '✨' },
  title: { type: String, required: true },
  text: { type: String, required: true },
  actionLabel: { type: String, default: '' }
})
defineEmits(['action'])
</script>

<style scoped>
.empty-help {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
  padding: 2rem 1.5rem;
}

.empty-help-icon {
  font-size: 2.2rem;
  line-height: 1;
}

.empty-help h3 {
  margin: 0.3rem 0 0;
  font-size: 1.05rem;
}

.empty-help p {
  margin: 0;
  max-width: 28rem;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.55;
}

.empty-help-action {
  margin-top: 0.6rem;
}
</style>
