<template>
  <div class="flex items-center gap-2">
    <button 
      @click="handleClick"
      @mouseover="showFull = true"
      @mouseleave="showFull = false"
      :class="buttonClasses"
      :title="hash"
    >
      {{ displayText }}
    </button>
    <button 
      v-if="copyable"
      @click="copyHash"
      class="btn btn-ghost btn-sm p-1 opacity-50 hover:opacity-100"
      title="Copy transaction hash"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </button>
    <div 
      v-if="status"
      :class="statusClasses"
    >
      {{ status }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSmartNavigation } from '../../composables/useSmartNavigation'

const props = defineProps({
  hash: {
    type: String,
    required: true
  },
  truncate: {
    type: [Boolean, Number],
    default: 12
  },
  clickable: {
    type: Boolean,
    default: true
  },
  copyable: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    default: null,
    validator: (value) => !value || ['success', 'pending', 'failed'].includes(value)
  },
  variant: {
    type: String,
    default: 'link', // 'link', 'button', 'text'
    validator: (value) => ['link', 'button', 'text'].includes(value)
  }
})

const emit = defineEmits(['click'])

const { navigateToTransaction, copyToClipboard } = useSmartNavigation()
const showFull = ref(false)

const displayText = computed(() => {
  if (showFull.value || !props.truncate) {
    return props.hash
  }
  
  const chars = typeof props.truncate === 'number' ? props.truncate : 12
  if (props.hash.length <= chars * 2) {
    return props.hash
  }
  
  return `${props.hash.slice(0, chars)}...${props.hash.slice(-chars)}`
})

const buttonClasses = computed(() => {
  const baseClasses = 'font-mono transition-all duration-200'
  
  if (!props.clickable) {
    return `${baseClasses} cursor-default`
  }
  
  switch (props.variant) {
    case 'button':
      return `${baseClasses} btn btn-sm btn-outline`
    case 'text':
      return `${baseClasses} hover:bg-base-200 px-1`
    case 'link':
    default:
      return `${baseClasses} link link-primary hover:link-accent`
  }
})

const statusClasses = computed(() => {
  const baseClasses = 'badge badge-sm'
  
  switch (props.status) {
    case 'success':
      return `${baseClasses} badge-success`
    case 'pending':
      return `${baseClasses} badge-warning`
    case 'failed':
      return `${baseClasses} badge-error`
    default:
      return `${baseClasses} badge-outline`
  }
})

const handleClick = () => {
  if (!props.clickable) return
  
  emit('click', props.hash)
  navigateToTransaction(props.hash)
}

const copyHash = async () => {
  const success = await copyToClipboard(props.hash, 'Transaction hash')
  if (success) {
    // TODO: Show toast notification
  }
}
</script>
