<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useMagicKeys, whenever } from '@vueuse/core'
import CommandPalette from '@/components/CommandPalette.vue'

const router = useRouter()

// Global keyboard shortcuts (Shift+Cmd to avoid OS conflicts)
const { shift_meta_n, shift_meta_b, shift_meta_x, shift_meta_v, shift_meta_a } = useMagicKeys()
whenever(shift_meta_n, () => router.push({ name: 'NameList' }))
whenever(shift_meta_b, () => router.push({ name: 'BlocksList' }))
whenever(shift_meta_x, () => router.push({ name: 'TxsList' }))
whenever(shift_meta_v, () => router.push({ name: 'ValidatorsList' }))
whenever(shift_meta_a, () => router.push({ name: 'ApiIndex' }))
</script>

<template>
  <div class="flex min-h-[80vh] flex-col items-center justify-center p-4">
    <div class="w-full max-w-2xl space-y-6">
      <div class="text-center">
        <h1 class="text-3xl font-bold tracking-tight">Dyson Protocol 2</h1>
        <p class="mt-2 text-muted-foreground">
          Search for addresses, transactions, names, blocks, or API endpoints
        </p>
      </div>

      <CommandPalette />

      <p class="text-center text-xs text-muted-foreground">
        Press <kbd class="rounded border bg-muted px-1.5 py-0.5 text-xs">⌘K</kbd> anywhere to open
        search
      </p>
    </div>
  </div>
</template>
