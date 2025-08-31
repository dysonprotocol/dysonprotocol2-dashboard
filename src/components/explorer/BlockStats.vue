<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{
  txCount: number
  gasUsed?: number
  successCount?: number
}>()

const successRate = computed(() => {
  if (!props.txCount) return 0
  const ok = Number(props.successCount || 0)
  return Math.round((ok / props.txCount) * 100)
})
</script>

<template>
  <div class="stats shadow">
    <div class="stat">
      <div class="stat-title">Transactions</div>
      <div class="stat-value text-base">{{ txCount }}</div>
    </div>
    <div class="stat">
      <div class="stat-title">Success</div>
      <div class="stat-value text-base">{{ successCount ?? 0 }}</div>
      <div class="stat-desc">{{ successRate }}%</div>
    </div>
    <div class="stat">
      <div class="stat-title">Gas Used</div>
      <div class="stat-value text-base">{{ gasUsed ?? 0 }}</div>
    </div>
  </div>
</template>
