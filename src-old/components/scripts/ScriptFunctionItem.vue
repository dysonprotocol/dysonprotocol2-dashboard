<template>
  <div class="collapse bg-base-100">
    <input type="checkbox" :checked="isOpen" @change="toggle" />
    <div class="collapse-title font-semibold">{{ func.function_name }}</div>
    <div class="collapse-content">
      <div v-if="func.docstring" class="mb-4 p-3 bg-base-200 -md">
        <div class="text-sm whitespace-pre-wrap">{{ func.docstring }}</div>
      </div>

      <div v-if="hasParameters">
        <label class="block text-sm font-medium mb-2">Parameters:</label>
        <textarea
          v-model="kwargsInput"
          ref="textareaRef"
          class="textarea textarea-bordered w-full text-sm font-mono resize-none"
          :placeholder="placeholder"
          @input="autoResize($event)"
        />
        <div v-if="jsonError" class="text-error text-xs mt-1">
          {{ jsonError }}
        </div>
      </div>
      <div v-else class="text-center py-4 text-base-content/60 text-sm">
        {{ noParamsMessage }}
      </div>

      <!-- Optional: attach a coin transfer to this call -->
      <div class="mt-3">
        <label class="label cursor-pointer justify-start gap-2 text-sm">
          <input type="checkbox" class="checkbox checkbox-sm" v-model="attachSend" />
          <span>Attach coin transfer (bank MsgSend)</span>
        </label>
        <div class="mt-2" v-if="attachSend">
          <AmountDenomSelector
            :disabled="isSimulating || isExecuting"
            @update:base="onSendBaseUpdate"
          />
          <div class="text-xs opacity-70 mt-1">
            From <AddressDisplay :address="selectedExecutor" :truncate="5" /> to
            <AddressDisplay :address="address" :truncate="5" />
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="errorText" class="mt-4 break-all">
        <div class="alert alert-error text-base-content alert-outline">
          <div class="text-sm">
            <div class="font-medium">{{ errorHeader }}</div>
          </div>
        </div>
        <div class="mt-2">
          <div class="font-medium text-xs opacity-80">Error:</div>
          <pre
            class="text-xs bg-base-200 p-2 mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words"
            >{{ errorText }}</pre
          >
          <div v-if="exception" class="mt-2 text-xs">
            <button class="link link-error" @click="goToException">
              Go to line {{ exception.lineno }}:{{ exception.col_offset }}
            </button>
          </div>
        </div>
      </div>

      <!-- Success Display -->
      <div v-if="result" class="mt-4 break-all">
        <div class="alert alert-success text-base-content alert-outline">
          <div class="text-sm">
            <div class="font-medium">
              {{ result.simulate ? 'Simulation' : 'Execution' }} Successful
            </div>
          </div>
        </div>
        <div>
          <div v-if="result.result !== null" class="mt-2">
            <div class="font-medium text-xs opacity-80">Result:</div>
            <pre class="text-xs bg-base-200 p-2 mt-1 max-h-64 overflow-x-auto wrap-anywhere">{{
              formatResult(result.result)
            }}</pre>
          </div>
          <div v-if="result.stdout" class="mt-2">
            <div class="font-medium text-xs opacity-80">Output:</div>
            <pre class="text-xs bg-base-200 p-2 mt-1 max-h-32 overflow-x-auto">{{
              result.stdout
            }}</pre>
          </div>
          <div class="mt-2 text-xs opacity-80 flex gap-4">
            <span>Gas: {{ formatNumber(result.gasConsumed) }}</span>
            <span>Nodes: {{ formatNumber(result.nodesExecuted) }}</span>
          </div>
          <div v-if="!result.simulate && result.txHash" class="mt-2">
            <div class="font-medium text-xs opacity-80">Transaction:</div>
            <div class="text-xs bg-base-200 p-2 mt-1">
              <div>
                Hash:
                <TxHashDisplay :hash="result.txHash" :truncate="8" />
              </div>
              <div v-if="result.blockHeight">Block: {{ result.blockHeight }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions + Executor (joined) -->
      <div class="mt-4 flex justify-end">
        <div class="join">
          <WalletSelector
            v-model="selectedExecutor"
            :show-locked="true"
            :default-address="selectedExecutor"
            :default-grantee="selectedGranteeAddress"
            :button-class="'btn-sm join-item'"
            :msg-type-filter="msgTypeFilter"
            @update:executor-address="onExecutorAddress"
            @update:grantee-address="onGranteeAddress"
            @update:is-authz="onIsAuthz"
            @update:authz-notes="onAuthzNotes"
            @update:selected-grant="onSelectedGrant"
          />
          <button
            @click="simulate"
            class="btn btn-sm join-item"
            :disabled="isSimulating || !!jsonError || hasUnsavedChanges"
          >
            {{ isSimulating ? 'Simulating...' : 'Simulate' }}
          </button>
          <button
            @click="execute"
            class="btn btn-sm btn-primary join-item"
            :disabled="isExecuting || !!jsonError || hasUnsavedChanges"
          >
            {{ isExecuting ? 'Sending...' : 'Tx' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGoToException } from '@/composables/useGoToException'
import { useStorage } from '@vueuse/core'
import { useWallet } from '@/composables/useWallet'
import WalletSelector from '@/components/shared/WalletSelector.vue'
import TxHashDisplay from '@/components/TxHashDisplay.vue'
import AmountDenomSelector from '@/components/AmountDenomSelector.vue'
import AddressDisplay from '@/components/AddressDisplay.vue'

const props = defineProps({
  address: { type: String, required: true },
  func: { type: Object, required: true },
  hasUnsavedChanges: { type: Boolean, default: false },
})
const emit = defineEmits(['function-executed', 'focus-code'])

const wallet = useWallet()
const route = useRoute()
const router = useRouter()
const { goToException: goTo } = useGoToException()

// Open state per address+fn
const openStates = useStorage('script-function-open-states', {})
const storageKey = computed(() => `${props.address}_${props.func.function_name}`)
const isOpen = computed(() => openStates.value[storageKey.value] ?? false)
const toggle = () => (openStates.value[storageKey.value] = !isOpen.value)

// Per-function executor/grantee persistence
const functionExecutors = useStorage('script-function-executors', {})
const functionGrantees = useStorage('script-function-grantees', {})
const selectedExecutor = ref('')
// Authz selection state
const isAuthz = ref(false)
const authzNotes = ref('')
const selectedGrant = ref(null)
const selectedExecutorAddress = ref('')
const selectedGranteeAddress = ref('')

// Kwargs input and validation persistence
const paramInputs = useStorage('script-function-parameters', {})
const kwargsInput = ref('')
const jsonError = ref('')

// (extra code removed for function items)

const textareaRef = ref(null)

const hasParameters = computed(() => props.func.parameters && props.func.parameters.length > 0)
const placeholder = computed(() => buildKwargsPlaceholder(props.func))
const noParamsMessage = computed(() =>
  props.func.kwargs === null
    ? 'This function has no parameters'
    : 'This function takes optional parameters only'
)

const errorText = ref('')
const result = ref(null)
const context = ref(null)
const exception = computed(() => context.value?.exception)
const errorHeader = computed(() =>
  context.value?.simulate ? 'Simulation Failed' : 'Execution Failed'
)

const isExecuting = ref(false)
const isSimulating = ref(false)

// Attached bank send state
const attachSend = ref(false)
const sendBaseAmount = ref('')
const sendBaseDenom = ref('')

function onSendBaseUpdate(v) {
  sendBaseAmount.value = String(v?.amount || '')
  sendBaseDenom.value = String(v?.denom || '')
}

function buildKwargsPlaceholder(f) {
  const parameters = f.parameters
  if (!parameters || parameters.length === 0) return '{}'
  const form = {}
  for (const p of parameters) form[p.name] = p.required ? null : p.default
  return JSON.stringify(form, null, 2)
}

function autoResize(event) {
  const textarea = event.target
  if (!textarea) return
  textarea.style.height = 'auto'
  const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20
  const padding =
    parseInt(window.getComputedStyle(textarea).paddingTop) +
    parseInt(window.getComputedStyle(textarea).paddingBottom)
  const minHeight = lineHeight * 3 + padding
  const maxHeight = lineHeight * 10 + padding
  const newHeight = Math.max(minHeight, Math.min(maxHeight, textarea.scrollHeight))
  textarea.style.height = `${newHeight}px`
}

watch(
  () => props.func,
  (f) => {
    const k = storageKey.value
    if (!paramInputs.value[k]) paramInputs.value[k] = buildKwargsPlaceholder(f)
    kwargsInput.value = paramInputs.value[k]
    if (!functionExecutors.value[k]) functionExecutors.value[k] = props.address
    selectedExecutor.value = functionExecutors.value[k]
    selectedGranteeAddress.value = functionGrantees.value[k] || ''
    // validate
    validateJson(kwargsInput.value)
    nextTick(() => textareaRef.value && autoResize({ target: textareaRef.value }))
  },
  { immediate: true }
)

watch(kwargsInput, (v) => {
  paramInputs.value[storageKey.value] = v
  validateJson(v)
})

watch(selectedExecutor, (v) => {
  functionExecutors.value[storageKey.value] = v
})

watch(selectedGranteeAddress, (v) => {
  functionGrantees.value[storageKey.value] = v || ''
})

function validateJson(v) {
  try {
    JSON.parse(v || '{}')
    jsonError.value = ''
  } catch {
    jsonError.value = 'Invalid JSON format'
  }
}

function formatResult(r) {
  if (typeof r === 'string') return r
  return JSON.stringify(r, null, 2)
}

function formatNumber(num) {
  if (num == null || num === undefined) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return Number(num).toLocaleString()
}

async function run(simulate) {
  if (jsonError.value) return
  errorText.value = ''
  result.value = null
  context.value = null
  const setLoading = (v) => ((simulate ? isSimulating : isExecuting).value = v)
  setLoading(true)
  try {
    // Build optional attached bank send as JSON string
    const attached = []
    const amt = sendBaseAmount.value.trim()
    const denom = sendBaseDenom.value.trim()
    if (attachSend.value && amt !== '' && denom !== '' && Number(amt) > 0) {
      const msgSend = {
        '@type': '/cosmos.bank.v1beta1.MsgSend',
        from_address: selectedExecutor.value,
        to_address: props.address,
        amount: [{ denom, amount: amt }],
      }
      attached.push(msgSend)
    }

    const res = await wallet.runDysonScript({
      scriptAddress: props.address,
      functionName: props.func.function_name,
      kwargs: kwargsInput.value || '{}',
      attachedMsg: attached,
      simulate,
      executorAddress: selectedExecutor.value,
      grantee: isAuthz.value ? selectedGranteeAddress.value : undefined,
    })
    if (res.scriptResponse?.exception) {
      const ex = res.scriptResponse.exception
      const msg = `${ex.context}: ${ex.msg}\nLine ${ex.lineno}, column ${ex.col_offset}\nCode: ${ex.source_segment}`
      errorText.value = res.scriptResponse.stdout
        ? `${msg}\n\nOutput:\n${res.scriptResponse.stdout}`
        : msg
      context.value = { simulate, exception: ex }
      emit('function-executed', {
        func: props.func,
        error: errorText.value,
        simulate,
      })
    } else if (res.scriptResponse) {
      const out = {
        result: res.scriptResponse.result,
        stdout: res.scriptResponse.stdout,
        gasConsumed: res.scriptResponse.script_gas_consumed,
        nodesExecuted: res.scriptResponse.nodes_called,
        simulate,
        txHash: !simulate ? res.rawSendMsgsResponse?.raw?.tx_response?.txhash : null,
        blockHeight: !simulate ? res.rawSendMsgsResponse?.raw?.tx_response?.height : null,
      }
      result.value = out
      emit('function-executed', {
        func: props.func,
        kwargs: JSON.parse(kwargsInput.value || '{}'),
        res,
        simulate,
      })
    } else if (!res.success) {
      errorText.value = res.rawSendMsgsResponse?.rawLog || 'Script execution failed'
      context.value = { simulate }
      emit('function-executed', {
        func: props.func,
        error: errorText.value,
        simulate,
      })
    }
  } catch (err) {
    errorText.value = err.message || String(err)
    context.value = { simulate }
    emit('function-executed', {
      func: props.func,
      error: errorText.value,
      simulate,
    })
  } finally {
    setLoading(false)
  }
}

const simulate = () => run(true)
const execute = () => run(false)

// Authz-aware filter: GenericAuthorization for script MsgExec and ScriptExecAuthorization for this function
function msgTypeFilter(grant) {
  const auth = grant?.authorization
  if (!auth?.['@type']) return { valid: false, notes: 'No authorization' }

  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/dysonprotocol.script.v1.MsgExec'
    return { valid: ok, notes: ok ? 'Generic Script MsgExec' : 'Wrong msg' }
  }

  if (auth['@type'] === '/dysonprotocol.script.v1.ScriptExecAuthorization') {
    if (auth.script_address !== props.address) return { valid: false, notes: 'Different script' }
    const fns = Array.isArray(auth.function_names) ? auth.function_names : []
    const ok = fns.length === 0 || fns.includes(props.func.function_name)
    return {
      valid: ok,
      notes: ok ? `Functions allowed: ${fns.join(', ')}` : 'Function not permitted',
    }
  }

  return { valid: false, notes: 'Unsupported authz type' }
}

function onExecutorAddress(addr) {
  selectedExecutorAddress.value = addr || ''
}
function onGranteeAddress(addr) {
  selectedGranteeAddress.value = addr || ''
}
function onIsAuthz(v) {
  isAuthz.value = !!v
}
function onAuthzNotes(n) {
  authzNotes.value = n || ''
}
function onSelectedGrant(g) {
  selectedGrant.value = g || null
}

function goToException() {
  const ex = exception.value
  if (!ex) return
  emit('focus-code')
  goTo({
    exception: ex,
    baseLineCount: 0, // function item errors always refer to base script
    emitFocus: () => emit('focus-code'),
    // no local highlight from function item
  })
}
</script>
