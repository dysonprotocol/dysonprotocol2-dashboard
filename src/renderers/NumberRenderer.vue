<script setup lang="ts">
import { computed } from 'vue'
import type { ControlElement } from '@jsonforms/core'
import { rendererProps, useJsonFormsControl } from '@jsonforms/vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const props = defineProps(rendererProps<ControlElement>())
const { control, handleChange } = useJsonFormsControl(props)

const label = computed(() => control.value.label || control.value.path?.split('/').pop() || '')

function onInput(value: string | number) {
  // Convert to number or keep as string if empty
  const numValue = value === '' ? undefined : Number(value)
  handleChange(control.value.path, numValue)
}
</script>

<template>
  <div class="space-y-1.5 mb-3">
    <Label class="text-sm font-medium">
      {{ label }}
      <span v-if="control.required" class="text-destructive">*</span>
    </Label>
    <Input type="number" :model-value="control.data ?? ''" @update:model-value="onInput" />
    <p v-if="control.description" class="text-xs text-muted-foreground">
      {{ control.description }}
    </p>
    <p v-if="control.errors" class="text-xs text-destructive">
      {{ control.errors }}
    </p>
  </div>
</template>
