<template>
  <div class="flex items-center gap-2">
    <button 
      :class="buttonClasses"
      :title="`Name: ${name} (NFT of class namespace.dys)`"
      @click="handleClick"
    >
      {{ displayName }}
    </button>
    <button 
      v-if="copyable"
      class="btn btn-ghost btn-sm p-1 opacity-50 hover:opacity-100"
      title="Copy name"
      @click="copyName"
    >
      <svg
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2" 
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    </button>
    <div 
      v-if="showNFTBadge"
      class="badge badge-sm badge-outline"
      title="This name is an NFT of class namespace.dys"
    >
      NFT
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSmartNavigation } from '../../composables/useSmartNavigation'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  clickable: {
    type: Boolean,
    default: true
  },
  copyable: {
    type: Boolean,
    default: true
  },
  showNFTBadge: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'link', // 'link', 'button', 'text'
    validator: (value) => ['link', 'button', 'text'].includes(value)
  }
})

const emit = defineEmits(['click'])

const { navigateToName, navigateToNFT, copyToClipboard } = useSmartNavigation()

const displayName = computed(() => {
  return props.name.endsWith('.dys') ? props.name : `${props.name}.dys`
})

const buttonClasses = computed(() => {
  const baseClasses = 'font-medium transition-all duration-200'
  
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
      return `${baseClasses} link link-secondary hover:link-accent`
  }
})

const handleClick = () => {
  if (!props.clickable) return
  
  emit('click', props.name)
  
  // Names are NFTs of class "namespace.dys"
  // Navigate to name view (which will show NFT context)
  navigateToName(props.name)
}

const copyName = async () => {
  const success = await copyToClipboard(displayName.value, 'Name')
  if (success) {
    // TODO: Show toast notification
  }
}
</script>
