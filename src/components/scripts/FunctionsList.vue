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
import { computed } from 'vue'
import ScriptFunctionItem from './ScriptFunctionItem.vue'

const props = defineProps<{ functions: any[]; address: string; hasUnsavedChanges?: boolean }>()
defineEmits(['focus-code'])

// Normalize to array and filter only items with a function_name (schema may load later)
const functions = computed(() => {
  const arr = Array.isArray(props.functions) ? props.functions : []
  return arr.filter((f) => f && f.function_name)
})
</script>
