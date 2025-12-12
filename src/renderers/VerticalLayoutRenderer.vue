<script setup lang="ts">
import type { VerticalLayout } from '@jsonforms/core'
import { rendererProps, useJsonFormsLayout, DispatchRenderer } from '@jsonforms/vue'

const props = defineProps(rendererProps<VerticalLayout>())
const { layout } = useJsonFormsLayout(props)
</script>

<template>
  <div class="space-y-1">
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
</template>
