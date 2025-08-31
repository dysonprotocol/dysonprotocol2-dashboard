<script setup lang="ts">
defineProps<{ validators: Array<{ address: string; voting_power: string }> }>()
</script>

<template>
  <details class="border rounded">
    <summary class="cursor-pointer px-3 py-2 font-medium">Validators</summary>
    <div class="divide-y">
      <div v-for="v in validators" :key="v.address" class="p-2 text-sm flex justify-between">
        <div class="font-mono truncate max-w-[70%]">{{ v.address }}</div>
        <div class="text-gray-500">{{ v.voting_power }}</div>
      </div>
    </div>
  </details>
</template>
