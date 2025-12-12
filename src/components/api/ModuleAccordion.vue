<script setup lang="ts">
import { computed } from 'vue'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import MsgListItem from './MsgListItem.vue'
import type { MsgDoc } from '@/composables/useSwaggerDocs'

const props = defineProps<{
  module: string
  queries: MsgDoc[]
  txs: MsgDoc[]
}>()

const displayName = computed(() => props.module.replace(/\./g, ' › '))
</script>

<template>
  <Accordion type="single" collapsible>
    <AccordionItem :value="module" class="border-b">
      <AccordionTrigger class="py-2 hover:no-underline">
        <span class="font-medium">{{ displayName }}</span>
        <span class="ml-auto mr-2 text-xs text-muted-foreground">
          {{ queries.length }} queries · {{ txs.length }} txs
        </span>
      </AccordionTrigger>
      <AccordionContent class="pb-2">
        <div v-if="queries.length" class="mb-2">
          <div class="text-xs text-muted-foreground mb-1">Queries</div>
          <MsgListItem v-for="msg in queries" :key="msg.operationId" :msg="msg" />
        </div>
        <div v-if="txs.length">
          <div class="text-xs text-muted-foreground mb-1">Transactions</div>
          <MsgListItem v-for="msg in txs" :key="msg.operationId" :msg="msg" />
        </div>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</template>
