<template>
  <div class="script-navigation">
    <div class="divide-y divide-gray-200">
      <!-- Executor selector moved to top -->
      <div class="bg-base-100 p-3">
        <div class="text-xs opacity-70 mb-1">Executor</div>
        <WalletSelector
          v-model="selectedExecutor"
          :show-locked="true"
          :default-address="props.address"
        />
        <div v-if="!selectedExecutor" class="text-xs text-error mt-1">
          Select the script address wallet to execute
        </div>
      </div>

      <!-- Extra Code Section (shown only when executor is the script address) -->
      <div v-show="canEditExtra" class="collapse bg-base-100">
        <input
          type="checkbox"
          :checked="isExtraCodeCollapsed"
          @change="toggleExtraCodeCollapse"
        />
        <div class="collapse-title font-semibold">Extra Code</div>
        <div class="collapse-content">
          <div class="form-control">
            <div
              ref="extraCodeEditorEl"
              class="h-24 border border-base-300"
            ></div>
            <div class="text-xs opacity-60 wrap-anywhere">
              This code will be temporarily appended to the script before
              calling the function
            </div>

            <!-- Extra Code Error Display -->
            <div v-if="extraCodeError" class="mt-4 break-all">
              <div class="alert alert-error text-base-content alert-outline">
                <div class="text-sm">
                  <div class="font-medium">
                    {{
                      extraCodeErrorContext?.simulate
                        ? "Simulation Failed"
                        : "Execution Failed"
                    }}
                  </div>
                </div>
              </div>
              <div class="mt-2">
                <div class="font-medium text-xs opacity-80">Error:</div>
                <pre
                  class="text-xs bg-base-200 p-2 mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words"
                  >{{ extraCodeError }}</pre
                >
                <div v-if="extraCodeException" class="mt-2 text-xs">
                  <button
                    class="link link-error"
                    @click="highlightExtraCode(extraCodeException)"
                  >
                    Go to line {{ extraCodeException.lineno }}:{{
                      extraCodeException.col_offset
                    }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Extra Code Success Result Display -->
            <div v-if="extraCodeResult" class="mt-4 break-all">
              <div class="alert alert-success text-base-content alert-outline">
                <div class="text-sm">
                  <div class="font-medium">
                    {{ extraCodeResult.simulate ? "Simulation" : "Execution" }}
                    Successful
                  </div>
                </div>
              </div>
              <div>
                <!-- Result Value -->
                <div v-if="extraCodeResult.result !== null" class="mt-2">
                  <div class="font-medium text-xs opacity-80">Result:</div>
                  <pre
                    class="text-xs bg-base-200 p-2 mt-1 max-h-32 overflow-auto"
                    >{{ formatResult(extraCodeResult.result) }}</pre
                  >
                </div>

                <!-- Stdout -->
                <div v-if="extraCodeResult.stdout" class="mt-2">
                  <div class="font-medium text-xs opacity-80">Output:</div>
                  <pre
                    class="text-xs bg-base-200 p-2 mt-1 max-h-32 overflow-auto"
                    >{{ extraCodeResult.stdout }}</pre
                  >
                </div>

                <!-- Performance Stats -->
                <div class="mt-2 text-xs opacity-80 flex gap-4">
                  <span
                    >Gas: {{ formatNumber(extraCodeResult.gasConsumed) }}</span
                  >
                  <span
                    >Nodes:
                    {{ formatNumber(extraCodeResult.nodesExecuted) }}</span
                  >
                </div>

                <!-- Transaction Info (for actual transactions) -->
                <div
                  v-if="!extraCodeResult.simulate && extraCodeResult.txHash"
                  class="mt-2"
                >
                  <div class="font-medium text-xs opacity-80">Transaction:</div>
                  <div class="text-xs bg-base-200 p-2 mt-1">
                    <div>
                      Hash:
                      <TxHashDisplay
                        :hash="extraCodeResult.txHash"
                        :truncate="8"
                      />
                    </div>
                    <div v-if="extraCodeResult.blockHeight">
                      Block: {{ extraCodeResult.blockHeight }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="mt-4 flex justify-end gap-2">
              <button
                @click="simulateExtraCode"
                class="btn btn-sm btn-accent"
                :disabled="
                  isSimulatingExtraCode ||
                  !extraCode.trim() ||
                  !selectedExecutor
                "
              >
                {{ isSimulatingExtraCode ? "Simulating..." : "Simulate" }}
              </button>
              <button
                @click="executeExtraCode"
                class="btn btn-sm btn-primary"
                :disabled="
                  isExecutingExtraCode || !extraCode.trim() || !selectedExecutor
                "
              >
                {{ isExecutingExtraCode ? "Sending..." : "Tx" }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- No Functions Message -->
      <div v-if="functions.length === 0" class="text-center py-8 text-gray-500">
        <div class="text-sm">No functions found</div>
        <div class="text-xs mt-1">Add function definitions to your script</div>
      </div>

      <div
        v-for="func in functions"
        :key="func.function_name"
        class="collapse bg-base-100"
      >
        <input
          type="checkbox"
          :checked="isCollapsed(func.function_name)"
          @change="toggleCollapse(func.function_name)"
        />
        <div class="collapse-title font-semibold">{{ func.function_name }}</div>
        <div class="collapse-content">
          <!-- Function Docstring -->
          <div v-if="func.docstring" class="mb-4 p-3 bg-base-200 -md">
            <div class="text-sm whitespace-pre-wrap">{{ func.docstring }}</div>
          </div>

          <!-- Parameters Section -->
          <div v-if="hasParameters(func)">
            <label class="block text-sm font-medium mb-2">Parameters:</label>
            <textarea
              v-model="kwargsInputs[func.function_name]"
              ref="textareas"
              class="textarea textarea-bordered w-full text-sm font-mono resize-none"
              :placeholder="getKwargsPlaceholder(func)"
              @input="autoResize($event)"
            ></textarea>
            <div
              v-if="jsonErrors[func.function_name]"
              class="text-error text-xs mt-1"
            >
              {{ jsonErrors[func.function_name] }}
            </div>
          </div>
          <div v-else class="text-center py-4 text-base-content/60 text-sm">
            {{ getNoParametersMessage(func) }}
          </div>

          <!-- Error Display -->
          <div
            v-if="executionErrors[func.function_name]"
            class="mt-4 break-all"
          >
            <div class="alert alert-error text-base-content alert-outline">
              <div class="text-sm">
                <div class="font-medium">
                  {{ getErrorHeaderText(func.function_name) }}
                </div>
              </div>
            </div>
            <div>
              <div>
                <!-- Error Details -->
                <div class="mt-2">
                  <div class="font-medium text-xs opacity-80">Error:</div>
                  <pre
                    class="text-xs bg-base-200 p-2 mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words"
                    >{{ executionErrors[func.function_name] }}</pre
                  >
                  <div
                    v-if="executionException[func.function_name]"
                    class="mt-2 text-xs"
                  >
                    <button
                      class="link link-error"
                      @click="
                        goToScriptException(
                          executionException[func.function_name]
                        )
                      "
                    >
                      Go to line
                      {{ executionException[func.function_name].lineno }}:{{
                        executionException[func.function_name].col_offset
                      }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Success Result Display -->
          <div
            v-if="executionResults[func.function_name]"
            class="mt-4 break-all"
          >
            <div class="alert alert-success text-base-content alert-outline">
              <div class="text-sm">
                <div class="font-medium">
                  {{
                    executionResults[func.function_name].simulate
                      ? "Simulation"
                      : "Execution"
                  }}
                  Successful
                </div>
              </div>
            </div>
            <div>
              <div>
                <!-- Result Value -->
                <div
                  v-if="executionResults[func.function_name].result !== null"
                  class="mt-2"
                >
                  <div class="font-medium text-xs opacity-80">Result:</div>
                  <pre
                    class="text-xs bg-base-200 p-2 mt-1 max-h-32 overflow-auto"
                    >{{
                      formatResult(executionResults[func.function_name].result)
                    }}</pre
                  >
                </div>

                <!-- Stdout -->
                <div
                  v-if="executionResults[func.function_name].stdout"
                  class="mt-2"
                >
                  <div class="font-medium text-xs opacity-80">Output:</div>
                  <pre
                    class="text-xs bg-base-200 p-2 mt-1 max-h-32 overflow-auto"
                    >{{ executionResults[func.function_name].stdout }}</pre
                  >
                </div>

                <!-- Performance Stats -->
                <div class="mt-2 text-xs opacity-80 flex gap-4">
                  <span
                    >Gas:
                    {{
                      formatNumber(
                        executionResults[func.function_name].gasConsumed
                      )
                    }}</span
                  >
                  <span
                    >Nodes:
                    {{
                      formatNumber(
                        executionResults[func.function_name].nodesExecuted
                      )
                    }}</span
                  >
                </div>

                <!-- Transaction Info (for actual transactions) -->
                <div
                  v-if="
                    !executionResults[func.function_name].simulate &&
                    executionResults[func.function_name].txHash
                  "
                  class="mt-2"
                >
                  <div class="font-medium text-xs opacity-80">Transaction:</div>
                  <div class="text-xs bg-base-200 p-2 mt-1">
                    <div>
                      Hash:
                      <TxHashDisplay
                        :hash="executionResults[func.function_name].txHash"
                        :truncate="8"
                      />
                    </div>
                    <div
                      v-if="executionResults[func.function_name].blockHeight"
                    >
                      Block:
                      {{ executionResults[func.function_name].blockHeight }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="mt-4 flex justify-end gap-2">
            <button
              @click="simulateFunction(func)"
              class="btn btn-sm btn-accent"
              :disabled="
                isSimulating[func.function_name] ||
                hasJsonError(func.function_name)
              "
            >
              {{
                isSimulating[func.function_name] ? "Simulating..." : "Simulate"
              }}
            </button>
            <button
              @click="executeFunction(func)"
              class="btn btn-sm btn-primary"
              :disabled="
                isExecuting[func.function_name] ||
                hasJsonError(func.function_name)
              "
            >
              {{ isExecuting[func.function_name] ? "Sending..." : "Tx" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStorage } from "@vueuse/core";
import { useWallet } from "@/composables/useWallet";
import { useTheme } from "@/composables/useTheme";
import WalletSelector from "@/components/shared/WalletSelector.vue";
import * as monaco from "monaco-editor";
import TxHashDisplay from "@/components/TxHashDisplay.vue";

const props = defineProps({
  address: {
    type: String,
    required: true,
  },
  functions: {
    type: Array,
    default: () => [],
  },
  script: {
    type: Object,
    default: null,
  },
  currentScriptContent: {
    type: String,
    default: "",
  },
  executionErrors: {
    type: Object,
    default: () => ({}),
  },
  executionResults: {
    type: Object,
    default: () => ({}),
  },
  executionErrorContext: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["function-executed", "focus-code"]);
const wallet = useWallet();
const { theme } = useTheme();

// State for extra code with persistence - using reactive storage
const extraCode = ref("");
const extraCodeStorage = useStorage("script-extra-codes", {});
const extraCodeEditorEl = ref();

// Extra Code executor selection - non-persistent, defaults to script address
const selectedExecutor = ref(props.address);
const canEditExtra = computed(
  () => !!selectedExecutor.value && selectedExecutor.value === props.address
);

const editorTheme = computed(() => (theme.value === "dark" ? "vs-dark" : "vs"));

// Calculate line offset for extra code editor
const scriptLineCount = computed(() => {
  const content = props.currentScriptContent || props.script?.code || "";
  if (!content) return 0;
  return content.split("\n").length;
});

const route = useRoute();
const router = useRouter();

// Persistent storage for function states and inputs
const functionOpenStates = useStorage("script-function-open-states", {});
const isExtraCodeCollapsed = useStorage("script-extra-code-collapsed", false);
const functionParameterInputs = useStorage("script-function-parameters", {});

// State for each function's kwargs input, errors, and execution status
const kwargsInputs = ref({});
const jsonErrors = ref({});
const isExecuting = ref({});
const isSimulating = ref({});
const textareas = ref([]);

// Extra code execution state
const isExecutingExtraCode = ref(false);
const isSimulatingExtraCode = ref(false);
const extraCodeResult = ref(null);
const extraCodeError = ref("");
const extraCodeErrorContext = ref(null);
const extraCodeException = ref(null);

let extraCodeEditor = null;
let extraErrorDecorations = null;

// Helper to create storage key
function getStorageKey(functionName) {
  return `${props.address}_${functionName}`;
}

// Initialize state when functions change
watch(
  () => props.functions,
  (newFunctions) => {
    newFunctions.forEach((func) => {
      const storageKey = getStorageKey(func.function_name);

      // Initialize kwargs inputs from persistent storage or default
      if (!kwargsInputs.value[func.function_name]) {
        kwargsInputs.value[func.function_name] =
          functionParameterInputs.value[storageKey] ||
          getKwargsPlaceholder(func);
      }

      if (!jsonErrors.value[func.function_name]) {
        jsonErrors.value[func.function_name] = "";
      }
      if (!isExecuting.value[func.function_name]) {
        isExecuting.value[func.function_name] = false;
      }
      if (!isSimulating.value[func.function_name]) {
        isSimulating.value[func.function_name] = false;
      }
    });

    // Auto-resize all textareas after functions are loaded
    nextTick(() => {
      textareas.value?.forEach((textarea) => {
        if (textarea) autoResize({ target: textarea });
      });
    });
  },
  { immediate: true }
);

// Watch for changes in kwargs inputs to validate JSON and persist to storage
watch(
  kwargsInputs,
  (newInputs) => {
    Object.keys(newInputs).forEach((funcName) => {
      const storageKey = getStorageKey(funcName);

      // Persist parameter changes
      functionParameterInputs.value[storageKey] = newInputs[funcName];

      // Validate JSON
      try {
        JSON.parse(newInputs[funcName] || "{}");
        jsonErrors.value[funcName] = "";
      } catch (e) {
        jsonErrors.value[funcName] = "Invalid JSON format";
      }
    });
  },
  { deep: true }
);

// Methods
function isCollapsed(functionName) {
  const storageKey = getStorageKey(functionName);
  return functionOpenStates.value[storageKey] ?? false;
}

function toggleCollapse(functionName) {
  const storageKey = getStorageKey(functionName);
  functionOpenStates.value[storageKey] = !functionOpenStates.value[storageKey];
}

function toggleExtraCodeCollapse() {
  isExtraCodeCollapsed.value = !isExtraCodeCollapsed.value;
}

// Keep executor default in sync with the current script address
watch(
  () => props.address,
  (addr) => {
    selectedExecutor.value = addr;
  }
);

function getErrorHeaderText(functionName) {
  const context = props.executionErrorContext[functionName];
  if (context?.simulate) {
    return "Simulation Failed";
  }
  return "Execution Failed";
}

// Track per-function exception details for navigation
const executionException = computed(() => {
  const ctx = props.executionErrorContext || {};
  const out = {};
  Object.keys(ctx).forEach((fn) => {
    const ex = ctx[fn]?.exception;
    if (ex) out[fn] = ex;
  });
  return out;
});

function goToScriptException(ex) {
  if (!ex) return;
  // Ensure code tab is visible on small devices
  emit("focus-code");
  const q = {
    ...route.query,
    // Single deep-link param only; no backward compatibility
    ex: encodeURIComponent(
      JSON.stringify({
        lineno: ex.lineno,
        col: ex.col,
        end_col_offset: ex.end_col_offset,
        end_lineno: ex.end_lineno,
      })
    ),
  };
  // Replace; we don't keep history of highlights
  router.replace({ query: q });
}

function hasParameters(func) {
  return func.parameters && func.parameters.length > 0;
}

function getNoParametersMessage(func) {
  if (func.kwargs === null) {
    return "This function has no parameters";
  }
  return "This function takes optional parameters only";
}

function getKwargsPlaceholder(func) {
  // Show form defaults instead of skeleton for better UX
  const parameters = func.parameters;
  if (!parameters || parameters.length === 0) {
    return "{}";
  }

  const formData = {};
  for (const param of parameters) {
    if (param.required) {
      formData[param.name] = null;
    } else {
      formData[param.name] = param.default;
    }
  }

  return JSON.stringify(formData, null, 2);
}

function hasJsonError(funcName) {
  return jsonErrors.value[funcName] !== "";
}

function autoResize(event) {
  const textarea = event.target;
  if (!textarea) return;

  // Reset height to auto to get the scroll height
  textarea.style.height = "auto";

  // Calculate the content height
  const lineHeight =
    parseInt(window.getComputedStyle(textarea).lineHeight) || 20;
  const padding =
    parseInt(window.getComputedStyle(textarea).paddingTop) +
    parseInt(window.getComputedStyle(textarea).paddingBottom);
  const minHeight = lineHeight * 3 + padding; // Minimum 3 lines
  const maxHeight = lineHeight * 10 + padding; // Maximum 10 lines

  // Set height based on content, with min/max limits
  const newHeight = Math.max(
    minHeight,
    Math.min(maxHeight, textarea.scrollHeight)
  );
  textarea.style.height = `${newHeight}px`;
}

// Generic wrapper around wallet.runDysonScript
async function runDysonRequest({
  fnName = "",
  kwargsString = "",
  simulate = false,
  setLoading,
  onSuccess,
  onError,
}) {
  setLoading(true);

  try {
    const res = await wallet.runDysonScript({
      scriptAddress: props.address,
      functionName: fnName,
      kwargs: kwargsString,
      extraCode: canEditExtra.value ? extraCode.value : "",
      simulate,
      executorAddress: selectedExecutor.value,
    });
    onSuccess(res);
  } catch (err) {
    console.error(
      `Dyson ${simulate ? "simulation" : "execution"} failed:`,
      err
    );
    onError(err);
  } finally {
    setLoading(false);
  }
}

// Function calls
function callFunction(func, simulate = false) {
  const fn = func.function_name;
  if (hasJsonError(fn)) return;
  // Clear existing editor highlight before new run
  const { hl_l, hl_c, hl_el, hl_ec, ...rest } = route.query;
  if (hl_l || hl_c || hl_el || hl_ec) router.replace({ query: { ...rest } });
  // Also remove encoded exception param if present
  const { ex, ...rest2 } = route.query;
  if (ex) router.replace({ query: { ...rest2 } });

  runDysonRequest({
    fnName: fn,
    kwargsString: kwargsInputs.value[fn] || "{}",
    simulate,
    setLoading: (v) => ((simulate ? isSimulating : isExecuting).value[fn] = v),
    onSuccess: (res) =>
      emit("function-executed", {
        func,
        kwargs: JSON.parse(kwargsInputs.value[fn] || "{}"),
        res,
        simulate,
      }),
    onError: (err) =>
      emit("function-executed", {
        func,
        error: err.message || err,
        simulate,
      }),
  });
}

const simulateFunction = (func) => callFunction(func, true);
const executeFunction = (func) => callFunction(func, false);

function formatResult(result) {
  if (typeof result === "string") {
    return result;
  }
  return JSON.stringify(result, null, 2);
}

function formatNumber(num) {
  if (num == null || num === undefined) {
    return "0";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString();
}

// Extra code calls
function callExtra(simulate = false) {
  if (!extraCode.value.trim()) return;

  // Clear previous results/errors
  extraCodeResult.value = null;
  extraCodeError.value = "";
  extraCodeErrorContext.value = null;
  // Clear extra code editor decorations
  if (extraErrorDecorations) extraErrorDecorations.set([]);

  runDysonRequest({
    simulate,
    setLoading: (v) =>
      ((simulate ? isSimulatingExtraCode : isExecutingExtraCode).value = v),
    onSuccess: (res) => {
      // Handle the response structure like the parent component does
      if (res.scriptResponse?.exception) {
        const exception = res.scriptResponse.exception;
        const errorMsg = `${exception.context}: ${exception.msg}\nLine ${exception.lineno}, column ${exception.col_offset}\nCode: ${exception.source_segment}`;
        extraCodeError.value = exception.stdout
          ? `${errorMsg}\n\nOutput:\n${exception.stdout}`
          : errorMsg;
        extraCodeErrorContext.value = { simulate };
        extraCodeException.value = exception;
        extraCodeResult.value = null;
      } else if (res.scriptResponse) {
        // Success case - structure like function results
        extraCodeResult.value = {
          result: res.scriptResponse.result,
          stdout: res.scriptResponse.stdout,
          gasConsumed: res.scriptResponse.script_gas_consumed,
          nodesExecuted: res.scriptResponse.nodes_called,
          simulate,
          txHash: res.transactionResponse?.txhash,
          blockHeight: res.transactionResponse?.height,
        };
        extraCodeError.value = "";
        extraCodeErrorContext.value = null;
        extraCodeException.value = null;
      }
    },
    onError: (err) => {
      extraCodeError.value = err.message || err;
      extraCodeErrorContext.value = { simulate };
      extraCodeResult.value = null;
      extraCodeException.value = null;
    },
  });
}

const simulateExtraCode = () => callExtra(true);
const executeExtraCode = () => callExtra(false);

// Extra code editor management
function initExtraCodeEditor() {
  if (!extraCodeEditorEl.value || !canEditExtra.value) return;

  // Clear the DOM element before creating new editor
  extraCodeEditorEl.value.innerHTML = "";

  extraCodeEditor = monaco.editor.create(extraCodeEditorEl.value, {
    value: extraCode.value,
    language: "python",
    theme: editorTheme.value,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: "on",
    fontSize: 12,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    lineNumbers: (v) => v + scriptLineCount.value,
    folding: false,
    lineDecorationsWidth: 30,
    lineNumbersMinChars: 3,
    glyphMargin: false,
  });

  extraCodeEditor.onDidChangeModelContent(() => {
    extraCode.value = extraCodeEditor.getValue();
  });
}

function highlightExtraCode(ex) {
  if (!extraCodeEditor || !ex) return;
  // Ensure the extra code section is expanded/visible
  if (!isExtraCodeCollapsed.value) isExtraCodeCollapsed.value = true;
  const startLine = Number(ex.lineno || 1);
  // +1 because Monaco expects 1-based columns; backend col_offset is 0-based
  const startCol = Number(ex.col_offset ?? 0) + 1;
  const endLine = Number(ex.end_lineno || startLine);
  const endCol =
    Number(ex.end_col_offset ?? Number(ex.col_offset ?? 0) + 1) + 1;

  const range = new monaco.Range(startLine, startCol, endLine, endCol);
  if (!extraErrorDecorations)
    extraErrorDecorations = extraCodeEditor.createDecorationsCollection();
  extraErrorDecorations.set([
    {
      range,
      options: {
        inlineClassName: "monaco-error-inline",
        className: "monaco-error-line",
        isWholeLine: true,
        linesDecorationsClassName: "myLineDecoration",
      },
    },
  ]);
  extraCodeEditor.revealRangeInCenter(range);
  extraCodeEditor.setPosition({ lineNumber: startLine, column: startCol });
}

// Lifecycle
onMounted(async () => {
  await nextTick();
  initExtraCodeEditor();
});

onUnmounted(() => {
  if (extraCodeEditor) {
    extraCodeEditor.dispose();
    extraCodeEditor = null;
  }
});

// Watch for theme changes
watch(editorTheme, (theme) => {
  if (extraCodeEditor) {
    monaco.editor.setTheme(theme);
  }
});

// Watch for edit permission changes
watch(canEditExtra, (newCanEdit) => {
  if (newCanEdit && !extraCodeEditor && extraCodeEditorEl.value) {
    nextTick(() => {
      // Ensure extraCode is loaded from storage for current address
      extraCode.value = extraCodeStorage.value[props.address] || "";
      initExtraCodeEditor();
    });
  } else if (!newCanEdit && extraCodeEditor) {
    extraCodeEditor.dispose();
    extraCodeEditor = null;
  }
});

// Watch for script changes to update line number offset
watch(scriptLineCount, () => {
  if (extraCodeEditor) {
    extraCodeEditor.updateOptions({
      lineNumbers: (v) => v + scriptLineCount.value,
    });
  }
});

// Watch for address changes to load the correct extra code
watch(
  () => props.address,
  (newAddress) => {
    extraCode.value = extraCodeStorage.value[newAddress] || "";
  },
  { immediate: true }
);

// Watch for extraCode changes to persist to storage and update Monaco editor
watch(extraCode, (newValue) => {
  // Persist to storage
  extraCodeStorage.value[props.address] = newValue;

  // Update Monaco editor
  if (extraCodeEditor && extraCodeEditor.getValue() !== newValue) {
    extraCodeEditor.setValue(newValue);
  }
});
</script>

<style scoped>
.script-navigation > * + * {
  margin-top: 1rem;
}

.script-navigation .collapse {
  border-radius: 0;
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
