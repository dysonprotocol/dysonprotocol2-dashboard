<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import type { ComboboxItemProps } from 'reka-ui'
import { ComboboxItem } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<ComboboxItemProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
</script>

<template>
  <ComboboxItem
    v-bind="delegatedProps"
    :class="
      cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:opacity-50',
        props.class
      )
    "
  >
    <slot />
  </ComboboxItem>
</template>





