<template>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="flex flex-col">
        <span class="font-mono text-lg">{{ formattedAmount }}</span>
        <span class="text-sm opacity-70">{{ displayDenom }}</span>
      </div>
      <div 
        v-if="showIcon"
        class="w-8 h-8 bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-content text-xs font-bold"
      >
        {{ denomIcon }}
      </div>
    </div>
    <div v-if="showActions" class="flex gap-1">
      <button 
        v-if="copyable"
        @click="copyAmount"
        class="btn btn-ghost btn-sm p-1 opacity-50 hover:opacity-100"
        title="Copy amount"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
      <button 
        v-if="sendable"
        @click="handleSend"
        class="btn btn-ghost btn-sm p-1 opacity-50 hover:opacity-100"
        title="Send coins"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSmartNavigation } from '../../composables/useSmartNavigation'

const props = defineProps({
  amount: {
    type: [String, Number],
    required: true
  },
  denom: {
    type: String,
    required: true
  },
  showIcon: {
    type: Boolean,
    default: true
  },
  showActions: {
    type: Boolean,
    default: true
  },
  copyable: {
    type: Boolean,
    default: true
  },
  sendable: {
    type: Boolean,
    default: true
  },
  precision: {
    type: Number,
    default: 6
  }
})

const emit = defineEmits(['send'])

const { copyToClipboard } = useSmartNavigation()

const formattedAmount = computed(() => {
  const num = Number(props.amount)
  if (isNaN(num)) return props.amount
  
  // Format large numbers with appropriate precision
  if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + 'M'
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(2) + 'K'
  } else if (num >= 1) {
    return num.toFixed(Math.min(props.precision, 2))
  } else {
    return num.toFixed(props.precision)
  }
})

const displayDenom = computed(() => {
  // Handle different denomination formats
  if (props.denom.startsWith('u')) {
    // Micro denominations (udys -> DYS)
    return props.denom.slice(1).toUpperCase()
  } else if (props.denom.includes('/')) {
    // IBC denominations - show last part
    const parts = props.denom.split('/')
    return parts[parts.length - 1].toUpperCase()
  } else if (props.denom.endsWith('.dys')) {
    // Name-derived tokens
    return props.denom
  } else {
    return props.denom.toUpperCase()
  }
})

const denomIcon = computed(() => {
  // Generate icon from denomination
  const denom = displayDenom.value
  if (denom.length >= 2) {
    return denom.slice(0, 2)
  }
  return denom.slice(0, 1)
})

const handleSend = () => {
  emit('send', { amount: props.amount, denom: props.denom })
}

const copyAmount = async () => {
  const copyText = `${props.amount} ${props.denom}`
  const success = await copyToClipboard(copyText, 'Amount')
  if (success) {
    // TODO: Show toast notification
  }
}
</script>
