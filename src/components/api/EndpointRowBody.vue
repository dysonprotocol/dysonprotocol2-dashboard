<script setup lang="ts">
import { ref, computed, watch, onMounted, defineAsyncComponent } from 'vue'
import { useStorage, useMediaQuery } from '@vueuse/core'
import { JsonForms } from '@jsonforms/vue'
import { Copy, Check, Play, Link, Send } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppColorMode } from '@/composables/useAppColorMode'
import type { EndpointDoc } from '@/composables/useSwaggerDocs'
import { useSwaggerDocsGlobal } from '@/composables/useSwaggerDocs'
import { customRenderers } from '@/renderers'
import { useWallet } from '@/composables/useWallet'
import WalletSelector from '@/components/shared/WalletSelector.vue'
import api from '@/orm/http'

// Lazy-load Monaco editor - only loads when endpoint body is mounted
const MonacoEditor = defineAsyncComponent(() => import('@/components/shared/MonacoEditor.vue'))

const props = defineProps<{
  endpoint: EndpointDoc
  initialParams?: Record<string, string> | null
}>()
const emit = defineEmits<{ close: []; ready: [] }>()

const { definitions } = useSwaggerDocsGlobal()

// Global persisted state (shared across all EndpointRow instances)
const globalScriptAddress = useStorage('api-docs-script-address', '')
const globalSelectedTab = useStorage('api-docs-selected-tab', 'rest')
const isWideScreen = useMediaQuery('(min-width: 1280px)') // xl breakpoint

const isLoading = ref(false)
const response = ref<any>(null)
const error = ref<string | null>(null)
// Form data can be flat strings or nested objects (for complex types like Coin)
const formData = ref<Record<string, any>>({})
const codeCopied = ref(false)
const linkCopied = ref(false)
const jsonCopied = ref(false)

// Parameters input mode (form vs JSON) for mobile
const paramsInputMode = ref<'form' | 'json'>('form')
const paramsJsonText = ref('{}')
const paramsJsonError = ref<string | null>(null)
// Flags to prevent circular updates between form and JSON
const isUpdatingFromJson = ref(false)
const isUpdatingFromForm = ref(false)

// Wallet & transaction state
const { sendMsg, isAnyWalletConnected } = useWallet()
const selectedWalletAddress = ref('')
const executorAddress = ref<string | null>(null)
const granteeAddress = ref<string | null>(null)
const isSigning = ref(false)
const txResult = ref<{ success: boolean; txHash?: string; error?: string } | null>(null)

// Script demo state
const isSimulating = ref(false)
const simulateResult = ref<any>(null)
const simulateError = ref<{
  context: string
  message: string
  lineno?: number
  colOffset?: number
  endLineno?: number
  endColOffset?: number
  sourceSegment?: string
  stdout?: string
  // Parsed payload from error (same structure as success)
  payload?: any
} | null>(null)

// Monaco editor theme
const { isDark } = useAppColorMode()
const editorTheme = computed(() => (isDark.value ? 'vs-dark' : 'vs'))

// Editable script code - initialized on mount
const scriptCode = ref('')

async function copyCode() {
  await navigator.clipboard.writeText(scriptCode.value)
  codeCopied.value = true
  setTimeout(() => (codeCopied.value = false), 2000)
}

async function copyJson() {
  if (!msgJsonPayload.value) return
  await navigator.clipboard.writeText(JSON.stringify(msgJsonPayload.value, null, 2))
  jsonCopied.value = true
  setTimeout(() => (jsonCopied.value = false), 2000)
}

// Generate deep link URL with current form data
const deepLinkUrl = computed(() => {
  const base = `${window.location.origin}/docs/api`
  const params = new URLSearchParams()
  params.set('type', props.endpoint.operationId)

  // Only include non-empty form values
  const filledParams: Record<string, string> = {}
  for (const [key, value] of Object.entries(formData.value)) {
    if (value !== undefined && value !== '') {
      filledParams[key] = value
    }
  }
  if (Object.keys(filledParams).length > 0) {
    params.set('params', JSON.stringify(filledParams))
  }

  return `${base}?${params.toString()}`
})

async function copyDeepLink() {
  await navigator.clipboard.writeText(deepLinkUrl.value)
  linkCopied.value = true
  setTimeout(() => (linkCopied.value = false), 2000)
}

// Handle JSON Forms change event
function onFormChange(event: { data: any }) {
  // Only update if data actually changed (prevents infinite loop)
  const newData = JSON.stringify(event.data)
  if (newData !== JSON.stringify(formData.value)) {
    isUpdatingFromForm.value = true
    formData.value = JSON.parse(newData)
    isUpdatingFromForm.value = false
  }
}

// Handle raw JSON text changes from Monaco editor
function onParamsJsonChange(text: string) {
  paramsJsonText.value = text
  paramsJsonError.value = null

  try {
    const parsed = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      paramsJsonError.value = 'Must be a JSON object'
      return
    }
    // Only update formData if parsing succeeded
    isUpdatingFromJson.value = true
    formData.value = parsed
    isUpdatingFromJson.value = false
  } catch (err: any) {
    paramsJsonError.value = err.message || 'Invalid JSON'
  }
}

// Sync formData changes to JSON text (unless change came from JSON editor)
watch(
  formData,
  (data) => {
    if (isUpdatingFromJson.value) return
    paramsJsonText.value = JSON.stringify(data, null, 2)
    paramsJsonError.value = null
  },
  { deep: true }
)

// Convert flat dotted keys to nested object structure (for query params only)
// e.g., { "pagination.key": "abc", "pagination.limit": "10" }
// becomes { pagination: { key: "abc", limit: "10" } }
function flatToNested(flat: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(flat)) {
    if (!key.includes('.')) {
      result[key] = value
      continue
    }
    const parts = key.split('.')
    let current = result
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {}
      }
      current = current[parts[i]]
    }
    current[parts[parts.length - 1]] = value
  }
  return result
}

// Get a value from formData, handling both flat keys and nested paths
// e.g., getFormValue("pagination.key") checks formData["pagination.key"] first,
// then falls back to formData.pagination?.key
function getFormValue(key: string): any {
  // First try flat key (for backwards compatibility)
  if (key in formData.value) {
    return formData.value[key]
  }
  // Then try nested path
  if (key.includes('.')) {
    const parts = key.split('.')
    let current: any = formData.value
    for (const part of parts) {
      if (current === undefined || current === null) return undefined
      current = current[part]
    }
    return current
  }
  return formData.value[key]
}

// Get path parameters from swagger spec (in: path)
const pathParams = computed(() => {
  return (
    props.endpoint.parameters
      ?.filter((p) => p.in === 'path')
      .map((p) => ({
        name: p.name,
        type: p.type || 'string',
        format: p.format,
        description: p.description || '',
        required: p.required ?? true, // path params are always required
      })) || []
  )
})

// Detect if a swagger param is boolean (type or format)
function isParamBoolean(p: { type?: string; format?: string }) {
  return p.type === 'boolean' || p.format === 'boolean'
}

// Get query parameters from swagger spec (in: query)
const queryParams = computed(() => {
  return (
    props.endpoint.parameters
      ?.filter((p) => p.in === 'query')
      .map((p) => ({
        name: p.name,
        type: p.type || 'string',
        format: p.format,
        description: p.description || '',
        required: p.required || false,
        isBoolean: isParamBoolean(p),
      })) || []
  )
})

// Get body parameter for POST requests (in: body)
const bodyParam = computed(() => {
  return props.endpoint.parameters?.find((p) => p.in === 'body')
})

// Recursively resolve $ref in a schema
function resolveRefs(schema: any, defs: Record<string, any>, depth = 0): any {
  if (depth > 10) return schema // Prevent infinite recursion
  if (!schema) return schema

  if (schema.$ref) {
    const refName = schema.$ref.replace('#/definitions/', '')
    const resolved = defs[refName]
    if (resolved) {
      // Merge description from original ref if present
      const result = resolveRefs({ ...resolved }, defs, depth + 1)
      if (schema.description) result.description = schema.description
      return result
    }
  }

  if (schema.properties) {
    const resolvedProps: Record<string, any> = {}
    for (const [key, prop] of Object.entries(schema.properties)) {
      resolvedProps[key] = resolveRefs(prop, defs, depth + 1)
    }
    return { ...schema, properties: resolvedProps }
  }

  if (schema.items) {
    return { ...schema, items: resolveRefs(schema.items, defs, depth + 1) }
  }

  return schema
}

// Build JSON Schema for the form (combines path, query, and body params)
const jsonSchema = computed(() => {
  const properties: Record<string, any> = {}
  const required: string[] = []

  // Add path parameters
  for (const param of pathParams.value) {
    properties[param.name] = {
      type: param.type || 'string',
      description: param.description,
    }
    if (param.required) required.push(param.name)
  }

  // Add query parameters
  for (const param of queryParams.value) {
    properties[param.name] = {
      type: param.isBoolean ? 'boolean' : param.type || 'string',
      description: param.description,
    }
    if (param.required) required.push(param.name)
  }

  // Add body parameters (resolve $refs for nested types)
  const body = bodyParam.value
  if (body?.schema) {
    let bodySchema = body.schema
    if (bodySchema.$ref) {
      const refName = bodySchema.$ref.replace('#/definitions/', '')
      bodySchema = definitions.value[refName] || bodySchema
    }

    if (bodySchema.properties) {
      for (const [name, prop] of Object.entries(bodySchema.properties as Record<string, any>)) {
        properties[name] = resolveRefs(prop, definitions.value)
      }
      if (bodySchema.required) {
        required.push(...bodySchema.required)
      }
    }
  }

  return {
    type: 'object' as const,
    properties,
    required,
  }
})

// Check if form has any parameters
const hasParameters = computed(() => Object.keys(jsonSchema.value.properties).length > 0)

// Build example response from schema
const exampleResponse = computed(() => {
  if (!props.endpoint.responseSchema) return null
  return buildExample(props.endpoint.responseSchema, definitions.value)
})

// Base URL for API requests (current origin)
const apiBaseUrl = typeof window !== 'undefined' ? window.location.origin : ''

// Build the full URL preview with path and query params
const urlPreview = computed(() => {
  let url = props.endpoint.path

  // Replace path parameters
  for (const param of pathParams.value) {
    const value = formData.value[param.name]
    if (value) {
      url = url.replace(`{${param.name}}`, encodeURIComponent(value))
    }
  }

  // Add query parameters
  const queryParts: string[] = []
  for (const param of queryParams.value) {
    const value = getFormValue(param.name)
    if (value !== undefined && value !== '') {
      queryParts.push(`${param.name}=${encodeURIComponent(String(value))}`)
    }
  }
  if (queryParts.length > 0) {
    url += '?' + queryParts.join('&')
  }

  return apiBaseUrl + url
})

// Filter out empty values from an object (recursively)
function filterEmpty(obj: any): any {
  if (obj === null || obj === undefined || obj === '') return undefined
  if (Array.isArray(obj)) {
    const filtered = obj.map(filterEmpty).filter((v) => v !== undefined)
    return filtered.length > 0 ? filtered : undefined
  }
  if (typeof obj === 'object') {
    const result: Record<string, any> = {}
    let hasValue = false
    for (const [key, value] of Object.entries(obj)) {
      const filtered = filterEmpty(value)
      if (filtered !== undefined) {
        result[key] = filtered
        hasValue = true
      }
    }
    return hasValue ? result : undefined
  }
  return obj
}

// Build the POST body preview from form data
const bodyPreview = computed(() => {
  if (props.endpoint.method !== 'post') return null
  const body = bodyParam.value
  if (!body?.schema) return null

  // Get body field names from schema
  let bodySchema = body.schema
  if (bodySchema.$ref) {
    const refName = bodySchema.$ref.replace('#/definitions/', '')
    bodySchema = definitions.value[refName] || bodySchema
  }

  if (!bodySchema.properties) return null

  const result: Record<string, any> = {}
  for (const name of Object.keys(bodySchema.properties)) {
    const value = filterEmpty(formData.value[name])
    if (value !== undefined) {
      result[name] = value
    }
  }
  return Object.keys(result).length > 0 ? result : null
})

// Build the raw message JSON for signing transactions (used for Msg endpoints)
const msgJsonPayload = computed(() => {
  const type = typeUrl.value
  if (!type) return null

  const payload: Record<string, any> = { '@type': type }

  // Add path params
  for (const param of pathParams.value) {
    const value = filterEmpty(formData.value[param.name])
    if (value !== undefined) payload[param.name] = value
  }

  // Add query params (these may use dot notation for nested query params)
  const queryFlat: Record<string, any> = {}
  for (const param of queryParams.value) {
    const value = getFormValue(param.name)
    if (value !== undefined && value !== '') {
      queryFlat[param.name] = value
    }
  }
  // Convert dotted query params to nested (e.g., pagination.key → pagination: { key: ... })
  Object.assign(payload, flatToNested(queryFlat))

  // Add body params from form data
  const body = bodyParam.value
  if (body?.schema) {
    let bodySchema = body.schema
    if (bodySchema.$ref) {
      const refName = bodySchema.$ref.replace('#/definitions/', '')
      bodySchema = definitions.value[refName] || bodySchema
    }
    if (bodySchema.properties) {
      for (const name of Object.keys(bodySchema.properties)) {
        const value = filterEmpty(formData.value[name])
        if (value !== undefined) {
          payload[name] = value
        }
      }
    }
  }

  return payload
})

// Derive the proto type URL from swagger definition
const typeUrl = computed(() => {
  // Try to get from body param schema (for POST/queries with body)
  const body = bodyParam.value
  if (body?.schema?.$ref) {
    const refName = body.schema.$ref.replace('#/definitions/', '')
    return `/${refName}`
  }

  // For GET requests, derive from operationId
  const opId = props.endpoint.operationId

  // If operationId contains dots, it's already a full path like:
  // Query: "dysonprotocol.storage.v1.Query_StorageGet" → "/dysonprotocol.storage.v1.QueryStorageGetRequest"
  // Msg: "dysonprotocol.nameservice.v1.Msg_AcceptBid" → "/dysonprotocol.nameservice.v1.MsgAcceptBid"
  if (opId.includes('.')) {
    // Replace underscore
    const cleanedOpId = opId.replace(/_/g, '')
    // Msg types don't have Request suffix, Query types do
    const isMsg = cleanedOpId.includes('Msg')
    if (isMsg || cleanedOpId.endsWith('Request')) {
      return `/${cleanedOpId}`
    }
    return `/${cleanedOpId}Request`
  }

  // Otherwise, build from path + operationId
  // Query: /cosmos/bank/v1beta1/balances/{address} + Query_AllBalances → /cosmos.bank.v1beta1.QueryAllBalancesRequest
  // Msg: doesn't apply here (Msg endpoints have body schema with $ref)
  const path = props.endpoint.path
  const pathParts = path.split('/').filter(Boolean)
  if (pathParts.length >= 3) {
    // Build module name from first 3 parts (e.g., cosmos.bank.v1beta1)
    const moduleParts = pathParts.slice(0, 3)
    const moduleName = moduleParts.join('.')

    // Derive request type from operationId
    const cleanedOp = opId.replace(/_/g, '')
    const isMsg = cleanedOp.includes('Msg')
    // Query_AllBalances → QueryAllBalancesRequest (but Msg types don't get Request suffix)
    const requestType = isMsg || cleanedOp.endsWith('Request') ? cleanedOp : cleanedOp + 'Request'

    return `/${moduleName}.${requestType}`
  }

  return null
})

// Check if this is a Service endpoint (cannot be signed, no Dyslang)
const isService = computed(() => {
  const tags = props.endpoint.tags || []
  return tags.some((tag) => tag.includes('Service'))
})

// Determine if this is a query or msg based on operationId/typeUrl
// Service endpoints are also treated as queries (no signing capability)
const isQuery = computed(() => {
  if (isService.value) return true
  const opId = props.endpoint.operationId || ''
  const type = typeUrl.value || ''
  return opId.includes('Query') || type.includes('Query') || props.endpoint.method === 'get'
})

// Service endpoints don't support Dyslang scripts
const supportsDyslang = computed(() => !isService.value)

// Generate Python code snippet for script usage
const generatedCode = computed(() => {
  const type = typeUrl.value
  if (!type) return '# Unable to derive type URL for this endpoint'

  const funcName = isQuery.value ? '_query' : '_msg'
  const imports = isQuery.value
    ? 'from dys import _query'
    : 'from dys import _msg, get_script_address'
  const jsonImport = 'import json'

  // Build params object
  const params: Record<string, any> = { '@type': type }

  // Add path params
  for (const param of pathParams.value) {
    const value = filterEmpty(formData.value[param.name])
    if (value !== undefined) params[param.name] = value
  }

  // Add query params (use dot notation conversion for these)
  const queryFlat: Record<string, any> = {}
  for (const param of queryParams.value) {
    const value = getFormValue(param.name)
    if (value !== undefined && value !== '') {
      queryFlat[param.name] = value
    }
  }
  // Convert dotted query params to nested (e.g., pagination.key → pagination: { key: ... })
  Object.assign(params, flatToNested(queryFlat))

  // Add body params from form data
  const body = bodyParam.value
  if (body?.schema) {
    let bodySchema = body.schema
    if (bodySchema.$ref) {
      const refName = bodySchema.$ref.replace('#/definitions/', '')
      bodySchema = definitions.value[refName] || bodySchema
    }
    if (bodySchema.properties) {
      for (const name of Object.keys(bodySchema.properties)) {
        const value = filterEmpty(formData.value[name])
        if (value !== undefined) {
          params[name] = value
        }
      }
    }
  }

  // For msgs, add script address for from_address fields
  if (!isQuery.value) {
    for (const key of Object.keys(params)) {
      if (key.endsWith('_address') && key !== '@type') {
        params[key] = 'get_script_address()'
      }
    }
  }

  // Format the params object - convert to Python syntax
  const paramsStr = JSON.stringify(params, null, 4)
    .replace(/"get_script_address\(\)"/g, 'get_script_address()')
    .replace(/: true\b/g, ': True')
    .replace(/: false\b/g, ': False')

  return `${imports}\n${jsonImport}\n\nresult = ${funcName}(${paramsStr})\nprint(json.dumps(result, indent=2))`
})

onMounted(() => {
  // Prefill form data from URL params if provided
  if (props.initialParams) {
    formData.value = { ...props.initialParams }
  }
  // Initialize JSON text from form data
  paramsJsonText.value = JSON.stringify(formData.value, null, 2)
  scriptCode.value = generatedCode.value
  // Signal parent that content is ready for scrolling
  // Small delay to let JsonForms and other content render
  requestAnimationFrame(() => emit('ready'))
})

watch(generatedCode, (code) => {
  scriptCode.value = code
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
    if (schema.format === 'date-time') return new Date().toISOString()
    if (schema.format === 'byte') return 'base64...'
    return 'string'
  }
  if (schema.type === 'integer' || schema.type === 'number') return 0
  if (schema.type === 'boolean') return false

  return null
}

async function execute() {
  isLoading.value = true
  error.value = null
  response.value = null

  try {
    let url = props.endpoint.path

    // 1. Replace path parameters: /path/{param} → /path/value
    for (const param of pathParams.value) {
      const value = formData.value[param.name] || ''
      url = url.replace(`{${param.name}}`, encodeURIComponent(value))
    }

    // 2. Add query parameters: ?key1=val1&key2=val2
    if (queryParams.value.length > 0) {
      const params = new URLSearchParams()
      for (const param of queryParams.value) {
        const value = getFormValue(param.name)
        if (value !== undefined && value !== '') {
          params.set(param.name, String(value))
        }
      }
      const qs = params.toString()
      if (qs) url += `?${qs}`
    }

    // 3. Execute request
    let result
    if (props.endpoint.method === 'post') {
      // Use bodyPreview which has the filtered form data
      result = await api.post(url, bodyPreview.value || {})
    } else {
      result = await api.get(url)
    }
    response.value = result.data
  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || 'Request failed'
  } finally {
    isLoading.value = false
  }
}

function cancel() {
  response.value = null
  error.value = null
  simulateResult.value = null
  simulateError.value = null
  emit('close')
}

// Sign and send the transaction using the selected wallet
async function signAndSendTx() {
  const executor = executorAddress.value
  if (!executor) {
    txResult.value = { success: false, error: 'Please select a wallet' }
    return
  }

  const payload = msgJsonPayload.value
  if (!payload) {
    txResult.value = { success: false, error: 'No message payload to send' }
    return
  }

  isSigning.value = true
  txResult.value = null

  try {
    const result = await (sendMsg as any)({
      msg: payload,
      gasLimit: 'auto',
      memo: '',
      executorAddress: executor,
      grantee: granteeAddress.value || undefined,
    })

    if (result.success) {
      const txHash = result.raw?.tx_response?.txhash
      txResult.value = { success: true, txHash }
    } else {
      const errorMsg = result.rawLog || result.raw?.message || 'Transaction failed'
      txResult.value = { success: false, error: errorMsg }
    }
  } catch (err: any) {
    txResult.value = { success: false, error: err?.message || 'Transaction failed' }
  } finally {
    isSigning.value = false
  }
}

// Run the generated script code via RunScript query (no wallet needed)
async function runScriptQuery() {
  if (!globalScriptAddress.value) {
    simulateError.value = {
      context: 'Validation Error',
      message: 'Please enter a script address',
      lineno: 0,
      colOffset: 0,
    }
    return
  }

  isSimulating.value = true
  simulateError.value = null
  simulateResult.value = null

  try {
    // Use the RunScript query endpoint - no wallet signature required
    const body = {
      executor_address: globalScriptAddress.value,
      script_address: globalScriptAddress.value,
      extra_code: scriptCode.value,
      function_name: '',
      args: '[]',
      kwargs: '{}',
    }

    const resp = await api.post('/dysonprotocol/script/v1/run', body)
    const data = resp?.data as any

    if (data?.exception) {
      const ex = data.exception
      simulateError.value = {
        context: ex.context,
        message: ex.msg,
        lineno: ex.lineno,
        colOffset: ex.col_offset,
        endLineno: ex.end_lineno,
        endColOffset: ex.end_col_offset,
        sourceSegment: ex.source_segment,
        stdout: data.stdout || '',
      }
    } else {
      const { payload, returnValue } = unwrapRunScriptResponse(data)

      simulateResult.value = {
        payload,
        returnValue,
        stdout: payload?.stdout || '',
        gasConsumed: payload?.script_gas_consumed,
        gasLimit: payload?.gas_limit,
        nodesExecuted: payload?.nodes_called,
        cumSize: payload?.cumsize,
        exception: payload?.exception ?? null,
      }
    }
  } catch (err: any) {
    const errData = err?.response?.data
    // Try to extract error message from response
    const msg = errData?.message || err?.message || String(err)

    // Try to parse JSON payload from error message (often embedded in "script execution error: {...}")
    const parsedPayload = extractJsonPayloadFromError(msg)

    if (parsedPayload && isRunScriptPayload(parsedPayload)) {
      // We have structured error data - use it like success display
      const ex = parsedPayload.exception
      simulateError.value = {
        context: ex?.context || ex?.class || 'Script Error',
        message: ex?.msg || 'Script execution failed',
        lineno: ex?.lineno,
        colOffset: ex?.col_offset,
        endLineno: ex?.end_lineno,
        endColOffset: ex?.end_col_offset,
        sourceSegment: ex?.source_segment,
        stdout: parsedPayload.stdout || '',
        payload: parsedPayload,
      }
    } else {
      simulateError.value = {
        context: 'Request Error',
        message: msg,
      }
    }
  } finally {
    isSimulating.value = false
  }
}

function isRunScriptPayload(value: any) {
  if (!value || typeof value !== 'object') return false
  return (
    'cumsize' in value ||
    'nodes_called' in value ||
    'script_gas_consumed' in value ||
    'gas_limit' in value ||
    'stdout' in value
  )
}

function extractJsonPayloadFromError(msg: string): any | null {
  if (!msg || typeof msg !== 'string') return null

  // Try to find JSON object in the message (often after "script execution error: ")
  const jsonMatch = msg.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (err) {
      // Not valid JSON
    }
  }
  return null
}

function unwrapRunScriptResponse(data: any): { payload: any; returnValue: any } {
  if (!data || typeof data !== 'object') return data

  if (isRunScriptPayload(data)) return { payload: data, returnValue: data?.result }

  const nested = data?.result

  // Case: wrapper where `result` is already an object payload
  if (isRunScriptPayload(nested)) return { payload: nested, returnValue: nested?.result }

  // Case: wrapper where `result` is JSON string of payload
  if (typeof nested === 'string' && nested.trim()) {
    try {
      const parsed = JSON.parse(nested)
      if (isRunScriptPayload(parsed)) return { payload: parsed, returnValue: parsed?.result }
    } catch (err) {
      console.warn('[api-docs] Failed to parse run result payload JSON', {
        operationId: props.endpoint.operationId,
        err,
      })
    }
  }

  // Fall back: treat whole response as payload
  return { payload: data, returnValue: data?.result }
}

function formatJson(value: unknown) {
  if (value === undefined) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        return JSON.stringify(JSON.parse(trimmed), null, 2)
      } catch (err) {
        console.warn('[api-docs] Failed to parse JSON string', {
          operationId: props.endpoint.operationId,
          err,
        })
      }
    }
    return value
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch (err) {
    console.warn('[api-docs] Failed to stringify JSON', {
      operationId: props.endpoint.operationId,
      err,
    })
    return String(value)
  }
}

function formatResult(r: unknown) {
  if (typeof r === 'string') return r
  try {
    return JSON.stringify(r, null, 2)
  } catch (err) {
    console.warn('[api-docs] Failed to stringify result', {
      operationId: props.endpoint.operationId,
      err,
    })
    return String(r)
  }
}
</script>

<template>
  <div class="px-3 pb-3 border-t border-border/50">
    <!-- Parameters Form -->
    <div v-if="!hasParameters" class="flex items-center justify-between py-2">
      <span class="text-sm text-muted-foreground">No parameters</span>
      <Button variant="ghost" size="sm" class="h-7 px-2 text-xs" @click="copyDeepLink">
        <Check v-if="linkCopied" class="h-3 w-3 text-green-500 mr-1" />
        <Link v-else class="h-3 w-3 mr-1" />
      </Button>
    </div>

    <div v-else class="border rounded-md p-3 mt-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">Parameters</span>
        <div class="flex items-center gap-2">
          <!-- Mobile: Toggle buttons for Form/JSON -->
          <div class="xl:hidden flex border rounded-md overflow-hidden">
            <button
              class="px-2 py-1 text-xs transition-colors"
              :class="
                paramsInputMode === 'form'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              "
              @click="paramsInputMode = 'form'"
            >
              Form
            </button>
            <button
              class="px-2 py-1 text-xs transition-colors"
              :class="
                paramsInputMode === 'json'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              "
              @click="paramsInputMode = 'json'"
            >
              JSON
            </button>
          </div>
          <Button variant="ghost" size="sm" class="h-7 px-2 text-xs" @click="copyDeepLink">
            <Check v-if="linkCopied" class="h-3 w-3 text-green-500 mr-1" />
            <Link v-else class="h-3 w-3 mr-1" />
          </Button>
        </div>
      </div>

      <!-- Desktop: Side by side layout -->
      <div class="grid xl:grid-cols-2 gap-3 items-stretch">
        <!-- Form Panel -->
        <div :class="{ 'hidden xl:block': paramsInputMode === 'json' }">
          <JsonForms
            :data="formData"
            :schema="jsonSchema"
            :renderers="customRenderers"
            @change="onFormChange"
          />
        </div>

        <!-- JSON Panel -->
        <div class="flex flex-col" :class="{ 'hidden xl:flex': paramsInputMode === 'form' }">
          <div class="text-xs text-muted-foreground mb-1 xl:block hidden">Raw JSON</div>
          <textarea
            :value="paramsJsonText"
            class="flex-1 min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="{ 'border-destructive': paramsJsonError }"
            @input="onParamsJsonChange(($event.target as HTMLTextAreaElement).value)"
          />
          <div v-if="paramsJsonError" class="text-xs text-destructive mt-1">
            {{ paramsJsonError }}
          </div>
        </div>
      </div>
    </div>

    <!-- API Panels: REST/TX JSON + Dyslang Script -->
    <div v-if="supportsDyslang" class="mt-4">
      <!-- Mobile: Toggle buttons -->
      <div class="xl:hidden flex border rounded-md overflow-hidden mb-3 w-fit">
        <button
          class="px-3 py-1.5 text-sm transition-colors"
          :class="
            globalSelectedTab === 'rest'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          "
          @click="globalSelectedTab = 'rest'"
        >
          {{ isQuery ? 'REST API' : 'TX JSON' }}
        </button>
        <button
          class="px-3 py-1.5 text-sm transition-colors"
          :class="
            globalSelectedTab === 'dyslang'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          "
          @click="globalSelectedTab = 'dyslang'"
        >
          Dyslang Script
        </button>
      </div>

      <!-- Side by side on desktop, toggle on mobile -->
      <div class="grid xl:grid-cols-2 gap-4">
        <!-- REST API / TX JSON Panel -->
        <div :class="{ 'hidden xl:block': globalSelectedTab === 'dyslang' }">
          <!-- REST API (for queries) -->
          <div v-if="isQuery" class="border rounded-md p-3 space-y-3">
            <div class="text-lg font-medium">REST API</div>
            <div class="flex items-end gap-2">
              <Field class="flex-1">
                <FieldLabel>Request URL</FieldLabel>
                <Input :model-value="urlPreview" readonly class="font-mono text-xs" />
              </Field>
              <Button
                class="bg-green-600 hover:bg-green-700 text-white h-10 px-6 shrink-0"
                :disabled="isLoading"
                @click="execute"
              >
                {{ isLoading ? 'Loading...' : endpoint.method.toUpperCase() }}
              </Button>
            </div>
            <div v-if="bodyPreview">
              <div class="text-xs text-muted-foreground mb-1">Request Body</div>
              <pre class="bg-zinc-900 text-zinc-100 p-2 rounded text-xs overflow-x-auto max-h-32">{{
                JSON.stringify(bodyPreview, null, 2)
              }}</pre>
            </div>
            <div v-if="error || response || exampleResponse">
              <div class="text-sm font-medium mb-2">Response</div>
              <div
                v-if="error"
                class="bg-destructive/10 border border-destructive/20 rounded p-3 mb-2"
              >
                <div class="text-sm text-destructive">{{ error }}</div>
              </div>
              <div v-if="response">
                <pre
                  class="bg-zinc-900 text-zinc-100 p-3 rounded text-xs overflow-x-auto max-h-60"
                  >{{ JSON.stringify(response, null, 2) }}</pre
                >
              </div>
              <div v-else-if="exampleResponse">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs font-medium">200</span>
                  <span class="text-xs text-muted-foreground">Example response</span>
                </div>
                <pre
                  class="bg-zinc-900 text-zinc-100 p-3 rounded text-xs overflow-x-auto max-h-60"
                  >{{ JSON.stringify(exampleResponse, null, 2) }}</pre
                >
              </div>
            </div>
          </div>

          <!-- TX JSON (for messages) -->
          <div v-else class="border rounded-md p-3 space-y-3">
            <div class="flex items-center justify-between">
              <div class="text-lg font-medium">TX JSON</div>
              <Button variant="ghost" size="sm" class="h-7 px-2" @click="copyJson">
                <Check v-if="jsonCopied" class="h-3 w-3 text-green-500" />
                <Copy v-else class="h-3 w-3" />
                <span class="ml-1 text-xs">{{ jsonCopied ? 'Copied' : 'Copy' }}</span>
              </Button>
            </div>
            <FieldDescription>
              Raw message JSON for signing and broadcasting a transaction.
            </FieldDescription>
            <pre class="bg-zinc-900 text-zinc-100 p-3 rounded text-xs overflow-x-auto max-h-80">{{
              JSON.stringify(msgJsonPayload, null, 2)
            }}</pre>

            <!-- Wallet selector and sign button -->
            <div class="flex items-end gap-2 pt-2 border-t">
              <div class="max-w-[240px]">
                <div class="text-xs text-muted-foreground mb-1">Wallet</div>
                <WalletSelector
                  v-model="selectedWalletAddress"
                  @update:executor-address="executorAddress = $event"
                  @update:grantee-address="granteeAddress = $event"
                />
              </div>
              <Button
                class="bg-green-600 hover:bg-green-700 text-white h-10 px-6 shrink-0"
                :disabled="isSigning || !executorAddress"
                @click="signAndSendTx"
              >
                <Send class="h-4 w-4 mr-2" />
                {{ isSigning ? 'Signing...' : 'Sign & Send' }}
              </Button>
            </div>

            <!-- Transaction result -->
            <div
              v-if="txResult"
              class="rounded-lg p-3"
              :class="
                txResult.success ? 'border border-green-500/50' : 'border border-destructive/50'
              "
            >
              <div v-if="txResult.success" class="text-sm text-green-600 dark:text-green-400">
                ✓ Transaction sent!
                <a
                  v-if="txResult.txHash"
                  :href="`/txs/${txResult.txHash}`"
                  class="underline ml-1 font-mono text-xs"
                >
                  {{ txResult.txHash.slice(0, 12) }}...
                </a>
              </div>
              <div v-else class="text-sm text-destructive">{{ txResult.error }}</div>
            </div>
          </div>
        </div>

        <!-- Dyslang Script Panel -->
        <div :class="{ 'hidden xl:block': globalSelectedTab === 'rest' }">
          <div class="border rounded-md p-3 space-y-3">
            <div class="text-lg font-medium">Dyslang Script</div>
            <div class="flex items-end gap-2">
              <Field class="flex-1">
                <FieldLabel>Script Address to simulate</FieldLabel>
                <Input v-model="globalScriptAddress" placeholder="dys2..." class="font-mono" />
              </Field>
              <Button
                class="bg-green-600 hover:bg-green-700 text-white h-10 px-6 shrink-0"
                :disabled="isSimulating || !globalScriptAddress"
                @click="runScriptQuery"
              >
                <Play class="h-4 w-4 mr-2" />
                {{ isSimulating ? 'Running...' : 'Simulate' }}
              </Button>
            </div>
            <div class="relative border rounded-md overflow-hidden">
              <MonacoEditor
                v-model="scriptCode"
                language="python"
                :theme="editorTheme"
                :auto-height="true"
                :min-height="100"
                :max-height="300"
              />
              <Button
                variant="ghost"
                size="sm"
                class="absolute top-2 right-2 h-7 px-2 bg-zinc-800 hover:bg-zinc-700 z-10"
                @click="copyCode"
              >
                <Check v-if="codeCopied" class="h-3 w-3 text-green-500" />
                <Copy v-else class="h-3 w-3" />
                <span class="ml-1 text-xs">{{ codeCopied ? 'Copied' : 'Copy' }}</span>
              </Button>
            </div>

            <!-- Error Display -->
            <div v-if="simulateError" class="rounded-lg border border-destructive/50 p-3 space-y-2">
              <div class="text-sm font-medium text-destructive">{{ simulateError.context }}</div>
              <div class="text-sm text-destructive/90">{{ simulateError.message }}</div>

              <template v-if="simulateError.payload">
                <div v-if="simulateError.stdout" class="overflow-x-auto">
                  <div class="text-xs text-muted-foreground mb-1">stdout</div>
                  <pre
                    class="text-xs p-2 bg-zinc-900 text-zinc-100 rounded whitespace-pre max-h-60 overflow-y-auto"
                  ><code>{{ String(simulateError.stdout || '') }}</code></pre>
                </div>
              </template>

              <div v-if="simulateError.sourceSegment" class="overflow-x-auto">
                <pre
                  class="text-xs p-2 bg-destructive/5 border border-destructive/20 rounded font-mono whitespace-pre"
                  >{{ simulateError.sourceSegment }}</pre
                >
              </div>

              <div
                v-if="simulateError.payload"
                class="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1"
              >
                <span
                  >gas:
                  {{ simulateError.payload.script_gas_consumed?.toLocaleString() ?? 'null' }}</span
                >
                <span>nodes: {{ simulateError.payload.nodes_called ?? 'null' }}</span>
                <span
                  >cumsize: {{ simulateError.payload.cumsize?.toLocaleString() ?? 'null' }}</span
                >
              </div>
            </div>

            <!-- Success Display -->
            <div v-if="simulateResult" class="rounded-lg border border-green-500/50 p-3 space-y-2">
              <div class="text-sm font-medium text-green-600 dark:text-green-400">
                Query Successful
              </div>

              <div class="overflow-x-auto">
                <div class="text-xs text-muted-foreground mb-1">stdout</div>
                <pre
                  class="text-xs p-2 bg-zinc-900 text-zinc-100 rounded whitespace-pre max-h-60 overflow-y-auto"
                ><code>{{ String(simulateResult.stdout || '') }}</code></pre>
              </div>

              <div class="overflow-x-auto">
                <div class="text-xs text-muted-foreground mb-1">result (return value)</div>
                <pre
                  class="text-xs p-2 bg-zinc-900 text-zinc-100 rounded whitespace-pre max-h-40 overflow-y-auto"
                ><code>{{ formatJson(simulateResult.returnValue) }}</code></pre>
              </div>

              <div class="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                <span>gas: {{ simulateResult.gasConsumed?.toLocaleString() ?? 'null' }}</span>
                <span>nodes: {{ simulateResult.nodesExecuted ?? 'null' }}</span>
                <span>cumsize: {{ simulateResult.cumSize?.toLocaleString() ?? 'null' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- REST-only layout (when Dyslang not supported) -->
    <div v-else class="mt-3">
      <!-- REST API (for queries) -->
      <div v-if="isQuery" class="border rounded-md p-3 space-y-3">
        <div class="text-lg font-medium">REST API</div>
        <div class="flex items-end gap-2">
          <Field class="flex-1">
            <FieldLabel>Request URL</FieldLabel>
            <Input :model-value="urlPreview" readonly class="font-mono text-xs" />
          </Field>
          <Button
            class="bg-green-600 hover:bg-green-700 text-white h-10 px-6 shrink-0"
            :disabled="isLoading"
            @click="execute"
          >
            {{ isLoading ? 'Loading...' : endpoint.method.toUpperCase() }}
          </Button>
        </div>
        <div v-if="bodyPreview">
          <div class="text-xs text-muted-foreground mb-1">Request Body</div>
          <pre class="bg-zinc-900 text-zinc-100 p-2 rounded text-xs overflow-x-auto max-h-32">{{
            JSON.stringify(bodyPreview, null, 2)
          }}</pre>
        </div>
        <div v-if="error || response || exampleResponse">
          <div class="text-sm font-medium mb-2">Response</div>
          <div v-if="error" class="bg-destructive/10 border border-destructive/20 rounded p-3 mb-2">
            <div class="text-sm text-destructive">{{ error }}</div>
          </div>
          <div v-if="response">
            <pre class="bg-zinc-900 text-zinc-100 p-3 rounded text-xs overflow-x-auto max-h-60">{{
              JSON.stringify(response, null, 2)
            }}</pre>
          </div>
          <div v-else-if="exampleResponse">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-medium">200</span>
              <span class="text-xs text-muted-foreground">Example response</span>
            </div>
            <pre class="bg-zinc-900 text-zinc-100 p-3 rounded text-xs overflow-x-auto max-h-60">{{
              JSON.stringify(exampleResponse, null, 2)
            }}</pre>
          </div>
        </div>
      </div>

      <!-- TX JSON (for messages) -->
      <div v-else class="border rounded-md p-3 space-y-3">
        <div class="flex items-center justify-between">
          <div class="text-lg font-medium">TX JSON</div>
          <Button variant="ghost" size="sm" class="h-7 px-2" @click="copyJson">
            <Check v-if="jsonCopied" class="h-3 w-3 text-green-500" />
            <Copy v-else class="h-3 w-3" />
            <span class="ml-1 text-xs">{{ jsonCopied ? 'Copied' : 'Copy' }}</span>
          </Button>
        </div>
        <FieldDescription>
          Raw message JSON for signing and broadcasting a transaction.
        </FieldDescription>
        <pre class="bg-zinc-900 text-zinc-100 p-3 rounded text-xs overflow-x-auto max-h-80">{{
          JSON.stringify(msgJsonPayload, null, 2)
        }}</pre>

        <!-- Wallet selector and sign button -->
        <div class="flex items-end gap-2 pt-2 border-t">
          <div class="max-w-[240px]">
            <div class="text-xs text-muted-foreground mb-1">Wallet</div>
            <WalletSelector
              v-model="selectedWalletAddress"
              @update:executor-address="executorAddress = $event"
              @update:grantee-address="granteeAddress = $event"
            />
          </div>
          <Button
            class="bg-green-600 hover:bg-green-700 text-white h-10 px-6 shrink-0"
            :disabled="isSigning || !executorAddress"
            @click="signAndSendTx"
          >
            <Send class="h-4 w-4 mr-2" />
            {{ isSigning ? 'Signing...' : 'Sign & Send' }}
          </Button>
        </div>

        <!-- Transaction result -->
        <div
          v-if="txResult"
          class="rounded-lg p-3"
          :class="txResult.success ? 'border border-green-500/50' : 'border border-destructive/50'"
        >
          <div v-if="txResult.success" class="text-sm text-green-600 dark:text-green-400">
            ✓ Transaction sent!
            <a
              v-if="txResult.txHash"
              :href="`/txs/${txResult.txHash}`"
              class="underline ml-1 font-mono text-xs"
            >
              {{ txResult.txHash.slice(0, 12) }}...
            </a>
          </div>
          <div v-else class="text-sm text-destructive">{{ txResult.error }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
