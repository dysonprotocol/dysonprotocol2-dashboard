<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { Primitive } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
  modelValue?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  as: 'input',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
}>()

function onInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target?.value ?? '')
}
</script>

<template>
  <Primitive
    data-slot="input"
    :as="as"
    :as-child="asChild"
    :class="
      cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        props.class
      )
    "
    :value="props.modelValue as any"
    @input="onInput"
  >
    <slot />
  </Primitive>
</template>
