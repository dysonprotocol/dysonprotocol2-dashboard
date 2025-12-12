<script setup lang="ts">
import { ref, computed } from 'vue'
import { JsonForms } from '@jsonforms/vue'
import { PenLine, Play, Send, Copy, Check, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import CodeBlock from './CodeBlock.vue'
import { customRenderers } from '@/renderers'
import type { MsgDoc } from '@/composables/useSwaggerDocs'
import { useWallet } from '@/composables/useWallet'

const props = defineProps<{
  msg: MsgDoc
  schema?: any
}>()

const wallet = useWallet()
const formData = ref<Record<string, any>>({})
const isSimulating = ref(false)
const isSending = ref(false)
const response = ref<any>(null)
const error = ref<string | null>(null)
const showResponse = ref(false)
const showScript = ref(true)
const copied = ref(false)

// Build schema for JSON Forms
const jsonSchema = computed(() => {
  if (props.schema?.request) {
    return props.schema.request
  }

  // Build from swagger definitions
  const bodyParam = props.msg.parameters?.find((p) => p.in === 'body')
  if (bodyParam?.schema?.$ref) {
    const refName = bodyParam.schema.$ref.replace('#/definitions/', '')
    const def = props.msg.schema[refName]
    if (def) {
      return {
        ...def,
        definitions: props.msg.schema,
      }
    }
  }

  return { type: 'object', properties: {} }
})

function onChange(event: { data: any }) {
  formData.value = event.data
}

async function simulate() {
  isSimulating.value = true
  error.value = null
  response.value = null

  try {
    const msg = {
      '@type': props.msg.typeUrl,
      ...formData.value,
    }

    const executorAddress =
      formData.value.executor_address ||
      formData.value.from_address ||
      formData.value.creator_address ||
      wallet.unlockedWallets.value?.[0]?.address

    if (!executorAddress) {
      throw new Error('Please connect a wallet or fill in an address')
    }

    const result = await wallet.sendMsg({
      msg,
      executorAddress,
      gasLimit: 'auto',
      memo: '',
    })

    if (result.success) {
      response.value = {
        success: true,
        gasUsed: result.raw?.gas_info?.gas_used,
        message: 'Simulation successful',
      }
    } else {
      throw new Error(result.rawLog || 'Simulation failed')
    }
    showResponse.value = true
  } catch (err: any) {
    error.value = err?.message || 'Simulation failed'
    showResponse.value = true
  } finally {
    isSimulating.value = false
  }
}

async function signTx() {
  isSending.value = true
  error.value = null
  response.value = null

  try {
    const msg = {
      '@type': props.msg.typeUrl,
      ...formData.value,
    }

    const executorAddress =
      formData.value.executor_address ||
      formData.value.from_address ||
      formData.value.creator_address ||
      wallet.unlockedWallets.value?.[0]?.address

    if (!executorAddress) {
      throw new Error('Please connect a wallet or fill in an address')
    }

    const result = await wallet.sendMsg({
      msg,
      executorAddress,
      gasLimit: 'auto',
      memo: '',
    })

    if (result.success) {
      response.value = {
        success: true,
        txHash: result.raw?.tx_response?.txhash,
        height: result.raw?.tx_response?.height,
      }
    } else {
      throw new Error(result.rawLog || 'Transaction failed')
    }
    showResponse.value = true
  } catch (err: any) {
    error.value = err?.message || 'Transaction failed'
    showResponse.value = true
  } finally {
    isSending.value = false
  }
}

// Generate Python script example
const scriptExample = computed(() => {
  const params = Object.entries(formData.value)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => {
      // Special handling for address fields
      if (k.endsWith('_address') || k === 'address') {
        if (k === 'from_address' || k === 'executor_address' || k === 'creator_address') {
          return `    "${k}": get_script_address(),  # Your script's address`
        }
      }
      return `    "${k}": ${JSON.stringify(v)}`
    })
    .join(',\n')

  return `from dys import _msg, get_script_address

result = _msg({
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

const hasWallet = computed(() => wallet.unlockedWallets.value?.length > 0)
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center gap-2">
        <Badge class="gap-1 bg-purple-600">
          <PenLine class="h-3 w-3" />
          Transaction
        </Badge>
        <Badge variant="outline">{{ msg.module }}</Badge>
      </div>
      <CardTitle class="font-mono text-lg">{{ msg.operationId }}</CardTitle>
      <CardDescription>{{ msg.summary }}</CardDescription>
    </CardHeader>

    <CardContent class="space-y-4">
      <!-- Type URL -->
      <div>
        <label class="text-xs font-medium text-muted-foreground">Type URL</label>
        <code class="block text-sm bg-muted px-2 py-1 rounded mt-1 overflow-x-auto">
          {{ msg.typeUrl }}
        </code>
      </div>

      <!-- Form -->
      <div v-if="jsonSchema.properties && Object.keys(jsonSchema.properties).length > 0">
        <h4 class="text-sm font-medium mb-2">Parameters</h4>
        <JsonForms
          :data="formData"
          :schema="jsonSchema"
          :renderers="customRenderers"
          @change="onChange"
        />
      </div>
      <div v-else class="text-sm text-muted-foreground py-2">No parameters required</div>

      <!-- Wallet Warning -->
      <Alert v-if="!hasWallet" variant="default">
        <AlertDescription> Connect a wallet to simulate or sign transactions. </AlertDescription>
      </Alert>

      <!-- Actions -->
      <div class="flex gap-2 flex-wrap">
        <Button variant="outline" :disabled="isSimulating || !hasWallet" @click="simulate">
          <Play class="h-4 w-4 mr-2" />
          {{ isSimulating ? 'Simulating...' : 'Simulate' }}
        </Button>
        <Button :disabled="isSending || !hasWallet" @click="signTx">
          <Send class="h-4 w-4 mr-2" />
          {{ isSending ? 'Sending...' : 'Sign Transaction' }}
        </Button>
        <Button variant="ghost" @click="copyScript">
          <Check v-if="copied" class="h-4 w-4 mr-2 text-green-500" />
          <Copy v-else class="h-4 w-4 mr-2" />
          Copy as Script
        </Button>
      </div>

      <!-- Error -->
      <Alert v-if="error" variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription class="whitespace-pre-wrap">{{ error }}</AlertDescription>
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
            <p class="text-xs text-muted-foreground mt-2">
              ⚠️ Scripts can only use their own address as from_address/executor_address.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </CardContent>
  </Card>
</template>





