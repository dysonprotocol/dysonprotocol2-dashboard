<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { SchemaDoc } from '@/composables/useSwaggerDocs'
import { useSwaggerDocsGlobal } from '@/composables/useSwaggerDocs'
import PropertyList from './PropertyList.vue'

const props = defineProps<{ schema: SchemaDoc; expand?: boolean }>()

const { definitions } = useSwaggerDocsGlobal()

const isOpen = ref(false)

function sanitizeAnchor(s: string) {
  return s.replace(/[^A-Za-z0-9_.-]/g, '-')
}

const anchorId = computed(() => `type-${sanitizeAnchor(props.schema.name)}`)

watch(
  () => props.expand,
  (v) => {
    if (v) isOpen.value = true
  }
)

// Build example JSON from schema
const exampleJson = computed(() => {
  return buildExample(props.schema.schema, definitions.value)
})

function buildExample(schema: any, defs: Record<string, any>, depth = 0): any {
  if (depth > 5) return '...'
  if (!schema) return null

  if (schema.$ref) {
    const refName = schema.$ref.replace('#/definitions/', '')
    const def = defs[refName]
    if (def) return buildExample(def, defs, depth + 1)
    return {}
  }

  if (schema.type === 'object' && schema.properties) {
    const obj: Record<string, any> = {}
    for (const [key, prop] of Object.entries(schema.properties as Record<string, any>)) {
      obj[key] = buildExample(prop, defs, depth + 1)
    }
    return obj
  }

  if (schema.type === 'array' && schema.items) {
    return [buildExample(schema.items, defs, depth + 1)]
  }

  if (schema.type === 'string') {
    if (schema.format === 'date-time') return '2025-01-01T00:00:00Z'
    if (schema.format === 'byte') return 'base64...'
    if (schema.format === 'uint64' || schema.format === 'int64') return '0'
    return 'string'
  }
  if (schema.type === 'integer' || schema.type === 'number') return 0
  if (schema.type === 'boolean') return false

  return null
}
</script>

<template>
  <div :id="anchorId">
    <Collapsible v-model:open="isOpen" class="border rounded bg-muted/30">
      <CollapsibleTrigger class="w-full cursor-pointer">
        <div class="flex items-start gap-3 p-3 text-left">
          <div class="flex-1 min-w-0">
            <code class="text-sm font-semibold">/{{ schema.name }}</code>
            <pre
              v-if="schema.description"
              class="text-xs text-muted-foreground mt-0.5 line-clamp-2 whitespace-pre-wrap font-sans m-0"
              >{{ schema.description }}</pre
            >
          </div>
          <ChevronUp v-if="isOpen" class="h-5 w-5 text-muted-foreground shrink-0" />
          <ChevronDown v-else class="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <!-- Only render when open -->
        <div v-if="isOpen" class="px-3 pb-3 border-t border-border/50">
          <!-- Properties (recursive) -->
          <div v-if="schema.properties && Object.keys(schema.properties).length > 0" class="mt-3">
            <div class="text-sm font-medium mb-2">Properties</div>
            <PropertyList :properties="schema.properties" />
          </div>

          <!-- Example JSON -->
          <div class="mt-4">
            <div class="text-sm font-medium mb-2">Example</div>
            <pre class="bg-zinc-900 text-zinc-100 p-3 rounded text-xs overflow-x-auto max-h-60">{{
              JSON.stringify(exampleJson, null, 2)
            }}</pre>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  </div>
</template>
