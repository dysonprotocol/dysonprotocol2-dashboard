<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => (route.meta?.title as string) || 'Placeholder')
</script>

<template>
  <div class="p-4 text-sm text-gray-500">
    {{ title }}
  </div>
</template>
