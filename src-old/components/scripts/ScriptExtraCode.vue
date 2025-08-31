<template>
  <div
    v-if="isAddressKnown"
    ref="rootEl"
    class="collapse bg-base-100 w-full min-w-0"
  >
    <input
      type="checkbox"
      :checked="isCollapsed"
      @change="toggleCollapse"
    >
    <div class="collapse-title font-semibold">
      Extra Code
    </div>
    <div class="collapse-content">
      <div class="form-control min-w-0">
        <div
          ref="editorEl"
          class="h-24 w-full min-w-0 border border-base-300"
        />
        <div class="text-xs opacity-60 wrap-anywhere">
          This code will be temporarily appended to the script before calling the function
        </div>

        <!-- Error Display -->
        <div
          v-if="errorText"
          class="mt-4 break-all"
        >
          <div class="alert alert-error text-base-content alert-outline">
            <div class="text-sm">
              <div class="font-medium">
                {{ errorContext?.simulate ? 'Simulation Failed' : 'Execution Failed' }}
              </div>
            </div>
          </div>
          <div class="mt-2">
            <div class="font-medium text-xs opacity-80">
              Error:
            </div>
            <pre
              class="text-xs bg-base-200 p-2 mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words"
            >{{ errorText }}</pre>
            <div
              v-if="exception"
              class="mt-2 text-xs"
            >
              <button
                class="link link-error"
                @click="goToException"
              >
                Go to line {{ exception.lineno }}:{{ exception.col_offset }}
              </button>
            </div>
          </div>
        </div>

        <!-- Success Display -->
        <div
          v-if="result"
          class="mt-4 break-all"
        >
          <div class="alert alert-success text-base-content alert-outline">
            <div class="text-sm">
              <div class="font-medium">
                {{ result.simulate ? 'Simulation' : 'Execution' }} Successful
              </div>
            </div>
          </div>
          <div>
            <div
              v-if="result.result !== null"
              class="mt-2"
            >
              <div class="font-medium text-xs opacity-80">
                Result:
              </div>
              <pre class="text-xs bg-base-200 p-2 mt-1 max-h-32 overflow-auto">{{
                formatResult(result.result)
              }}</pre>
            </div>
            <div
              v-if="result.stdout"
              class="mt-2"
            >
              <div class="font-medium text-xs opacity-80">
                Output:
              </div>
              <pre class="text-xs bg-base-200 p-2 mt-1 max-h-32 overflow-auto">{{
                result.stdout
              }}</pre>
            </div>
            <div class="mt-2 text-xs opacity-80 flex gap-4">
              <span>Gas: {{ formatNumber(result.gasConsumed) }}</span>
              <span>Nodes: {{ formatNumber(result.nodesExecuted) }}</span>
            </div>
            <div
              v-if="!result.simulate && result.txHash"
              class="mt-2"
            >
              <div class="font-medium text-xs opacity-80">
                Transaction:
              </div>
              <div class="text-xs bg-base-200 p-2 mt-1">
                <div>
                  Hash:
                  <TxHashDisplay
                    :hash="result.txHash"
                    :truncate="8"
                  />
                </div>
                <div v-if="result.blockHeight">
                  Block: {{ result.blockHeight }}
                </div>
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
              :allowed-addresses="[props.address]"
              :default-address="props.address"
              :button-class="'btn-sm join-item'"
              :msg-type-filter="msgTypeFilter"
              @update:executor-address="onExecutorAddress"
              @update:grantee-address="onGranteeAddress"
              @update:is-authz="onIsAuthz"
              @update:authz-notes="onAuthzNotes"
              @update:selected-grant="onSelectedGrant"
            />
            <button
              class="btn btn-sm join-item"
              :disabled="
                isSimulating || !extraCode.trim() || !selectedExecutor || hasUnsavedChanges
              "
              @click="simulate"
            >
              {{ isSimulating ? 'Simulating...' : 'Simulate' }}
            </button>
            <button
              class="btn btn-sm btn-primary join-item"
              :disabled="isExecuting || !extraCode.trim() || !selectedExecutor || hasUnsavedChanges"
              @click="execute"
            >
              {{ isExecuting ? 'Sending...' : 'Tx' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGoToException } from '@/composables/useGoToException'
import * as monaco from 'monaco-editor'
import { useStorage } from '@vueuse/core'
import { useWallet } from '@/composables/useWallet'
import WalletSelector from '@/components/shared/WalletSelector.vue'
import TxHashDisplay from '@/components/TxHashDisplay.vue'

const props = defineProps({
  address: { type: String, required: true },
  currentScriptContent: { type: String, default: '' },
  hasUnsavedChanges: { type: Boolean, default: false },
})
const emit = defineEmits(['focus-code'])

const wallet = useWallet()
const { unlockedWallets, localCosmJsWallets } = wallet
// Authz selection state
const isAuthz = ref(false)
const authzNotes = ref('')
const selectedGrant = ref(null)
const selectedExecutorAddress = ref('')
const selectedGranteeAddress = ref('')

// Persist extra code per address
const extraCodeStorage = useStorage('script-extra-codes', {})
const extraCode = ref('')

// Persist collapse
const isCollapsedStore = useStorage('script-extra-code-collapsed', false)
const isCollapsed = computed(() => isCollapsedStore.value)
const toggleCollapse = () => (isCollapsedStore.value = !isCollapsedStore.value)

// Persist executor per address (restricted set → script address)
const extraExecutors = useStorage('script-extra-executors', {})
const selectedExecutor = ref('')

// Track sidebar width to force Monaco relayout on shrink
const sidebarWidth = useStorage('script-sidebar-width', 320)

// Editor
const rootEl = ref()
const editorEl = ref()
let editor = null
let errorDecorations = null
let resizeObserver = null
const route = useRoute()
const router = useRouter()

const editorTheme = computed(() => (globalThis.__dyson_theme === 'dark' ? 'vs-dark' : 'vs'))
const scriptLineCount = computed(() => {
  const content = props.currentScriptContent || ''
  if (!content) return 0
  return content.split('\n').length
})

// Execution state
const isExecuting = ref(false)
const isSimulating = ref(false)
const result = ref(null)
const errorText = ref('')
const errorContext = ref(null)
const exception = ref(null)

// Only render if address exists in any wallet (unlocked or locked)
const isAddressKnown = computed(() => {
  const unlocked = unlockedWallets.value?.some((w) => w.address === props.address)
  if (unlocked) return true
  const locked = localCosmJsWallets.value?.some((w) => w.address === props.address)
  return !!locked
})

function initEditor() {
  if (!editorEl.value) return
  editorEl.value.innerHTML = ''
  editor = monaco.editor.create(editorEl.value, {
    value: extraCode.value,
    language: 'python',
    theme: editorTheme.value,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'on',
    fontSize: 12,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    lineNumbers: (v) => v + scriptLineCount.value,
    folding: false,
    lineDecorationsWidth: 30,
    lineNumbersMinChars: 3,
    glyphMargin: false,
  })
  editor.onDidChangeModelContent(() => {
    extraCode.value = editor.getValue()
    // Clear any existing highlights when user edits the extra code
    if (editor.hasTextFocus() && errorDecorations) errorDecorations.set([])
  })
}

function relayoutEditor() {
  if (!editor) return
  // Use rAF to ensure DOM has applied size before layout
  requestAnimationFrame(() => editor && editor.layout())
}

function setupResizeObserver() {
  if (resizeObserver) resizeObserver.disconnect()
  resizeObserver = new ResizeObserver(() => {
    relayoutEditor()
  })
  if (rootEl.value) resizeObserver.observe(rootEl.value)
  if (editorEl.value) resizeObserver.observe(editorEl.value)
  const parent = editorEl.value?.parentElement
  if (parent) resizeObserver.observe(parent)
  // Also observe the nearest aside (the resizable panel)
  const asideEl = editorEl.value?.closest('aside')
  if (asideEl) resizeObserver.observe(asideEl)
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

async function call(simulate) {
  if (!extraCode.value.trim() || !selectedExecutor.value) return
  result.value = null
  errorText.value = ''
  errorContext.value = null
  exception.value = null
  if (errorDecorations) errorDecorations.set([])
  ;(simulate ? isSimulating : isExecuting).value = true
  try {
    const res = await wallet.runDysonScript({
      scriptAddress: props.address,
      functionName: '',
      kwargs: '',
      extraCode: extraCode.value,
      simulate,
      executorAddress: selectedExecutor.value,
      grantee: isAuthz.value ? selectedGranteeAddress.value : undefined,
    })

    if (res.scriptResponse?.exception) {
      const ex = res.scriptResponse.exception
      const msg = `${ex.context}: ${ex.msg}\nLine ${ex.lineno}, column ${ex.col_offset}\nCode: ${ex.source_segment}`
      errorText.value = ex.stdout ? `${msg}\n\nOutput:\n${ex.stdout}` : msg
      errorContext.value = { simulate }
      exception.value = ex
      result.value = null
    } else if (res.scriptResponse) {
      result.value = {
        result: res.scriptResponse.result,
        stdout: res.scriptResponse.stdout,
        gasConsumed: res.scriptResponse.script_gas_consumed,
        nodesExecuted: res.scriptResponse.nodes_called,
        simulate,
        txHash: !simulate ? res.rawSendMsgsResponse?.raw?.tx_response?.txhash : null,
        blockHeight: !simulate ? res.rawSendMsgsResponse?.raw?.tx_response?.height : null,
      }
      errorText.value = ''
      errorContext.value = null
      exception.value = null
    } else if (!res.success) {
      errorText.value = res.rawSendMsgsResponse?.rawLog || 'Script execution failed'
      errorContext.value = { simulate }
      result.value = null
      exception.value = null
    }
  } catch (err) {
    errorText.value = err.message || String(err)
    errorContext.value = { simulate }
    result.value = null
    exception.value = null
  } finally {
    ;(simulate ? isSimulating : isExecuting).value = false
  }
}

const simulate = () => call(true)
const execute = () => call(false)

// Authz-aware WalletSelector filter: accept GenericAuthorization for MsgExec and ScriptExecAuthorization constraints
function msgTypeFilter(grant) {
  const auth = grant?.authorization
  if (!auth?.['@type']) return { valid: false, notes: 'No authorization' }

  // GenericAuthorization on script MsgExec
  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/dysonprotocol.script.v1.MsgExec'
    return { valid: ok, notes: ok ? 'Generic Script MsgExec' : 'Wrong msg' }
  }

  // ScriptExecAuthorization specific constraints
  if (auth['@type'] === '/dysonprotocol.script.v1.ScriptExecAuthorization') {
    // Must match this script address
    console.log('auth', auth)
    if (auth.script_address !== props.address) return { valid: false, notes: 'Different script' }

    // In this case,, script exec code does not need to match function_names
    // If function_names present, require empty or contains '' (no function) since ExtraCode runs main
    //const fns = Array.isArray(auth.function_names) ? auth.function_names : []
    // For ExtraCode we execute with empty function_name => allow if list empty or includes ''
    //const ok = fns.length === 0 || fns.includes('')
    const ok = true
    return {
      valid: ok,
      notes: ok
        ? `ScriptExecAuthorization ${auth.script_address}: [${auth.function_names?.join(', ')}]`
        : 'Function not permitted',
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

function highlightError(ex) {
  if (!editor || !ex) return
  const endLineno = Number(ex.end_lineno || Number(ex.lineno || 1))
  if (!isCollapsed.value) isCollapsedStore.value = true
  const startLine = Number(ex._adjustedStartLine || 1)
  const startCol = Number(ex.col_offset ?? 0) + 1
  const endLine = Number(ex._adjustedEndLine || endLineno)
  const endCol = Number(ex.end_col_offset ?? Number(ex.col_offset ?? 0) + 1) + 1
  const range = new monaco.Range(startLine, startCol, endLine, endCol)
  if (!errorDecorations) errorDecorations = editor.createDecorationsCollection()
  errorDecorations.set([
    {
      range,
      options: {
        inlineClassName: 'monaco-error-inline',
        className: 'monaco-error-line',
        isWholeLine: true,
        linesDecorationsClassName: 'myLineDecoration',
      },
    },
  ])
  editor.revealRangeInCenter(range)
  editor.setPosition({ lineNumber: startLine, column: startCol })
}

const { goToException: goTo } = useGoToException()

function goToException() {
  const ex = exception.value
  if (!ex) return
  goTo({
    exception: ex,
    baseLineCount: scriptLineCount.value,
    emitFocus: () => emit('focus-code'),
    highlightLocal: (e, baseLines) => {
      // decorate the exception with adjusted line numbers for local editor
      const adjusted = {
        ...e,
        _adjustedStartLine: Math.max(1, Number(e.lineno || 1) - Number(baseLines || 0)),
        _adjustedEndLine: Math.max(
          1,
          Number(e.end_lineno || Number(e.lineno || 1)) - Number(baseLines || 0)
        ),
      }
      highlightError(adjusted)
    },
  })
}

// Watches
watch(
  () => props.address,
  (addr) => {
    extraCode.value = extraCodeStorage.value[addr] || ''
    selectedExecutor.value = extraExecutors.value[addr] || ''
    if (!selectedExecutor.value) selectedExecutor.value = props.address
  },
  { immediate: true }
)

watch(extraCode, (v) => {
  extraCodeStorage.value[props.address] = v
  if (editor && editor.getValue() !== v) editor.setValue(v)
})

watch(selectedExecutor, (v) => {
  extraExecutors.value[props.address] = v
})

watch(scriptLineCount, () => {
  if (editor) editor.updateOptions({ lineNumbers: (ln) => ln + scriptLineCount.value })
})

// Force layout when the sidebar width changes (including shrink)
watch(sidebarWidth, () => relayoutEditor())

// Force layout when collapsing/expanding
watch(isCollapsed, async () => {
  await nextTick()
  relayoutEditor()
})

onMounted(async () => {
  await nextTick()
  initEditor()
  setupResizeObserver()
  window.addEventListener('resize', relayoutEditor)
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
    editor = null
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  window.removeEventListener('resize', relayoutEditor)
})
</script>

<style scoped>
:deep(.monaco-error-inline) {
  background-color: rgba(244, 63, 94, 0.12);
  outline: 1px solid rgba(244, 63, 94, 0.5);
  cursor: pointer;
}

:deep(.monaco-error-line) {
  background-color: rgba(244, 63, 94, 0.12);
}

:deep(.myLineDecoration) {
  border-left: 3px solid rgba(244, 63, 94, 0.8);
}

/* Ensure DaisyUI collapse/content containers don't enforce min-content width */
:deep(.collapse),
:deep(.collapse-content),
:deep(.form-control) {
  min-width: 0;
  overflow-x: hidden;
}

/* Ensure editor does not overflow when parent shrinks */
:deep([ref='editorEl']) {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
</style>
