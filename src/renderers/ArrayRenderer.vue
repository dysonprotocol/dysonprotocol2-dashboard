<script setup lang="ts">
import { computed } from 'vue'
import type { ControlElement, JsonSchema, UISchemaElement } from '@jsonforms/core'
import { rendererProps, useJsonFormsArrayControl, DispatchRenderer } from '@jsonforms/vue'
import { composePaths, Generate } from '@jsonforms/core'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-vue-next'

const props = defineProps(rendererProps<ControlElement>())
const { control, addItem, removeItems, moveUp, moveDown } = useJsonFormsArrayControl(props)

const label = computed(() => control.value.label || control.value.path?.split('/').pop() || '')
const items = computed(() => control.value.data || [])

// Get the schema for array items
// JSON Forms may provide schema as the array schema OR the items schema directly
const itemSchema = computed(() => {
  const schema = control.value.schema as JsonSchema
  if (!schema) return undefined

  // If schema has 'items', it's the array schema - extract items
  if (schema.items) {
    // Handle tuple case (items is an array)
    if (Array.isArray(schema.items)) {
      return schema.items[0] as JsonSchema | undefined
    }
    return schema.items as JsonSchema
  }

  // If schema has 'type' that's not 'array', it might BE the items schema directly
  if (schema.type && schema.type !== 'array') {
    return schema
  }

  // Fallback: maybe the schema itself describes the item structure
  if (schema.properties) {
    return schema
  }

  return undefined
})

// Check if item is a primitive type (not object)
const isPrimitive = computed(() => {
  const schema = itemSchema.value
  if (!schema) return true
  const t = schema.type
  return t === 'string' || t === 'number' || t === 'integer' || t === 'boolean'
})

// Generate UI schema for items
const itemUiSchema = computed((): UISchemaElement => {
  const schema = itemSchema.value
  if (!schema) {
    return { type: 'Control', scope: '#' } as ControlElement
  }

  // For primitives, create a simple Control
  if (isPrimitive.value) {
    return { type: 'Control', scope: '#' } as ControlElement
  }

  // For objects with properties, manually build a VerticalLayout
  // This is more reliable than Generate.uiSchema for nested structures
  if (schema.properties && typeof schema.properties === 'object') {
    const elements = Object.keys(schema.properties).map((propName) => ({
      type: 'Control',
      scope: `#/properties/${propName}`,
    }))
    return { type: 'VerticalLayout', elements } as UISchemaElement
  }

  // For objects without properties or other types, try Generate.uiSchema
  try {
    const generated = Generate.uiSchema(schema, 'VerticalLayout')
    if (generated) return generated
  } catch (err) {
    console.warn('[ArrayRenderer] Failed to generate UI schema:', err)
  }

  // Fallback
  return { type: 'Control', scope: '#' } as ControlElement
})

function handleAdd() {
  // Create appropriate default value based on item type
  let defaultValue: unknown = undefined
  const schema = itemSchema.value
  if (schema) {
    if (schema.type === 'string') defaultValue = ''
    else if (schema.type === 'number' || schema.type === 'integer') defaultValue = 0
    else if (schema.type === 'boolean') defaultValue = false
    else if (schema.type === 'object') defaultValue = {}
    else if (schema.type === 'array') defaultValue = []
  }
  addItem(control.value.path, defaultValue)()
}

function handleRemove(index: number) {
  removeItems(control.value.path, [index])()
}

function handleMoveUp(index: number) {
  moveUp(control.value.path, index)()
}

function handleMoveDown(index: number) {
  moveDown(control.value.path, index)()
}
</script>

<template>
  <div class="mb-3">
    <div class="flex items-center justify-between mb-2">
      <Label class="text-sm font-medium">
        {{ label }}
        <span v-if="control.required" class="text-destructive">*</span>
      </Label>
      <Button type="button" variant="outline" size="sm" @click="handleAdd">
        <Plus class="h-3 w-3 mr-1" />
        Add
      </Button>
    </div>

    <p v-if="control.description" class="text-xs text-muted-foreground mb-2">
      {{ control.description }}
    </p>

    <div
      v-if="items.length === 0"
      class="text-sm text-muted-foreground py-2 text-center border rounded-md border-dashed"
    >
      No items. Click "Add" to add one.
    </div>

    <div v-else class="space-y-2">
      <div v-for="(_, index) in items" :key="index" class="border rounded-md p-3 bg-muted/20">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-muted-foreground">{{ index }}</span>
          <div class="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="h-6 w-6"
              :disabled="index === 0"
              @click="handleMoveUp(index)"
            >
              <ChevronUp class="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="h-6 w-6"
              :disabled="index === items.length - 1"
              @click="handleMoveDown(index)"
            >
              <ChevronDown class="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="h-6 w-6 text-destructive hover:text-destructive"
              @click="handleRemove(index)"
            >
              <Trash2 class="h-3 w-3" />
            </Button>
          </div>
        </div>

        <DispatchRenderer
          v-if="itemSchema"
          :schema="itemSchema"
          :uischema="itemUiSchema"
          :path="composePaths(control.path, `${index}`)"
          :enabled="control.enabled"
          :renderers="control.renderers"
          :cells="control.cells"
        />
        <div v-else class="text-xs text-muted-foreground italic">No item schema found</div>
      </div>
    </div>

    <p v-if="control.errors" class="text-xs text-destructive mt-1">
      {{ control.errors }}
    </p>
  </div>
</template>
