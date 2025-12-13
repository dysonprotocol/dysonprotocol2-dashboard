<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import type { ComboboxContentProps } from 'reka-ui'
import { ComboboxContent, ComboboxViewport } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<ComboboxContentProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
</script>

<template>
  <ComboboxContent v-bind="delegatedProps">
    <ComboboxViewport :class="cn('max-h-[300px] overflow-y-auto overflow-x-hidden', props.class)">
      <slot />
    </ComboboxViewport>
  </ComboboxContent>
</template>
