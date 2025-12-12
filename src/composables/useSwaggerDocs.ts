import { ref, computed } from 'vue'
import YAML from 'yaml'

// API endpoint (has tags like Query, Msg, Service)
export interface EndpointDoc {
  operationId: string
  summary: string
  description: string
  method: 'get' | 'post'
  path: string
  parameters: any[]
  responseSchema: any
  tags: string[]
}

// Proto schema definition (type: object, no tags)
export interface SchemaDoc {
  name: string
  description: string
  properties: Record<string, any>
  schema: any
}

// Cache for fetched data
let swaggerCache: any = null
let loadPromise: Promise<void> | null = null

export function useSwaggerDocs() {
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  // Endpoints grouped by tag
  const endpoints = ref<EndpointDoc[]>([])
  const tagOrder = ref<string[]>([])

  // Proto schema definitions
  const schemas = ref<SchemaDoc[]>([])

  // All definitions for resolving $ref
  const definitions = ref<Record<string, any>>({})

  // Group endpoints by tag in order seen
  const byTag = computed(() => {
    const result: Record<string, EndpointDoc[]> = {}
    for (const tag of tagOrder.value) {
      result[tag] = []
    }
    for (const ep of endpoints.value) {
      const tag = ep.tags[0] || 'Other'
      if (!result[tag]) result[tag] = []
      result[tag].push(ep)
    }
    return result
  })

  function search(term: string): { endpoints: EndpointDoc[]; schemas: SchemaDoc[] } {
    if (!term.trim()) {
      return { endpoints: endpoints.value.slice(0, 15), schemas: schemas.value.slice(0, 10) }
    }
    const lower = term.toLowerCase()
    const matchedEndpoints = endpoints.value.filter(
      (d) =>
        d.operationId.toLowerCase().includes(lower) ||
        d.summary.toLowerCase().includes(lower) ||
        d.path.toLowerCase().includes(lower)
    )
    const matchedSchemas = schemas.value.filter(
      (d) => d.name.toLowerCase().includes(lower) || d.description.toLowerCase().includes(lower)
    )
    return {
      endpoints: matchedEndpoints.slice(0, 15),
      schemas: matchedSchemas.slice(0, 10),
    }
  }

  async function loadAll() {
    // Return existing promise if already loading
    if (loadPromise) return loadPromise

    isLoading.value = true
    error.value = null

    loadPromise = (async () => {
      const eps: EndpointDoc[] = []
      const seenTags: string[] = []
      const schemaList: SchemaDoc[] = []

      try {
        // Fetch swagger.yaml from the node
        if (!swaggerCache) {
          const response = await fetch('/swagger/swagger.yaml')
          if (!response.ok) {
            throw new Error(`Failed to fetch swagger.yaml: ${response.status}`)
          }
          const yamlText = await response.text()
          swaggerCache = YAML.parse(yamlText)
        }

        const swagger = swaggerCache
        if (!swagger?.paths) {
          throw new Error('Invalid swagger.yaml: no paths found')
        }

        // Store definitions for $ref resolution
        definitions.value = swagger.definitions || {}

        // Parse paths (API endpoints)
        for (const [endpoint, methods] of Object.entries(swagger.paths)) {
          for (const [method, spec] of Object.entries(methods as Record<string, any>)) {
            if (!spec.operationId) continue

            const tags: string[] = spec.tags || []

            // Track tag order as we encounter them
            for (const tag of tags) {
              if (!seenTags.includes(tag)) {
                seenTags.push(tag)
              }
            }

            eps.push({
              operationId: spec.operationId,
              summary: spec.summary || '',
              description: spec.description || spec.summary || '',
              method: method as 'get' | 'post',
              path: endpoint,
              parameters: spec.parameters || [],
              responseSchema: spec.responses?.['200']?.schema || null,
              tags,
            })
          }
        }

        // Parse definitions (Proto schemas)
        if (swagger.definitions) {
          for (const [name, def] of Object.entries(swagger.definitions as Record<string, any>)) {
            if (def.type === 'object') {
              schemaList.push({
                name,
                description: def.description || '',
                properties: def.properties || {},
                schema: def,
              })
            }
          }
        }

        endpoints.value = eps
        tagOrder.value = seenTags
        schemas.value = schemaList
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load swagger docs'
        console.error('Failed to load swagger docs:', err)
      } finally {
        isLoading.value = false
      }
    })()

    return loadPromise
  }

  return {
    isLoading,
    error,
    endpoints,
    schemas,
    definitions,
    tagOrder,
    byTag,
    search,
    loadAll,
  }
}

// Singleton instance for global state
let instance: ReturnType<typeof useSwaggerDocs> | null = null

export function useSwaggerDocsGlobal() {
  if (!instance) {
    instance = useSwaggerDocs()
    instance.loadAll()
  }
  return instance
}
