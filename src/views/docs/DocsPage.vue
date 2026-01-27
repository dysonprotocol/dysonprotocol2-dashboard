<template>
  <component :is="docComponent" v-if="docComponent" />
  <div v-else class="text-center py-12">
    <h1 class="text-2xl font-bold mb-2">Page Not Found</h1>
    <p class="text-base-content/60">The documentation page "{{ path }}" does not exist.</p>
    <router-link to="/docs" class="btn btn-primary mt-4">Back to Docs</router-link>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, type Component } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const path = computed(() => route.params.path as string)

const docModules = import.meta.glob<{ default: Component }>('@/docs/**/*.md')

const docComponent = computed(() => {
  const p = path.value
  const candidates = [
    `/src/docs/${p}.md`,
    `/src/docs/${p}/index.md`,
  ]

  for (const candidate of candidates) {
    const loader = docModules[candidate]
    if (loader) {
      return defineAsyncComponent(loader)
    }
  }
  return null
})
</script>
