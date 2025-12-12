<script setup lang="ts">
import { computed } from 'vue'
import type { ControlElement, JsonSchema } from '@jsonforms/core'
import { rendererProps, useJsonFormsControl, DispatchRenderer } from '@jsonforms/vue'
import { Generate } from '@jsonforms/core'
import { Label } from '@/components/ui/label'

const props = defineProps(rendererProps<ControlElement>())
const { control } = useJsonFormsControl(props)

const label = computed(() => control.value.label || control.value.path?.split('/').pop() || '')

// Generate a UI schema for the object properties
const detailUiSchema = computed(() => {
  const schema = control.value.schema as JsonSchema
  if (!schema) return undefined
  return Generate.uiSchema(schema, 'VerticalLayout')
})
</script>

<template>
  <div class="mb-3">
    <Label class="text-sm font-medium mb-2 block">
      {{ label }}
      <span v-if="control.required" class="text-destructive">*</span>
    </Label>
    <p v-if="control.description" class="text-xs text-muted-foreground mb-2">
      {{ control.description }}
    </p>
    <div class="border rounded-md p-3 bg-muted/20">
      <DispatchRenderer
        v-if="detailUiSchema"
        :schema="control.schema"
        :uischema="detailUiSchema"
        :path="control.path"
        :enabled="control.enabled"
        :renderers="control.renderers"
        :cells="control.cells"
      />
    </div>
    <p v-if="control.errors" class="text-xs text-destructive mt-1">
      {{ control.errors }}
    </p>
  </div>
</template>
