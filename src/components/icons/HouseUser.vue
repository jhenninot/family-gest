<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    v-bind="$attrs"
    class="lucide lucide-house-user"
  >
    <!-- Toit de la maison -->
    <path d="M2 10.5L12 2.5l10 8" />
    <!-- Murs de la maison -->
    <path d="M4 9.5V20a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5V9.5" />
    <!-- Tête du personnage -->
    <circle cx="12" cy="11.5" r="2.25" />
    <!-- Corps / épaules du personnage -->
    <path d="M8.5 18.5a3.5 3.5 0 0 1 7 0" />
  </svg>
</template>

<script setup>
defineProps({
  size: {
    type: [Number, String],
    default: 20
  }
})
</script>
