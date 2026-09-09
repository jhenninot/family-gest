<template>
  <div v-if="password !== undefined" class="password-criteria-wrapper">
    <!-- Strength bar -->
    <div class="strength-bar-track">
      <div 
        class="strength-bar-fill" 
        :class="strengthClass" 
        :style="{ width: strengthPercentage + '%' }"
      ></div>
    </div>

    <!-- Live criteria list -->
    <div class="criteria-list">
      <span class="criterion-item" :class="{ valid: criteria.length }">
        <Check v-if="criteria.length" :size="12" class="icon-check" />
        <span v-else class="icon-bullet">&bull;</span>
        10 car. min
      </span>

      <span class="criterion-item" :class="{ valid: criteria.hasUpper }">
        <Check v-if="criteria.hasUpper" :size="12" class="icon-check" />
        <span v-else class="icon-bullet">&bull;</span>
        1 majuscule
      </span>

      <span class="criterion-item" :class="{ valid: criteria.hasLower }">
        <Check v-if="criteria.hasLower" :size="12" class="icon-check" />
        <span v-else class="icon-bullet">&bull;</span>
        1 minuscule
      </span>

      <span class="criterion-item" :class="{ valid: criteria.hasNumber }">
        <Check v-if="criteria.hasNumber" :size="12" class="icon-check" />
        <span v-else class="icon-bullet">&bull;</span>
        1 chiffre
      </span>

      <span class="criterion-item" :class="{ valid: criteria.hasSpecial }">
        <Check v-if="criteria.hasSpecial" :size="12" class="icon-check" />
        <span v-else class="icon-bullet">&bull;</span>
        1 spécial (!@#$)
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Check } from '@lucide/vue'
import { checkPasswordCriteria } from '../utils/passwordValidator'

const props = defineProps({
  password: {
    type: String,
    default: ''
  }
})

const criteria = computed(() => checkPasswordCriteria(props.password))

const satisfiedCount = computed(() => {
  const c = criteria.value
  let count = 0
  if (c.length) count++
  if (c.hasUpper) count++
  if (c.hasLower) count++
  if (c.hasNumber) count++
  if (c.hasSpecial) count++
  return count
})

const strengthPercentage = computed(() => {
  if (!props.password) return 0
  return (satisfiedCount.value / 5) * 100
})

const strengthClass = computed(() => {
  if (satisfiedCount.value <= 2) return 'weak'
  if (satisfiedCount.value <= 4) return 'medium'
  return 'strong'
})
</script>

<style scoped>
.password-criteria-wrapper {
  margin-top: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.strength-bar-track {
  height: 4px;
  background: var(--border-color, rgba(226, 232, 240, 0.8));
  border-radius: var(--radius-full, 9999px);
  overflow: hidden;
}

.strength-bar-fill {
  height: 100%;
  transition: width 0.25s ease, background-color 0.25s ease;
}

.strength-bar-fill.weak {
  background-color: #ef4444;
}

.strength-bar-fill.medium {
  background-color: #f59e0b;
}

.strength-bar-fill.strong {
  background-color: #10b981;
}

.criteria-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.6rem;
  font-size: 0.725rem;
  color: var(--text-muted, #94a3b8);
}

.criterion-item {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  transition: color 0.15s ease;
}

.criterion-item.valid {
  color: #10b981;
  font-weight: 600;
}

.icon-check {
  stroke-width: 3;
}

.icon-bullet {
  font-size: 0.9rem;
  line-height: 1;
}
</style>
