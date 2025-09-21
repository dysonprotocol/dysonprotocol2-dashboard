<template>
  <div class="p-4 space-y-4">
    <h2 class="text-xl font-semibold">Pools for {{ address }}</h2>
    <div class="text-sm text-muted-foreground">Coming soon: pools by owner</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const address = computed(() => String(route.params.address || ''))
</script>
