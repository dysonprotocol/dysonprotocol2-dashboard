<script setup lang="ts">
import { useSwaggerDocsGlobal } from '@/composables/useSwaggerDocs'

const props = defineProps<{
  properties: Record<string, any>
  depth?: number
}>()

const { definitions } = useSwaggerDocsGlobal()
const maxDepth = 5

// Get property type as a readable string
function getPropertyType(prop: any): string {
  if (prop.$ref) {
    return '/' + prop.$ref.replace('#/definitions/', '')
  }
  if (prop.type === 'array' && prop.items) {
    if (prop.items.$ref) {
      return '/' + prop.items.$ref.replace('#/definitions/', '') + '[]'
    }
    if (prop.items.type === 'object' && prop.items.properties) {
      return 'object[]'
    }
    return `${prop.items.type || 'any'}[]`
  }
  if (prop.type === 'object' && prop.properties) {
    return 'object'
  }
  if (prop.format) {
    return `${prop.type} (${prop.format})`
  }
  return prop.type || 'any'
}

// Check if property has nested properties to show
function getNestedProperties(prop: any): Record<string, any> | null {
  // Direct object with properties
  if (prop.type === 'object' && prop.properties) {
    return prop.properties
  }
  // Array of objects with properties
  if (prop.type === 'array' && prop.items?.type === 'object' && prop.items?.properties) {
    return prop.items.properties
  }
  // $ref to a definition
  if (prop.$ref) {
    const refName = prop.$ref.replace('#/definitions/', '')
    const def = definitions.value[refName]
    if (def?.properties) {
      return def.properties
    }
  }
  // Array of $refs
  if (prop.type === 'array' && prop.items?.$ref) {
    const refName = prop.items.$ref.replace('#/definitions/', '')
    const def = definitions.value[refName]
    if (def?.properties) {
      return def.properties
    }
  }
  return null
}

function hasNestedProperties(prop: any): boolean {
  return getNestedProperties(prop) !== null
}

const currentDepth = props.depth ?? 0
</script>

<template>
  <div class="space-y-1">
    <template v-for="(prop, key) in properties" :key="key">
      <div class="flex gap-4 py-1 border-b last:border-0">
        <div class="shrink-0 min-w-48">
          <code class="font-mono text-xs">{{ key }}</code>
          <div class="text-muted-foreground text-xs">{{ getPropertyType(prop) }}</div>
        </div>
        <pre
          v-if="prop.description"
          class="text-xs text-muted-foreground flex-1 whitespace-pre-wrap font-sans m-0"
          >{{ prop.description }}</pre
        >
      </div>
      <!-- Recursive nested properties -->
      <div
        v-if="hasNestedProperties(prop) && currentDepth < maxDepth"
        class="ml-6 pl-4 border-l-2 border-muted"
      >
        <PropertyList :properties="getNestedProperties(prop)!" :depth="currentDepth + 1" />
      </div>
    </template>
  </div>
</template>
