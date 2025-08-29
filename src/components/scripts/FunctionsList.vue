<template>
  <ScriptFunctionItem
    v-for="fn in functions"
    :key="fn.function_name"
    :func="fn"
    :address="address"
    :has-unsaved-changes="hasUnsavedChanges"
    @focus-code="$emit('focus-code')"
  />
</template>

<script setup lang="ts">
import ScriptFunctionItem from './ScriptFunctionItem.vue'

const props = defineProps<{ functions: any[]; address: string; hasUnsavedChanges?: boolean }>()
const emit = defineEmits(['focus-code'])
</script>
