<script setup lang="ts">
import { computed } from 'vue'
import type { ControlElement } from '@jsonforms/core'
import { rendererProps, useJsonFormsControl } from '@jsonforms/vue'
import { Label } from '@/components/ui/label'

const props = defineProps(rendererProps<ControlElement>())
const { control, handleChange } = useJsonFormsControl(props)

const label = computed(() => control.value.label || control.value.path?.split('/').pop() || '')
const fieldId = computed(() => `field-${control.value.path?.replace(/\//g, '-')}`)

function onChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  handleChange(control.value.path, checked)
}
</script>

<template>
  <div class="flex items-start gap-2 mb-3">
    <input
      type="checkbox"
      :id="fieldId"
      :checked="control.data === true"
      class="mt-0.5 h-4 w-4 shrink-0 rounded-[4px] border border-input shadow-xs accent-primary focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      @change="onChange"
    />
    <div class="space-y-0.5">
      <Label :for="fieldId" class="text-sm font-medium cursor-pointer">
        {{ label }}
        <span v-if="control.required" class="text-destructive">*</span>
      </Label>
      <p v-if="control.description" class="text-xs text-muted-foreground">
        {{ control.description }}
      </p>
      <p v-if="control.errors" class="text-xs text-destructive">
        {{ control.errors }}
      </p>
    </div>
  </div>
</template>
