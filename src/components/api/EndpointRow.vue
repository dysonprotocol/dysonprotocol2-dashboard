<script setup lang="ts">
import { ref, computed, defineAsyncComponent, watch, onMounted } from 'vue'
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { EndpointDoc } from '@/composables/useSwaggerDocs'

const EndpointRowBody = defineAsyncComponent(() => import('./EndpointRowBody.vue'))

const props = defineProps<{
  endpoint: EndpointDoc
  expand?: boolean
  initialParams?: Record<string, string> | null
}>()

const rowRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const copied = ref(false)
// Track if we should scroll when body is ready
const scrollOnReady = ref(false)

async function copyPath(e: Event) {
  e.stopPropagation()
  await navigator.clipboard.writeText(props.endpoint.path)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

const operationName = computed(() => {
  const opId = props.endpoint.operationId || ''
  const parts = opId.split(/[._]/)
  const queryIdx = parts.findIndex((p) => p === 'Query' || p === 'Msg')
  if (queryIdx >= 0 && queryIdx < parts.length - 1) {
    return parts.slice(queryIdx + 1).join('')
  }
  return parts[parts.length - 1]?.replace(/Request$/, '') || opId
})

const paramCount = computed(() => props.endpoint.parameters?.length || 0)

const methodColor = computed(() => 'bg-muted text-muted-foreground')

// Use raw operationId as anchor (e.g., dysonprotocol.script.v1.QueryGetBlockRequest)
const anchorId = computed(() => props.endpoint.operationId)

function scrollIntoView() {
  // Use native scrollIntoView - works with any scrollable ancestor
  // scroll-margin-top on the element handles header offset
  rowRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onBodyReady() {
  if (scrollOnReady.value) {
    scrollOnReady.value = false
    // Wait for collapsible animations to settle (typically 200-300ms)
    setTimeout(() => scrollIntoView(), 350)
  }
}

// Handle expand prop - use immediate:true to catch initial mount with expand=true
watch(
  () => props.expand,
  (v) => {
    if (v) {
      isOpen.value = true
      scrollOnReady.value = true
    }
  },
  { immediate: true }
)

// Fallback: if already open on mount and expand is true, ensure we scroll
onMounted(() => {
  if (props.expand && isOpen.value) {
    scrollOnReady.value = true
  }
})
</script>

<template>
  <!-- scroll-margin-top accounts for fixed header when using scrollIntoView -->
  <div ref="rowRef" :id="anchorId" class="scroll-mt-20">
    <Collapsible
      v-model:open="isOpen"
      class="border last:border-b rounded-md my-3 hover:border-success bg-background/90 transition-colors"
      :data-operation-id="endpoint.operationId"
    >
      <CollapsibleTrigger class="w-full cursor-pointer">
        <div class="flex items-start gap-2 p-3 text-left">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <code class="font-mono text-sm font-semibold select-all break-all">{{
                endpoint.path
              }}</code>
            </div>
            <div class="mt-1">
              <span class="text-xs font-medium text-foreground/80 select-all"
                >/{{ props.endpoint.operationId }}</span
              >
              <span v-if="endpoint.summary" class="text-xs text-muted-foreground">
                — {{ endpoint.summary }}
              </span>
            </div>
          </div>
          <ChevronUp v-if="isOpen" class="h-5 w-5 text-muted-foreground shrink-0" />
          <ChevronDown v-else class="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <EndpointRowBody
          v-if="isOpen"
          :endpoint="endpoint"
          :initial-params="initialParams"
          @close="isOpen = false"
          @ready="onBodyReady"
        />
      </CollapsibleContent>
    </Collapsible>
  </div>
</template>
