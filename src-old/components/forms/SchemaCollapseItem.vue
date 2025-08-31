<template>
  <div class="collapse bg-base-200">
    <input
      type="checkbox"
      @change="onToggle"
    >
    <div class="collapse-title text-sm font-mono">
      {{ title }}
    </div>
    <div class="collapse-content">
      <div class="mb-3 text-xs opacity-70">
        <span class="badge badge-outline mr-2">{{ group }}</span>
        <span>{{ path }}</span>
      </div>

      <div
        v-if="isLoading"
        class="py-6"
      >
        <span class="loading loading-spinner" />
      </div>

      <template v-else>
        <div class="mb-4">
          <label class="label"><span class="label-text">Initial data</span></label>
          <textarea
            v-model="dataJson"
            class="textarea textarea-bordered w-full font-mono text-xs"
            rows="4"
          />
          <div
            v-if="dataError"
            class="text-error text-xs mt-1"
          >
            {{ dataError }}
          </div>
        </div>

        <template v-if="schema">
          <div
            v-if="Object.keys(schema?.properties || {}).length === 0"
            class="text-xs opacity-70 mb-2"
          >
            No properties in schema.
          </div>
          <JsonSchemaForm
            v-else
            v-model="data"
            :schema="schema"
            :uischema="uischema"
          />
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import JsonSchemaForm from "@/components/forms/JsonSchemaForm.vue";

const props = defineProps({
  title: { type: String, required: true },
  path: { type: String, default: "" },
  group: { type: String, required: true },
  loader: { type: Function, default: null },
});

const isOpen = ref(false);
const isLoading = ref(false);
const schema = ref(null);
const uischema = ref(null);

const data = ref({});
const dataJson = ref("{}");
const dataError = ref("");

const onToggle = async (e) => {
  isOpen.value = e?.target?.checked ?? false;
  if (!isOpen.value || schema.value) return;
  isLoading.value = true;
  try {
    let json;
    if (typeof props.loader === "function") {
      const mod = await props.loader();
      json = mod?.default ?? mod;
    } else if (props.path) {
      const res = await fetch(props.path);
      json = await res.json();
    } else {
      json = {};
    }
    const raw = json?.schema || json;
    const resolved = resolveSchema(raw);
    schema.value = resolved || { type: "object", properties: {} };
    uischema.value = json?.uischema || buildDefaultUi(schema.value);
    syncJsonToData();
  } finally {
    isLoading.value = false;
  }
};

function buildDefaultUi(s) {
  const props = Object.keys(s?.properties || {});
  return {
    type: "VerticalLayout",
    elements: props.map((k) => ({
      type: "Control",
      scope: `#/properties/${k}`,
    })),
  };
}

function resolveSchema(raw) {
  if (raw && raw.$ref && (raw.definitions || raw.$defs)) {
    const tail = String(raw.$ref || "").replace(
      /^#\/(definitions|$defs)\//,
      ""
    );
    return raw.definitions?.[tail] || raw.$defs?.[tail] || raw;
  }
  return raw;
}

function syncJsonToData() {
  try {
    data.value = JSON.parse(dataJson.value || "{}");
    dataError.value = "";
  } catch (e) {
    dataError.value = "Invalid JSON";
  }
}

watch(dataJson, syncJsonToData);
</script>
