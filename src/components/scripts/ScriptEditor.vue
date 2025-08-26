<template>
  <div class="script-editor flex flex-col h-full">
    <div class="flex justify-between items-center p-4">
      <div class="flex gap-2 items-center">
        <div class="join">
          <button
            v-if="canEdit"
            @click="save"
            class="btn btn-primary join-item"
            :disabled="store.isLoading || !hasChanges"
          >
            <span v-if="store.isLoading" class="loading loading-spinner loading-xs mr-1"></span>
            {{ store.isLoading ? 'Saving...' : 'Save' }}
          </button>

          <!-- Wallet selector limited to this script address -->
          <WalletSelector
            v-model="selectedEditorExecutor"
            :allowed-addresses="[props.address]"
            :default-address="props.address"
            :button-class="'join-item'"
            :msg-type-filter="editorMsgTypeFilter"
            @update:executor-address="onEditorExecutor"
            @update:grantee-address="onEditorGrantee"
            @update:is-authz="onEditorIsAuthz"
            @update:authz-notes="onEditorAuthzNotes"
            @update:selected-grant="onEditorSelectedGrant"
          />
        </div>

        <div v-if="errorMessage" class="text-error text-sm ml-2">
          {{ errorMessage }}
          <button @click="clearError" class="btn btn-xs btn-ghost ml-1">✕</button>
        </div>
        <div v-if="showSuccess" class="text-success text-sm ml-2">
          Script saved!
          <button @click="clearSuccessMessage" class="btn btn-xs btn-ghost ml-1">✕</button>
        </div>
      </div>
      <div v-if="script" class="text-sm text-base-content/60 flex items-center gap-2">
        <div>Version: {{ script.version }}</div>
      </div>
    </div>
    <div class="editor-wrapper flex-1 flex flex-col border">
      <div ref="editorEl" class="monaco-editor-container flex-1"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useScriptsStore, WalletNotConnectedError, ScriptStoreError } from '@/stores/scriptsStore'
import { useWallet } from '@/composables/useWallet'
import { useTheme } from '@/composables/useTheme'
import * as monaco from 'monaco-editor'
import '../../utils/monacoSetup.js'
import { useStorage } from '@vueuse/core'
import WalletSelector from '@/components/shared/WalletSelector.vue'

const props = defineProps({
  address: { type: String, required: true },
  script: { type: Object, default: null },
})

const emit = defineEmits(['script-updated', 'content-changed'])

const store = useScriptsStore()
const wallet = useWallet()
const { theme } = useTheme()

// State
const editorEl = ref()
const currentContent = ref('')
const originalContent = ref('')
const showSuccess = ref(false)
const localError = ref('')
const selectedEditorExecutor = useStorage(() => `executor:edit:${props.address}`, props.address)

// Authz state for editor updates
const editorIsAuthz = ref(false)
const editorAuthzNotes = ref('')
const editorSelectedGrant = ref(null)
const editorExecutorAddress = ref('')
const editorGranteeAddress = ref('')

let editor = null
let errorDecorations = null
const route = useRoute()
const router = useRouter()

const defaultCode = `# Start editing to create a Python script

def hello(name="World"):
    return f"Hello, {name}!"

def add(a, b):
    return a + b
    
def wsgi(environ, start_response):
    start_response('200 OK', [('Content-Type', 'text/plain')])
    return [b'Hello, World!']
`

// Computed
const canEdit = computed(() =>
  wallet.unlockedWallets.value?.some((w) => w.address === props.address)
)

// If a script object exists, use its code even if empty (404 case). Only use
// the default template when there is no script object yet.
const source = computed(() => (props.script ? props.script.code ?? '' : defaultCode))

const hasChanges = computed(() => canEdit.value && currentContent.value !== originalContent.value)

const readOnly = computed(() => !canEdit.value || store.isLoading)

const editorTheme = computed(() => (theme.value === 'dark' ? 'vs-dark' : 'vs'))

const errorMessage = computed(() => localError.value)

// Actions
async function save() {
  if (!currentContent.value.trim()) {
    localError.value = 'Script cannot be empty'
    return
  }

  clearError()
  clearSuccessMessage()

  try {
    // Ensure there is an unlocked wallet available for this script address
    const hasWallet = wallet.unlockedWallets.value?.some((w) => w.address === props.address)
    if (!hasWallet) {
      throw new ScriptStoreError('Unlock the wallet that controls this script address to save')
    }

    // Save the script using the new unified method
    await store.saveScript(props.address, currentContent.value, {
      // Minimal wallet facade to override executor for sendMsg
      ...wallet,
      sendMsg: (params) =>
        wallet.sendMsg({
          ...params,
          executorAddress: selectedEditorExecutor.value,
          grantee: editorIsAuthz.value ? editorGranteeAddress.value : undefined,
        }),
    })

    // Update local state on success
    originalContent.value = currentContent.value
    showSuccessMessage()

    // Emit the updated script
    const updatedScript = store.getScriptByAddress(props.address)
    if (updatedScript) {
      emit('script-updated', updatedScript)
    }
  } catch (error) {
    if (error instanceof WalletNotConnectedError) {
      localError.value = 'Please connect your wallet to save the script'
    } else if (error instanceof ScriptStoreError) {
      localError.value = error.message
    } else {
      localError.value = `Save failed: ${error.message}`
    }
  }
}

function clearError() {
  localError.value = ''
}

function showSuccessMessage() {
  showSuccess.value = true
}

function clearSuccessMessage() {
  showSuccess.value = false
}

// WalletSelector msgTypeFilter for updating a script
function editorMsgTypeFilter(grant) {
  const auth = grant?.authorization
  if (!auth?.['@type']) return { valid: false, notes: 'No authorization' }
  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/dysonprotocol.script.v1.MsgUpdateScript'
    return { valid: ok, notes: ok ? 'Generic MsgUpdateScript' : 'Wrong msg type' }
  }
  return { valid: false, notes: 'Unsupported authz type' }
}

function onEditorExecutor(addr) {
  editorExecutorAddress.value = addr || ''
}
function onEditorGrantee(addr) {
  editorGranteeAddress.value = addr || ''
}
function onEditorIsAuthz(v) {
  editorIsAuthz.value = !!v
}
function onEditorAuthzNotes(n) {
  editorAuthzNotes.value = n || ''
}
function onEditorSelectedGrant(g) {
  editorSelectedGrant.value = g || null
}

function restore() {
  // Reset editor to last saved content
  const saved = props.script?.code ?? ''
  updateEditorContent(saved)
  originalContent.value = saved
}

// Editor management
function initEditor() {
  if (!editorEl.value) return

  editor = monaco.editor.create(editorEl.value, {
    value: source.value,
    language: 'python',
    theme: editorTheme.value,
    readOnly: readOnly.value,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'on',
    fontSize: 14,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
  })

  editor.onDidChangeModelContent(() => {
    currentContent.value = editor.getValue()
    clearSuccessMessage()
    emit('content-changed', currentContent.value)
    // Clear any existing highlights when user edits the code
    if (editor.hasTextFocus()) clearEditorHighlight()
  })

  currentContent.value = editor.getValue()
  // Apply any existing highlight from route after editor is ready
  applyRouteHighlight()
}

function updateEditorContent(newContent) {
  if (editor && editor.getValue() !== newContent) {
    editor.setValue(newContent)
    currentContent.value = newContent
    emit('content-changed', currentContent.value)
  }
}

function applyRouteHighlight() {
  if (!editor) return
  const q = route.query
  // Only support encoded exception deep-link
  if (!q.ex) {
    if (errorDecorations) errorDecorations.set([])
    return
  }
  try {
    const ex = JSON.parse(decodeURIComponent(String(q.ex)))
    const line = Number(ex.lineno || 0)
    const startColRaw = Number(ex.col_offset ?? 0)
    const endLine = Number(ex.end_lineno || line)
    const endColRaw = Number(ex.end_col_offset ?? startColRaw + 1)
    return highlightRange(line, startColRaw, endLine, endColRaw)
  } catch {
    if (errorDecorations) errorDecorations.set([])
  }
}

function highlightRange(line, startColRaw, endLine, endColRaw) {
  if (!editor) return
  const col = Math.max(1, Number(startColRaw ?? 0) + 1)
  const endCol = Math.max(1, Number(endColRaw ?? Number(startColRaw ?? 0) + 1) + 1)
  if (!line || line < 1) return
  const model = editor.getModel()
  if (!model) return
  const maxLine = model.getLineCount()
  const safeLine = Math.min(Number(line), maxLine)
  const safeEndLine = Math.min(Number(endLine || line), maxLine)
  const range = new monaco.Range(safeLine, col, safeEndLine, endCol)
  if (!errorDecorations) errorDecorations = editor.createDecorationsCollection()
  errorDecorations.set([
    {
      range,
      options: {
        inlineClassName: 'monaco-error-inline',
      },
    },
    {
      range,
      options: {
        className: 'monaco-error-line',
        isWholeLine: true,
      },
    },
  ])
  editor.revealRangeInCenter(range)
  editor.setPosition({ lineNumber: safeLine, column: col })
}

// Lifecycle
onMounted(async () => {
  await nextTick()
  initEditor()
  if (props.script?.code) {
    originalContent.value = props.script.code
  }
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
    editor = null
  }
  clearSuccessMessage()
})

function clearEditorHighlight() {
  if (errorDecorations) errorDecorations.set([])
  const { ex, ...rest } = route.query
  if (ex) router.replace({ query: { ...rest } })
}

// Watchers
watch(
  () => props.script,
  (script) => {
    if (script?.code !== undefined) {
      originalContent.value = script.code
      updateEditorContent(source.value)
    }
  },
  { immediate: true }
)

watch(source, (newSource) => {
  updateEditorContent(newSource)
})

watch(editorTheme, (theme) => {
  if (editor) {
    monaco.editor.setTheme(theme)
  }
})

watch(readOnly, (isReadOnly) => {
  if (editor) {
    editor.updateOptions({ readOnly: isReadOnly })
  }
})

watch(
  () => route.query.ex,
  () => applyRouteHighlight(),
  { immediate: true }
)

// Expose methods to parent components
defineExpose({ restore, clearEditorHighlight })
</script>

<style scoped>
.script-editor {
  width: 100%;
}

.monaco-editor-container {
  width: 100%;
  height: 100%;
  min-height: 0;
}

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
</style>
