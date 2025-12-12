<script setup lang="ts">
import { ref } from 'vue'
import { Check, Copy } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

defineProps<{
  code: string
  language?: string
}>()

const copied = ref(false)

async function copyCode(code: string) {
  await navigator.clipboard.writeText(code)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <div class="relative group">
    <pre
      class="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono"
    ><code :class="language ? `language-${language}` : ''">{{ code }}</code></pre>
    <Button
      variant="ghost"
      size="icon"
      class="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
      @click="copyCode(code)"
    >
      <Check v-if="copied" class="h-4 w-4 text-green-500" />
      <Copy v-else class="h-4 w-4" />
    </Button>
  </div>
</template>





