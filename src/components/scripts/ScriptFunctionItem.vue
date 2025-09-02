<template>
  <Accordion
    type="single"
    collapsible
    v-model="accordionValue"
    class="border-b hover:bg-gray-500/10"
  >
    <AccordionItem :value="storageKey">
      <AccordionTrigger>
        <div class="flex-1 text-left">
          <span class="font-semibold font-mono text-sm">{{
            func.signature || func.function_name
          }}</span>
          <pre class="text-sm whitespace-pre-wrap" :class="{ 'line-clamp-3': !isOpen }">{{
            func.docstring
          }}</pre>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div class="pt-2">
          <div v-if="hasParameters">
            <label class="block font-medium mb-2">Parameters:</label>
            <Textarea
              ref="textareaRef"
              v-model="kwargsInput"
              class="font-mono resize-y"
              :placeholder="placeholder"
            />
            <div v-if="jsonError" class="text-destructive mt-1">
              {{ jsonError }}
            </div>
          </div>
          <div v-else class="text-center py-4 text-muted-foreground">
            {{ noParamsMessage }}
          </div>

          <!-- Error Display -->
          <div
            v-if="errorText"
            class="mt-4 break-all rounded-md border border-destructive/30 bg-destructive/10 p-3"
          >
            <div class="font-medium text-destructive">{{ errorHeader }}:</div>
            <div class="mt-2">
              <pre class="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words">{{
                errorText
              }}</pre>
              <div v-if="exception" class="mt-2">
                <Button variant="link" class="p-0 h-auto" @click="goToException">
                  Go to line {{ exception.lineno }}:{{ exception.col_offset }}
                </Button>
              </div>
            </div>
          </div>

          <!-- Success Display -->
          <div v-if="result" class="mt-2 break-all rounded-md border p-3">
            <div class="text-sm font-medium">
              <Badge variant="secondary"
                >{{ result.simulate ? 'Simulation' : 'Execution' }} Successful</Badge
              >
            </div>
            <div>
              <div v-if="result.result !== null" class="mt-2">
                <div class="font-medium opacity-80">Result:</div>
                <pre class="mt-1 max-h-64 overflow-x-auto wrap-anywhere">{{
                  formatResult(result.result)
                }}</pre>
              </div>
              <div v-if="result.stdout" class="mt-2">
                <div class="font-medium opacity-80">Output:</div>
                <pre class="mt-1 max-h-32 overflow-x-auto">{{ result.stdout }}</pre>
              </div>
              <div class="mt-2 opacity-80 flex gap-4">
                <span>Gas: {{ formatNumber(result.gasConsumed) }}</span>
                <span>Nodes: {{ formatNumber(result.nodesExecuted) }}</span>
              </div>
              <div v-if="!result.simulate && result.txHash" class="mt-2">
                <div class="font-medium opacity-80">Transaction:</div>
                <div class="mt-1">
                  <div>
                    Hash:
                    <TxHashDisplay :hash="result.txHash" :truncate="8" />
                  </div>
                  <div v-if="result.blockHeight">Block: {{ result.blockHeight }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-4 flex justify-end items-center gap-2">
            <WalletSelector
              v-model="selectedExecutor"
              :show-locked="true"
              :default-address="selectedExecutor"
              :default-grantee="selectedGranteeAddress"
              :msg-type-filter="msgTypeFilter"
              @update:executor-address="onExecutorAddress"
              @update:grantee-address="onGranteeAddress"
              @update:is-authz="onIsAuthz"
              @update:authz-notes="onAuthzNotes"
              @update:selected-grant="onSelectedGrant"
            />
            <Button
              :disabled="
                isExecuting ||
                !!jsonError ||
                hasUnsavedChanges ||
                (attachSend && !!sendValidationError)
              "
              @click="execute"
            >
              {{ isExecuting ? 'Sending...' : 'Tx' }}
            </Button>
            <Button
              variant="secondary"
              :disabled="
                isSimulating ||
                !!jsonError ||
                hasUnsavedChanges ||
                (attachSend && !!sendValidationError)
              "
              @click="simulate"
            >
              {{ isSimulating ? 'Simulating...' : 'Simulate' }}
            </Button>
          </div>

          <!-- Optional: attach a coin transfer to this call -->
          <div class="mt-3">
            <div class="flex items-center gap-2 text-sm">
              <Checkbox
                id="attach-send"
                v-model:checked="attachSend"
                @click.stop="attachSend = !attachSend"
              />
              <label for="attach-send" class="cursor-pointer select-none">
                Attach coins (bank MsgSend)
              </label>
            </div>
            <div v-if="attachSend" class="mt-2">
              <AmountDenomSelector
                :disabled="isSimulating || isExecuting"
                :base-denoms="ownedBaseDenoms"
                @update:base="onSendBaseUpdate"
              />
              <div v-if="sendValidationError" class="text-error text-xs mt-1">
                {{ sendValidationError }}
              </div>
              <div class="text-xs opacity-70 mt-1">
                From
                <span class="font-mono text-xs font-bold">
                  <AddressDisplay :address="selectedExecutor" :truncate="5" />
                </span>
                to
                <span class="font-mono text-xs font-bold">
                  <AddressDisplay :address="address" :truncate="5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRepo } from 'pinia-orm'
import { useGoToException } from '@/composables/useGoToException'
import { useStorage } from '@vueuse/core'
import { useAxiosRepo } from '@pinia-orm/axios'
import Script from '@/orm/models/script/Script'
import SpendableBalance from '@/orm/models/bank/SpendableBalance'
import DenomMetadata from '@/orm/models/bank/DenomMetadata'
import WalletSelector from '@/components/shared/WalletSelector.vue'
import TxHashDisplay from '@/components/TxHashDisplay.vue'
import AmountDenomSelector from '@/components/AmountDenomSelector.vue'
import AddressDisplay from '@/components/AddressDisplay.vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const props = defineProps({
  address: { type: String, required: true },
  func: { type: Object, required: true },
  hasUnsavedChanges: { type: Boolean, default: false },
})
const emit = defineEmits(['function-executed', 'focus-code'])

const { goToException: goTo } = useGoToException()

// Open state per address+fn
const openStates = useStorage('script-function-open-states', {})
const storageKey = computed(() => `${props.address}_${props.func.function_name}`)
const isOpen = computed(() => openStates.value[storageKey.value] ?? false)

const accordionValue = computed({
  get: () => (isOpen.value ? storageKey.value : ''),
  set: (v) => (openStates.value[storageKey.value] = v === storageKey.value),
})

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

// Spendable balances for selected executor
const spendableRepo = useRepo(SpendableBalance)
const spendables = computed(() =>
  selectedExecutor.value ? spendableRepo.where('address', selectedExecutor.value).get() : []
)
const spendableMap = computed(() => {
  const m = new Map()
  for (const s of spendables.value) m.set(s.denom, s.amount)
  return m
})
const ownedBaseDenoms = computed(() =>
  Array.from(spendableMap.value.entries())
    .filter(([, amount]) => /^\d+$/.test(String(amount)) && String(amount) !== '0')
    .map(([denom]) => denom)
)

const sendValidationError = computed(() => {
  if (!attachSend.value) return ''
  const denom = String(sendBaseDenom.value || '').trim()
  const amt = String(sendBaseAmount.value || '').trim()
  if (!denom || !amt) return ''
  if (!/^\d+$/.test(amt)) return 'Amount must be an integer in base units'
  if (amt === '0') return 'Amount must be greater than 0'
  const bal = spendableMap.value.get(denom) || '0'
  if (BigInt(amt) > BigInt(bal)) {
    const entered = DenomMetadata.normalize({ amount: amt, denom }).display
    const spendable = DenomMetadata.normalize({ amount: bal, denom }).display
    return `Insufficient funds. Spendable: ${spendable.amount} ${spendable.denom}. Entered: ${entered.amount} ${entered.denom}`
  }
  return ''
})

function onSendBaseUpdate(v) {
  sendBaseAmount.value = String(v?.amount || '')
  sendBaseDenom.value = String(v?.denom || '')
}

watch(
  selectedExecutor,
  async (addr) => {
    if (!addr) return
    await useAxiosRepo(SpendableBalance).api().fetchAll(addr)
  },
  { immediate: true }
)

function buildKwargsPlaceholder(f) {
  const parameters = f.parameters
  if (!parameters || parameters.length === 0) return '{}'
  const form = {}
  for (const p of parameters) form[p.name] = p.required ? null : p.default
  return JSON.stringify(form, null, 2)
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
    validateJson(kwargsInput.value)
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
  } catch (e) {
    console.error('Invalid JSON for kwargsInput', e)
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
  if (attachSend.value && sendValidationError.value) return
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
    if (attachSend.value && /^\d+$/.test(amt) && denom !== '' && amt !== '0') {
      const msgSend = {
        '@type': '/cosmos.bank.v1beta1.MsgSend',
        from_address: selectedExecutor.value,
        to_address: props.address,
        amount: [{ denom, amount: amt }],
      }
      attached.push(msgSend)
    }

    const res = await useAxiosRepo(Script)
      .api()
      .runDysonScript({
        scriptAddress: props.address,
        functionName: props.func.function_name,
        kwargs: kwargsInput.value || '{}',
        attachedMsg: attached,
        simulate,
        executorAddress: selectedExecutor.value,
        grantee: isAuthz.value ? selectedGranteeAddress.value : undefined,
      })

    // Prioritize parsed exception (wallet already extracts JSON from error strings)
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
    } else if (!res?.success) {
      // Fall back to raw messages when no parsed scriptResponse is available
      const raw = res?.rawSendMsgsResponse?.raw
      const rawLog = res?.rawSendMsgsResponse?.rawLog
      const errMsg = raw?.message || rawLog || 'Script execution failed'
      errorText.value = String(errMsg)
      context.value = { simulate }
      emit('function-executed', { func: props.func, error: errorText.value, simulate })
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
    } else {
      // Success but no scriptResponse payload
      result.value = {
        result: null,
        stdout: '',
        gasConsumed: 0,
        nodesExecuted: 0,
        simulate,
        txHash: !simulate ? res.rawSendMsgsResponse?.raw?.tx_response?.txhash : null,
        blockHeight: !simulate ? res.rawSendMsgsResponse?.raw?.tx_response?.height : null,
      }
      emit('function-executed', {
        func: props.func,
        kwargs: JSON.parse(kwargsInput.value || '{}'),
        res,
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
  goTo({
    exception: ex,
    baseLineCount: 0, // function item errors always refer to base script
    emitFocus: () => emit('focus-code'),
    // no local highlight from function item
  })
}
</script>
