<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { MsgDoc } from '@/composables/useSwaggerDocs'

defineProps<{ msg: MsgDoc }>()
</script>

<template>
  <RouterLink
    :to="`/docs/api/${msg.module}/${msg.operationId}`"
    class="block py-1 hover:bg-muted/50 transition-colors"
  >
    <code class="text-xs">{{ msg.typeUrl }}</code>
    <span v-if="msg.summary" class="text-xs text-muted-foreground ml-2">{{ msg.summary }}</span>
  </RouterLink>
</template>
