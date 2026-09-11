<template>
  <div 
    class="user-avatar-wrapper"
    :class="[
      `size-${sizeProp}`, 
      shapeClass, 
      { clickable: clickable }
    ]"
    :style="wrapperStyle"
    :title="name"
  >
    <img 
      v-if="isImage && !hasError" 
      :src="avatar" 
      :alt="name || 'Avatar'"
      class="avatar-img"
      loading="lazy"
      @error="hasError = true"
    />
    <span v-else class="avatar-text">
      {{ textFallback }}
    </span>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { isImageAvatar, getAvatarTextFallback } from '../utils/avatarHelper'

const props = defineProps({
  avatar: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: ''
  },
  size: {
    type: [Number, String],
    default: 'md' // 'sm' (24px), 'md' (34px), 'lg' (44px), 'xl' (60px), 'xxl' (80px) ou nombre en px
  },
  shape: {
    type: String,
    default: 'circle' // 'circle' | 'rounded'
  },
  clickable: {
    type: Boolean,
    default: false
  },
  borderColor: {
    type: String,
    default: ''
  }
})

const hasError = ref(false)

watch(() => props.avatar, () => {
  hasError.value = false
})

const isImage = computed(() => isImageAvatar(props.avatar))

const textFallback = computed(() => {
  return getAvatarTextFallback(props.avatar, props.name ? props.name.charAt(0).toUpperCase() : '👤')
})

const sizeProp = computed(() => {
  if (typeof props.size === 'string' && ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'].includes(props.size)) {
    return props.size
  }
  return 'custom'
})

const shapeClass = computed(() => {
  return props.shape === 'rounded' ? 'shape-rounded' : 'shape-circle'
})

const wrapperStyle = computed(() => {
  const style = {}
  if (typeof props.size === 'number' || (typeof props.size === 'string' && !['xs', 'sm', 'md', 'lg', 'xl', 'xxl'].includes(props.size))) {
    const px = typeof props.size === 'number' ? `${props.size}px` : props.size
    style.width = px
    style.height = px
    style.minWidth = px
    style.fontSize = `calc(${px} * 0.55)`
  }
  if (props.borderColor) {
    style.boxShadow = `0 0 0 2px ${props.borderColor}`
  }
  return style
})
</script>

<style scoped>
.user-avatar-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  user-select: none;
  flex-shrink: 0;
  background: var(--bg-tertiary, #e2e8f0);
  transition: transform var(--transition-fast, 0.15s ease), box-shadow var(--transition-fast, 0.15s ease);
}

.shape-circle {
  border-radius: 50%;
}

.shape-rounded {
  border-radius: var(--radius-md, 10px);
}

.user-avatar-wrapper.clickable {
  cursor: pointer;
}

.user-avatar-wrapper.clickable:hover {
  transform: scale(1.06);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-text {
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Tailles prédéfinies */
.size-xs {
  width: 20px;
  height: 20px;
  min-width: 20px;
  font-size: 11px;
}

.size-sm {
  width: 26px;
  height: 26px;
  min-width: 26px;
  font-size: 14px;
}

.size-md {
  width: 34px;
  height: 34px;
  min-width: 34px;
  font-size: 18px;
}

.size-lg {
  width: 44px;
  height: 44px;
  min-width: 44px;
  font-size: 24px;
}

.size-xl {
  width: 60px;
  height: 60px;
  min-width: 60px;
  font-size: 32px;
}

.size-xxl {
  width: 80px;
  height: 80px;
  min-width: 80px;
  font-size: 42px;
}
</style>
