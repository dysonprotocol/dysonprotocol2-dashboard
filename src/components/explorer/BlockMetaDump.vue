<script setup lang="ts">
import { computed, toRefs } from 'vue'

const props = defineProps<{ meta: Record<string, unknown> }>()
const { meta } = toRefs(props)

const dump = computed(() => JSON.stringify(meta.value || {}, null, 2))

function copy() {
  navigator.clipboard?.writeText(dump.value).catch((e) => console.error(e))
}

function download() {
  const blob = new Blob([dump.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'block.json'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="border rounded">
    <div class="flex items-center justify-between px-3 py-2 border-b">
      <div class="font-medium">Raw Block (JSON)</div>
      <div class="flex gap-2">
        <button class="btn btn-xs" @click="copy">Copy</button>
        <button class="btn btn-xs" @click="download">Download</button>
      </div>
    </div>
    <div class="overflow-x-auto">
      <pre class="p-3"><code>{{ dump }}</code></pre>
    </div>
  </div>
</template>
