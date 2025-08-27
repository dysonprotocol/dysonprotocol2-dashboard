<template>
  <div class="toast toast-center toast-bottom z-[70]">
    <div
      v-for="item in visibleHistory"
      :key="item.txHash + ':' + item.status"
      :class="{
        'alert-success': item.status === 'success',
        'alert-error': item.status === 'failed' || item.status === 'error',
        'alert-info': item.status === 'pending',
      }"
      class="alert alert-soft shadow wrap-anywhere flex items-center justify-between flex-wrap gap-4"
    >
      <span class="text-sm">
        <span class="">{{ item.type || "unknown" }}</span
        >:
        <span class="">{{ item.status }}</span>
      </span>
      <TransactionLink :hash="item.txHash" :truncate="8" variant="link" />
      <button
        class="btn btn-ghost btn-xs ml-1"
        @click="$emit('dismiss', item.txHash)"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import TransactionLink from "@/components/shared/TransactionLink.vue";

const props = defineProps({
  history: {
    type: Array,
    default: () => [],
  },
  limit: {
    type: Number,
    default: 4,
  },
});

defineEmits(["dismiss"]);

const visibleHistory = computed(() => {
  const list = Array.isArray(props.history) ? props.history : [];
  return list.slice(0, props.limit);
});
</script>
