<script setup lang="ts">
import { computed } from 'vue'
import type { GroupLayout } from '@jsonforms/core'
import { rendererProps, useJsonFormsLayout, DispatchRenderer } from '@jsonforms/vue'
import { Label } from '@/components/ui/label'

const props = defineProps(rendererProps<GroupLayout>())
const { layout } = useJsonFormsLayout(props)

const label = computed(() => layout.value.uischema?.label || '')
</script>

<template>
  <div class="mb-3">
    <Label v-if="label" class="text-sm font-medium mb-2 block">{{ label }}</Label>
    <div :class="label ? 'border rounded-md p-3 bg-muted/20' : ''">
      <DispatchRenderer
        v-for="(element, index) in layout.uischema.elements"
        :key="`${layout.path}-${index}`"
        :schema="layout.schema"
        :uischema="element"
        :path="layout.path"
        :enabled="layout.enabled"
        :renderers="layout.renderers"
        :cells="layout.cells"
      />
    </div>
  </div>
</template>
