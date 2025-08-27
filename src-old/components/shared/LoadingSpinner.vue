<template>
  <div :class="containerClasses">
    <div :class="spinnerClasses"></div>
    <span v-if="message" :class="messageClasses">{{ message }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: {
    type: String,
    default: 'md', // 'xs', 'sm', 'md', 'lg'
    validator: (value) => ['xs', 'sm', 'md', 'lg'].includes(value)
  },
  message: {
    type: String,
    default: null
  },
  centered: {
    type: Boolean,
    default: false
  },
  overlay: {
    type: Boolean,
    default: false
  }
})

const containerClasses = computed(() => {
  let classes = 'flex items-center gap-2'
  
  if (props.centered) {
    classes += ' justify-center'
  }
  
  if (props.overlay) {
    classes += ' fixed inset-0 bg-base-300 bg-opacity-50 z-50'
  }
  
  return classes
})

const spinnerClasses = computed(() => {
  let classes = 'loading loading-spinner'
  
  switch (props.size) {
    case 'xs':
      classes += ' loading-xs'
      break
    case 'sm':
      classes += ' loading-sm'
      break
    case 'lg':
      classes += ' loading-lg'
      break
    case 'md':
    default:
      classes += ' loading-md'
      break
  }
  
  return classes
})

const messageClasses = computed(() => {
  let classes = 'text-base-content'
  
  switch (props.size) {
    case 'xs':
      classes += ' text-xs'
      break
    case 'sm':
      classes += ' text-sm'
      break
    case 'lg':
      classes += ' text-lg'
      break
    case 'md':
    default:
      classes += ' text-base'
      break
  }
  
  return classes
})
</script>
