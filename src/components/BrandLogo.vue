<template>
  <svg 
    :width="size" 
    :height="size" 
    viewBox="0 0 512 512" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    class="brand-logo-svg"
  >
    <path 
      d="M100 270 L240 148 L390 270" 
      stroke="currentColor" 
      stroke-width="38" 
      stroke-linecap="round" 
      stroke-linejoin="round" 
    />
    <path 
      d="M336 175 L336 135 L300 135" 
      stroke="currentColor" 
      stroke-width="32" 
      stroke-linecap="round" 
      stroke-linejoin="round" 
    />
    <path 
      d="M145 255 L145 375 C145 390 155 400 170 400 L340 400 C355 400 365 390 365 375 L365 300" 
      stroke="currentColor" 
      stroke-width="34" 
      stroke-linecap="round" 
      stroke-linejoin="round" 
      opacity="0.95" 
    />
    <path 
      d="M215 285 L285 355 L425 195" 
      stroke="currentColor" 
      stroke-width="42" 
      stroke-linecap="round" 
      stroke-linejoin="round" 
    />
  </svg>
</template>

<script setup>
defineProps({
  size: {
    type: [Number, String],
    default: 24
  }
})
</script>

<style scoped>
.brand-logo-svg {
  display: block;
  flex-shrink: 0;
}
</style>
