<template>
  <div class="script-navigation">
    <div class="divide-y divide-gray-200">
      <!-- Extra Code -->
      <ScriptExtraCode
        :address="address"
        :current-script-content="currentScriptContent"
        :has-unsaved-changes="hasUnsavedChanges"
        @focus-code="$emit('focus-code')"
      />

      <!-- No Functions Message -->
      <div v-if="functions.length === 0" class="text-center py-8 text-gray-500">
        <div class="text-sm">No functions found</div>
        <div class="text-xs mt-1">Add function definitions to your script</div>
      </div>

      <!-- Functions -->
      <ScriptFunctionItem
        v-for="f in functions"
        :key="f.function_name"
        :address="address"
        :func="f"
        :has-unsaved-changes="hasUnsavedChanges"
        @function-executed="(payload) => $emit('function-executed', payload)"
        @focus-code="$emit('focus-code')"
      />
    </div>
  </div>
</template>

<script setup>
import ScriptExtraCode from "@/components/scripts/ScriptExtraCode.vue";
import ScriptFunctionItem from "@/components/scripts/ScriptFunctionItem.vue";

const props = defineProps({
  address: { type: String, required: true },
  functions: { type: Array, default: () => [] },
  script: { type: Object, default: null },
  currentScriptContent: { type: String, default: "" },
  executionErrors: { type: Object, default: () => ({}) },
  executionResults: { type: Object, default: () => ({}) },
  executionErrorContext: { type: Object, default: () => ({}) },
  hasUnsavedChanges: { type: Boolean, default: false },
});

defineEmits(["function-executed", "focus-code"]);
</script>

<style scoped>
.script-navigation > * + * {
  margin-top: 1rem;
}

.script-navigation .collapse {
  border-radius: 0;
}
</style>
