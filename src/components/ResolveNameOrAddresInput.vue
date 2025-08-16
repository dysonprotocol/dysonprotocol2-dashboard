<template>
  <slot
    :inputValue="inputValue"
    :rawValue="rawValue"
    :original="original"
    :isResolving="isResolving"
    :err="err"
    :showResolve="showResolve"
    :canResolve="canResolve"
    :labelSuffix="labelSuffix"
    :disabled="disabled"
    :onInput="onInput"
    :onResolve="resolve"
  />
</template>

<script setup>
import { ref, computed, inject, watch } from "vue";

const props = defineProps({
  modelValue: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const chainInfo = inject("chainInfo", { restUrl: "" });

const rawValue = ref("");
const inputValue = ref("");
const original = ref("");
const isResolving = ref(false);
const err = ref("");

const isBech32 = (v) => v.startsWith("dys2");
const showResolve = computed(() => rawValue.value && !isBech32(rawValue.value));
const labelSuffix = computed(() => (original.value ? original.value : ""));
const canResolve = computed(() => !!(rawValue.value && rawValue.value.trim()));

watch(
  () => props.modelValue,
  (v) => {
    if (v !== inputValue.value) inputValue.value = v || "";
  },
  { immediate: true }
);

function onInput(e) {
  err.value = "";
  original.value = "";
  rawValue.value = e.target.value.trim();
  inputValue.value = rawValue.value;
  if (isBech32(rawValue.value)) emit("update:modelValue", rawValue.value);
  else emit("update:modelValue", "");
}

async function resolve() {
  err.value = "";
  isResolving.value = true;
  try {
    const q = encodeURIComponent(rawValue.value.trim());
    const url = `${chainInfo.restUrl}/dysonprotocol/nameservice/v1/resolve_name/${q}`;
    const r = await fetch(url);
    const text = await r.text();
    let j = null;
    try {
      j = text ? JSON.parse(text) : null;
    } catch {}
    if (!r.ok) {
      err.value = String(j?.message || text || `HTTP ${r.status}`);
      return;
    }
    if (!j) throw new Error("Empty response");
    const addr = String(j?.address || "");
    if (!isBech32(addr)) throw new Error("Name did not resolve to address");
    if (addr !== rawValue.value) original.value = rawValue.value;
    inputValue.value = addr;
    emit("update:modelValue", addr);
  } catch (e) {
    err.value = e?.message || "Failed to resolve";
  } finally {
    isResolving.value = false;
  }
}
</script>

<style scoped></style>
