<template>
  <div>
    <JsonForms
      :schema="schema"
      :uischema="uischema"
      :data="modelValue"
      :renderers="renderers"
      @change="onChange"
    />
  </div>
</template>

<script setup>
import { computed } from "vue";
import { JsonForms } from "@jsonforms/vue";
import { vanillaRenderers } from "@jsonforms/vue-vanilla";
import "@jsonforms/vue-vanilla/vanilla.css";

const props = defineProps({
  schema: { type: Object, required: true },
  uischema: {
    type: Object,
    default: () => ({ type: "VerticalLayout", elements: [] }),
  },
  modelValue: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["update:modelValue"]);

const renderers = computed(() => Object.freeze([...vanillaRenderers]));

function onChange(e) {
  emit("update:modelValue", e.data);
}
</script>
