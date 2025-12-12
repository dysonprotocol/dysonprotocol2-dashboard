<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSwaggerDocsGlobal } from '@/composables/useSwaggerDocs'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import EndpointRow from '@/components/api/EndpointRow.vue'
import SchemaRow from '@/components/api/SchemaRow.vue'
import { Spinner } from '@/components/ui/spinner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

const route = useRoute()
const { tagOrder, byTag, schemas, endpoints, isLoading, error } = useSwaggerDocsGlobal()

// Header offset for scroll (topbar height ~56px + margin)
const SCROLL_OFFSET = 72

// Track which sections are open - use Set for O(1) lookup
const openSections = ref(new Set<string>())

// Current type and params from URL query
const activeType = ref<string | null>(null)
const activeParams = ref<Record<string, string> | null>(null)

const toggleSection = (section: string) => {
  const newSet = new Set(openSections.value)
  if (newSet.has(section)) {
    newSet.delete(section)
  } else {
    newSet.add(section)
  }
  openSections.value = newSet
}

const isSectionOpen = (section: string) => openSections.value.has(section)

// No auto-expansion - user clicks to open sections for faster initial load

const REFLECTION_TAG = 'ReflectionService'

// Preferred order: Query, Msg, Service, then alphabetical
const TAG_ORDER_PRIORITY: Record<string, number> = {
  Query: 0,
  Msg: 1,
  Service: 2,
}

function getTagPriority(tag: string): number {
  // Check if tag contains any priority keyword
  for (const [keyword, priority] of Object.entries(TAG_ORDER_PRIORITY)) {
    if (tag.includes(keyword)) return priority
  }
  return 99 // Other tags come last
}

// Schema anchor still needs sanitization for HTML id compatibility
function sanitizeAnchor(s: string) {
  return s.replace(/[^A-Za-z0-9_.-]/g, '-')
}

function schemaAnchorId(name: string) {
  return `type-${sanitizeAnchor(name)}`
}

// Filter and sort tags: Query → Msg → Service → other (alphabetically)
const visibleTags = computed(() =>
  tagOrder.value
    .filter((t) => t !== REFLECTION_TAG)
    .sort((a, b) => {
      const priorityA = getTagPriority(a)
      const priorityB = getTagPriority(b)
      if (priorityA !== priorityB) return priorityA - priorityB
      return a.localeCompare(b)
    })
)

const expandEndpointOpId = ref<string | null>(null)
const expandSchemaName = ref<string | null>(null)

function ensureSectionOpen(tag: string) {
  if (openSections.value.has(tag)) return
  openSections.value = new Set([...openSections.value, tag])
}

// Wait for DOM to settle after state change
async function waitForRender(frames = 2) {
  await nextTick()
  for (let i = 0; i < frames; i++) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }
}

function scrollToElement(id: string) {
  const el = document.getElementById(id)
  if (!el) return

  // Calculate position with header offset
  const rect = el.getBoundingClientRect()
  const scrollTop = window.scrollY + rect.top - SCROLL_OFFSET
  window.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' })
}

// Parse params from URL query string
function parseQueryParams(): { type: string | null; params: Record<string, string> | null } {
  const typeParam = route.query.type as string | undefined
  const paramsParam = route.query.params as string | undefined

  let params: Record<string, string> | null = null
  if (paramsParam) {
    try {
      params = JSON.parse(paramsParam)
    } catch (err) {
      console.warn('[api-docs] Failed to parse params from URL', err)
    }
  }

  return { type: typeParam || null, params }
}

async function applyQueryParams() {
  const { type, params } = parseQueryParams()

  // Clear previous state if no type
  if (!type) {
    activeType.value = null
    activeParams.value = null
    return
  }

  // Find endpoint by operationId (type)
  const ep = endpoints.value.find((e) => e.operationId === type)
  if (ep && ep.tags?.[0] !== REFLECTION_TAG) {
    const tag = ep.tags?.[0] || 'Other'

    // Update active state
    activeType.value = type
    activeParams.value = params

    // Open the tag section, then expand endpoint (EndpointRow handles scroll)
    ensureSectionOpen(tag)
    await waitForRender()
    expandEndpointOpId.value = ep.operationId
    return
  }

  // Check for schema/model
  const schema = schemas.value.find((s) => s.name === type || schemaAnchorId(s.name) === type)
  if (schema) {
    activeType.value = null
    activeParams.value = null

    ensureSectionOpen('models')
    await waitForRender()

    expandSchemaName.value = schema.name
    await waitForRender()

    scrollToElement(schemaAnchorId(schema.name))
  }
}

// Watch for data load completion
watch(isLoading, (loading, wasLoading) => {
  if (wasLoading && !loading) {
    applyQueryParams()
  }
})

// Watch for route query changes
watch(
  () => route.query,
  () => {
    applyQueryParams()
  },
  { deep: true }
)

onMounted(() => {
  // If data already loaded, apply immediately
  if (!isLoading.value && endpoints.value.length > 0) {
    applyQueryParams()
  }
})
</script>

<template>
  <div class="w-full px-4 py-4">
    <h1 class="text-xl font-semibold mb-4">API Explorer</h1>

    <div v-if="error" class="text-destructive mb-4">{{ error }}</div>

    <div v-if="isLoading" class="flex justify-center py-8">
      <Spinner class="h-6 w-6" />
    </div>

    <div v-else class="space-y-2">
      <!-- API Endpoints grouped by tag -->
      <Collapsible
        v-for="tag in visibleTags"
        :key="tag"
        :open="isSectionOpen(tag)"
        class="rounded-lg border bg-card"
        @update:open="toggleSection(tag)"
      >
        <CollapsibleTrigger
          class="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg cursor-pointer"
        >
          <ChevronDown v-if="isSectionOpen(tag)" class="h-4 w-4 shrink-0 text-muted-foreground" />
          <ChevronRight v-else class="h-4 w-4 shrink-0 text-muted-foreground" />
          <span class="text-base font-semibold">{{ tag }}</span>
          <span class="text-xs text-muted-foreground">({{ byTag[tag]?.length || 0 }})</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div class="space-y-2 px-4 pb-4">
            <EndpointRow
              v-for="endpoint in byTag[tag]"
              :key="endpoint.operationId"
              :endpoint="endpoint"
              :expand="expandEndpointOpId === endpoint.operationId"
              :initial-params="activeType === endpoint.operationId ? activeParams : null"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <!-- Models (Proto Schemas) -->
      <Collapsible
        :open="isSectionOpen('models')"
        class="rounded-lg border bg-card"
        @update:open="toggleSection('models')"
      >
        <CollapsibleTrigger
          class="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg cursor-pointer"
        >
          <ChevronDown
            v-if="isSectionOpen('models')"
            class="h-4 w-4 shrink-0 text-muted-foreground"
          />
          <ChevronRight v-else class="h-4 w-4 shrink-0 text-muted-foreground" />
          <span class="text-base font-semibold">Models</span>
          <span class="text-xs text-muted-foreground">({{ schemas.length }})</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div class="space-y-2 px-4 pb-4">
            <SchemaRow
              v-for="schema in schemas"
              :key="schema.name"
              :schema="schema"
              :expand="expandSchemaName === schema.name"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>

    <div v-if="!isLoading && tagOrder.length === 0" class="text-center py-8 text-muted-foreground">
      No API documentation found.
    </div>
  </div>
</template>
