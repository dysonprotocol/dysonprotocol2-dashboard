<script setup lang="ts">
const props = defineProps<{
  height: string
  time: string
  hash: string
  proposer: string
  prevHeight: number | null
  nextHeight: number | null
}>()

function copy(text: string) {
  if (!text) return
  navigator.clipboard?.writeText(text).catch((e) => console.error(e))
}
</script>

<template>
  <div class="flex items-center justify-between">
    <div>
      <div class="text-2xl font-bold">Block {{ height }}</div>
      <div class="text-sm text-gray-600">{{ time }}</div>
      <div class="text-sm break-all mt-1">
        <span class="text-gray-500">Hash:</span>
        <span class="font-mono">{{ hash }}</span>
        <button class="btn btn-ghost btn-xs ml-2" @click="copy(hash)">Copy</button>
      </div>
      <div class="text-sm break-all">
        <span class="text-gray-500">Proposer:</span> <span class="font-mono">{{ proposer }}</span>
      </div>
    </div>
    <div class="flex gap-2">
      <RouterLink
        v-if="prevHeight"
        :to="{ name: 'BlockDetail', params: { height: prevHeight } }"
        class="btn btn-sm btn-outline"
      >
        ← Prev
      </RouterLink>
      <RouterLink
        v-if="nextHeight"
        :to="{ name: 'BlockDetail', params: { height: nextHeight } }"
        class="btn btn-sm btn-outline"
      >
        Next →
      </RouterLink>
    </div>
  </div>
</template>
