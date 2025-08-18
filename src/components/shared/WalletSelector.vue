<template>
  <div class="relative min-w-0 max-w-full overflow-hidden">
    <button
      type="button"
      :class="['btn', 'min-w-0', 'max-w-full', 'overflow-hidden', buttonClass]"
      @click="openModal"
    >
      <span class="ml-1 flex-1 min-w-0 truncate">{{ selectedLabel }}</span>
      <ChevronUpIcon v-if="isOpen" class="size-4 opacity-70" />
      <ChevronDownIcon v-else class="size-4 opacity-70" />
    </button>

    <dialog ref="dialogRef" class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold">Select wallet</h3>
        <ul class="mt-4">
          <li v-if="options.length === 0" class="px-4 py-2 text-sm opacity-70">
            No wallets available. Enable Keplr or add and unlock a JS wallet in
            the sidebar.
          </li>
          <li v-for="opt in options" :key="opt.address">
            <button
              type="button"
              :class="[
                'w-full text-left my-1 p-4 text-sm rounded-md border border-primary/10 hover:border-primary hover:bg-primary/10',
                opt.address === modelValue ? 'bg-primary/10' : '',
                opt.isUnlocked
                  ? 'hover:cursor-pointer'
                  : 'opacity-50 cursor-not-allowed',
              ]"
              :disabled="!opt.isUnlocked"
              @click="selectAndClose(opt.address)"
            >
              <div class="flex items-start justify-between">
                <p
                  :class="
                    opt.address === modelValue ? 'font-semibold' : 'font-normal'
                  "
                >
                  {{ opt.name }}
                  <span class="text-xs text-base-content/60"
                    >({{ opt.type }})</span
                  >
                </p>
                <span v-if="opt.address === modelValue" class="text-primary"
                  ><CheckIcon class="size-5"
                /></span>
              </div>
              <div class="mt-2">
                {{ opt.address }}
              </div>
            </button>
          </li>
        </ul>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/vue/20/solid";
import { useWallet } from "@/composables/useWallet";
import AddressDisplay from "@/components/AddressDisplay.vue";

const props = defineProps({
  modelValue: { type: String, default: "" },
  allowedAddresses: { type: Array, default: null },
  showLocked: { type: Boolean, default: true },
  defaultAddress: { type: String, default: "" },
  buttonClass: { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue"]);
const { unlockedWallets, localCosmJsWallets, loadDenomMetadata } = useWallet();

onMounted(async () => {
  try {
    await loadDenomMetadata();
  } catch {
    // ignore load errors here; component still functions
  }
});

const dialogRef = ref(null);
const isOpen = ref(false);

const allowedSet = computed(() =>
  props.allowedAddresses ? new Set(props.allowedAddresses) : null
);

function truncate(a) {
  if (!a) return "";
  return a.length <= 12 ? a : `${a.slice(0, 6)}...${a.slice(-6)}`;
}

const all = computed(() => {
  const unlocked = unlockedWallets.value.map((w) => ({
    ...w,
    isUnlocked: true,
  }));
  const lockedBase = props.showLocked
    ? localCosmJsWallets.value.filter(
        (w) => !unlockedWallets.value.some((u) => u.address === w.address)
      )
    : [];
  const locked = lockedBase.map((w) => ({
    ...w,
    isUnlocked: false,
    type: "cosmjs",
  }));
  return [...unlocked, ...locked];
});

const options = computed(() => {
  let list = all.value;
  if (allowedSet.value)
    list = list.filter((w) => allowedSet.value.has(w.address));
  if (
    props.modelValue &&
    !list.some((w) => w.address === props.modelValue && w.isUnlocked)
  )
    emit("update:modelValue", "");
  if (
    !props.modelValue &&
    props.defaultAddress &&
    list.some((w) => w.address === props.defaultAddress && w.isUnlocked)
  )
    emit("update:modelValue", props.defaultAddress);
  return list;
});

const selectedLabel = computed(() => {
  const w = options.value.find((o) => o.address === props.modelValue);
  return w ? `${w.name}` : "Select wallet";
});

function onUpdate(val) {
  emit("update:modelValue", val);
}

function openModal() {
  if (dialogRef.value) {
    dialogRef.value.showModal();
    isOpen.value = true;
  }
}

function closeModal() {
  if (dialogRef.value) {
    dialogRef.value.close();
    isOpen.value = false;
  }
}

function selectAndClose(val) {
  onUpdate(val);
  closeModal();
}

// copy removed; AddressDisplay handles presentation

onMounted(() => {
  if (!dialogRef.value) return;
  const onClose = () => (isOpen.value = false);
  dialogRef.value.addEventListener("close", onClose);
  // Store remover for onUnmounted
  dialogRef.value.__onClose = onClose;
});

onUnmounted(() => {
  if (dialogRef.value && dialogRef.value.__onClose)
    dialogRef.value.removeEventListener("close", dialogRef.value.__onClose);
});
</script>
