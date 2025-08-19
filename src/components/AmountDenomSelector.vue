<template>
  <div class="join">
    <input
      :value="amountDisplay"
      @input="onAmountInput"
      type="number"
      min="0"
      step="0.000001"
      placeholder="Amount"
      class="input input-md join-item"
      :disabled="disabled"
    />
    <select
      v-model="selectedBaseDenom"
      class="select select-md join-item"
      :disabled="disabled || options.length === 0"
    >
      <option v-for="opt in options" :key="opt.base" :value="opt.base">
        {{ opt.display }}
      </option>
    </select>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useWallet } from "@/composables/useWallet";

const props = defineProps({
  baseDenoms: { type: Array, default: () => [] },
  defaultBaseDenom: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(["update:base", "update:display"]);

const { loadDenomMetadata, getDisplayOptions } = useWallet();

const amountDisplay = ref("");
const selectedBaseDenom = ref("");

const options = computed(() =>
  getDisplayOptions({ allowedBases: props.baseDenoms })
);

function initializeSelection() {
  if (
    props.defaultBaseDenom &&
    options.value.some((o) => o.base === props.defaultBaseDenom)
  ) {
    selectedBaseDenom.value = props.defaultBaseDenom;
    return;
  }
  selectedBaseDenom.value = options.value[0]?.base || "";
}

function computeAndEmit() {
  const opt = options.value.find((o) => o.base === selectedBaseDenom.value);
  const displayDenom = opt?.display || "";
  const amountStr = String(amountDisplay.value || "");

  // Always emit current display state
  emit("update:display", { amount: amountStr, denom: displayDenom });

  if (!displayDenom || amountStr === "") {
    emit("update:base", { amount: "", denom: selectedBaseDenom.value || "" });
    return;
  }

  // Convert display -> base using exponent from options (no metadata lookup ambiguity)
  const exponent = Number(opt?.exponent || 0);
  const raw = amountStr.trim();
  const hasDot = raw.includes(".");
  const [a, bRaw] = hasDot ? raw.split(".") : [raw, ""];
  const frac = (bRaw || "").slice(0, exponent);
  const pad = Math.max(0, exponent - frac.length);
  const baseAmountRaw = (a || "0") + (frac + "0".repeat(pad));
  // Remove leading zeros but keep a single zero if value is zero
  const baseAmountStr = baseAmountRaw.replace(/^0+(?!$)/, "");

  emit("update:base", {
    amount: baseAmountStr || "0",
    denom: selectedBaseDenom.value || "",
  });
}

function onAmountInput(event) {
  amountDisplay.value = event.target.value;
}

watch(
  [amountDisplay, selectedBaseDenom, () => props.baseDenoms],
  computeAndEmit
);

watch(
  () => options.value.map((o) => o.base).join("|"),
  () => initializeSelection()
);

onMounted(async () => {
  await loadDenomMetadata();
  initializeSelection();
  computeAndEmit();
});
</script>

<style scoped></style>
