<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { JsonForms } from '@jsonforms/vue'
import { vanillaRenderers } from '@jsonforms/vue-vanilla'
import { BookOpen, Play, Copy, Check, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import CodeBlock from './CodeBlock.vue'
import type { MsgDoc } from '@/composables/useSwaggerDocs'
import api from '@/orm/http'

const props = defineProps<{
  msg: MsgDoc
  schema?: any
}>()

const formData = ref<Record<string, any>>({})
const isLoading = ref(false)
const response = ref<any>(null)
const error = ref<string | null>(null)
const showResponse = ref(false)
const showScript = ref(true)
const copied = ref(false)

// Build schema for JSON Forms from swagger parameters
const jsonSchema = computed(() => {
  if (props.schema?.request) {
    return props.schema.request
  }

  // Build from swagger parameters
  const properties: Record<string, any> = {}
  const required: string[] = []

  for (const param of props.msg.parameters || []) {
    properties[param.name] = {
      type: param.type || 'string',
      description: param.description,
    }
    if (param.required) {
      required.push(param.name)
    }
  }

  return {
    type: 'object',
    properties,
    required,
  }
})

function onChange(event: { data: any }) {
  formData.value = event.data
}

async function tryIt() {
  isLoading.value = true
  error.value = null
  response.value = null

  try {
    let url = props.msg.path

    // Replace path parameters
    for (const [key, value] of Object.entries(formData.value)) {
      url = url.replace(`{${key}}`, encodeURIComponent(String(value)))
    }

    // Add query parameters for GET requests
    if (props.msg.method === 'get') {
      const queryParams = new URLSearchParams()
      for (const param of props.msg.parameters || []) {
        if (param.in === 'query' && formData.value[param.name]) {
          queryParams.set(param.name, String(formData.value[param.name]))
        }
      }
      const queryString = queryParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    const result =
      props.msg.method === 'post' ? await api.post(url, formData.value) : await api.get(url)

    response.value = result.data
    showResponse.value = true
  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || 'Request failed'
    showResponse.value = true
  } finally {
    isLoading.value = false
  }
}

// Generate Python script example
const scriptExample = computed(() => {
  const params = Object.entries(formData.value)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `    "${k}": ${JSON.stringify(v)}`)
    .join(',\n')

  return `from dys import _query

result = _query({
    "@type": "${props.msg.typeUrl}",
${params ? params + ',' : ''}
})
print(result)`
})

async function copyScript() {
  await navigator.clipboard.writeText(scriptExample.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center gap-2">
        <Badge variant="secondary" class="gap-1">
          <BookOpen class="h-3 w-3" />
          Query
        </Badge>
        <Badge variant="outline">{{ msg.module }}</Badge>
      </div>
      <CardTitle class="font-mono text-lg">{{ msg.operationId }}</CardTitle>
      <CardDescription>{{ msg.summary }}</CardDescription>
    </CardHeader>

    <CardContent class="space-y-4">
      <!-- Endpoint -->
      <div class="flex items-center gap-2">
        <Badge :variant="msg.method === 'get' ? 'default' : 'secondary'" class="uppercase">
          {{ msg.method }}
        </Badge>
        <code class="text-sm bg-muted px-2 py-1 rounded flex-1 overflow-x-auto">
          {{ msg.path }}
        </code>
      </div>

      <!-- Form -->
      <div v-if="jsonSchema.properties && Object.keys(jsonSchema.properties).length > 0">
        <h4 class="text-sm font-medium mb-2">Parameters</h4>
        <JsonForms
          :data="formData"
          :schema="jsonSchema"
          :renderers="vanillaRenderers"
          @change="onChange"
        />
      </div>
      <div v-else class="text-sm text-muted-foreground py-2">No parameters required</div>

      <!-- Actions -->
      <div class="flex gap-2">
        <Button :disabled="isLoading" @click="tryIt">
          <Play class="h-4 w-4 mr-2" />
          {{ isLoading ? 'Loading...' : 'Try It' }}
        </Button>
        <Button variant="outline" @click="copyScript">
          <Check v-if="copied" class="h-4 w-4 mr-2 text-green-500" />
          <Copy v-else class="h-4 w-4 mr-2" />
          Copy as Script
        </Button>
      </div>

      <!-- Error -->
      <Alert v-if="error" variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>

      <!-- Response -->
      <Collapsible v-if="response" v-model:open="showResponse">
        <CollapsibleTrigger class="flex items-center gap-2 text-sm font-medium w-full">
          <component :is="showResponse ? ChevronUp : ChevronDown" class="h-4 w-4" />
          Response
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre class="mt-2 bg-muted p-4 rounded-md overflow-x-auto text-sm max-h-80">{{
            JSON.stringify(response, null, 2)
          }}</pre>
        </CollapsibleContent>
      </Collapsible>

      <!-- Script Example -->
      <Collapsible v-model:open="showScript">
        <CollapsibleTrigger class="flex items-center gap-2 text-sm font-medium w-full">
          <component :is="showScript ? ChevronUp : ChevronDown" class="h-4 w-4" />
          Use in Script
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div class="mt-2">
            <CodeBlock :code="scriptExample" language="python" />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </CardContent>
  </Card>
</template>





