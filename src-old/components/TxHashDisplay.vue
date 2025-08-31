<template>
  <span
    :title="hash"
    :data-tip="tooltipText"
    class="tooltip font-mono cursor-pointer hover:text-primary text-xs"
    @click="copy"
  >
    {{
      truncate && truncate < hash.length
        ? `${hash.slice(0, truncate + 5)}...${hash.slice(-truncate)}`
        : hash
    }}
  </span>
</template>

<script setup>
import { ref, onBeforeUnmount } from "vue";

const { hash, truncate } = defineProps({
  hash: String,
  truncate: { type: Number, default: false },
});

const tooltipText = ref("copy tx hash");
let resetTimerId = null;

function copy() {
  navigator.clipboard.writeText(hash);
  tooltipText.value = "copied";

  if (resetTimerId) clearTimeout(resetTimerId);
  resetTimerId = setTimeout(() => {
    tooltipText.value = "copy tx hash";
    resetTimerId = null;
  }, 1000);
}

onBeforeUnmount(() => {
  if (resetTimerId) clearTimeout(resetTimerId);
});
</script>
