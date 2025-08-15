<template>
  <div class="h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
    <!-- Loading State -->
    <div
      v-if="isInitialLoading"
      class="flex justify-center items-center flex-1"
    >
      <LoadingSpinner message="Loading script..." />
    </div>

    <!-- Error State -->
    <div v-else-if="loadError" class="flex justify-center items-center flex-1">
      <div class="alert alert-error">
        <span>Failed to load script: {{ loadError }}</span>
        <button @click="loadScript" class="btn btn-sm btn-outline btn-error">
          Retry
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-1 overflow-hidden flex-col">
      <!-- Unsaved changes banner -->
      <div
        v-if="hasUnsavedChanges"
        class="alert alert-warning alert-soft rounded-none flex items-center justify-between"
      >
        <span>Unsaved changes</span>
        <button
          class="btn btn-sm btn-outline btn-warning"
          @click="restoreFromBanner"
        >
          Restore version {{ script?.version }}
        </button>
      </div>

      <div class="flex-1 flex overflow-hidden">
        <!-- Desktop: Draggable split view -->
        <div class="hidden lg:flex flex-1 overflow-hidden">
          <!-- Functions Panel: Resizable sidebar -->
          <aside
            :style="{ width: `${sidebarWidth}px` }"
            class="shrink-0 bg-base-100 overflow-y-scroll"
          >
            <ScriptNavigationV2
              :address="address"
              :functions="functions"
              :script="script"
              :current-script-content="currentScriptContent"
              :has-unsaved-changes="hasUnsavedChanges"
              @function-executed="onFunctionExecuted"
              @focus-code="focusCodeTab"
              :execution-errors="executionErrors"
              :execution-results="executionResults"
              :execution-error-context="executionErrorContext"
            />
          </aside>

          <!-- Draggable Divider -->
          <div
            class="w-2 bg-base-300 hover:bg-primary cursor-col-resize transition-colors"
            @mousedown="startDrag"
            @touchstart="startDrag"
          ></div>

          <!-- Code Panel: Main area -->
          <main class="flex flex-col flex-1 overflow-hidden">
            <ScriptEditor
              :address="address"
              :script="script"
              @script-updated="onScriptUpdated"
              @content-changed="onContentChanged"
              ref="desktopEditorRef"
            />
          </main>
        </div>

        <!-- Mobile: Tabs -->
        <div class="flex lg:hidden flex-1 overflow-hidden flex-col">
          <div class="tabs tabs-bordered w-full">
            <a
              class="tab tab-bordered"
              :class="{ 'tab-active': activeTab === 'functions' }"
              @click="activeTab = 'functions'"
            >
              Functions
            </a>
            <a
              class="tab tab-bordered"
              :class="{ 'tab-active': activeTab === 'code' }"
              @click="activeTab = 'code'"
            >
              Code
            </a>
          </div>

          <div class="flex-1 overflow-hidden">
            <div
              v-show="activeTab === 'functions'"
              class="h-full overflow-y-auto bg-base-100"
            >
              <ScriptNavigationV2
                :address="address"
                :functions="functions"
                :script="script"
                :current-script-content="currentScriptContent"
                :has-unsaved-changes="hasUnsavedChanges"
                @function-executed="onFunctionExecuted"
                @focus-code="focusCodeTab"
                :execution-errors="executionErrors"
                :execution-results="executionResults"
                :execution-error-context="executionErrorContext"
              />
            </div>
            <div v-show="activeTab === 'code'" class="h-full overflow-hidden">
              <ScriptEditor
                :address="address"
                :script="script"
                @script-updated="onScriptUpdated"
                @content-changed="onContentChanged"
                ref="mobileEditorRef"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useScriptsStore } from "@/stores/scriptsStore";
import { useStorage } from "@vueuse/core";

// Components
import LoadingSpinner from "@/components/shared/LoadingSpinner.vue";
import ScriptEditor from "@/components/scripts/ScriptEditor.vue";

import ScriptNavigationV2 from "@/components/scripts/ScriptNavigationV2.vue";

const route = useRoute();
const scriptsStore = useScriptsStore();

// State
const script = ref(null);
const currentScriptContent = ref(""); // Track live editor content
const loadError = ref("");
const isInitialLoading = ref(true);
const executionErrors = ref({});
const executionResults = ref({});
const executionErrorContext = ref({}); // Track whether error was from simulation or execution
// Mobile tabs state
const activeTab = useStorage("script-mobile-tab", "functions");
const desktopEditorRef = ref(null);
const mobileEditorRef = ref(null);

// Draggable sidebar state
const sidebarWidth = useStorage("script-sidebar-width", 320);
const isDragging = ref(false);
const lastTouchX = ref(null);

// Computed
const address = computed(
  () => route.meta?.resolvedAddress || route.params.address
);
const isLoading = computed(() => scriptsStore.isLoading);
const functions = computed(() => script.value?.functions || []);
const hasUnsavedChanges = computed(
  () =>
    !!script.value && currentScriptContent.value !== (script.value.code || "")
);

// Methods
async function loadScript() {
  if (!address.value) return;

  loadError.value = "";
  executionErrors.value = {};
  executionResults.value = {};
  executionErrorContext.value = {};

  try {
    const scriptData = await scriptsStore.fetchScript(address.value);
    script.value = scriptData;
    currentScriptContent.value = scriptData?.code || "";
  } catch (error) {
    console.error("Failed to load script:", error);
    loadError.value = error.message || "Unknown error occurred";
  } finally {
    isInitialLoading.value = false;
  }
}

function onScriptUpdated(updatedScript) {
  script.value = updatedScript;
  currentScriptContent.value = updatedScript?.code || "";
}

function onContentChanged(content) {
  currentScriptContent.value = content;
}

function focusCodeTab() {
  activeTab.value = "code";
}

// Clear highlight when saving the script
watch(
  () => script.value?.code,
  () => {
    desktopEditorRef.value?.clearEditorHighlight?.();
    mobileEditorRef.value?.clearEditorHighlight?.();
  }
);

function restoreFromBanner() {
  // Trigger restore on both editors to cover desktop and mobile layouts
  desktopEditorRef.value?.restore?.();
  mobileEditorRef.value?.restore?.();
  // Also clear any error highlight after restore
  desktopEditorRef.value?.clearEditorHighlight?.();
  mobileEditorRef.value?.clearEditorHighlight?.();
}

async function onFunctionExecuted({ func, res, error, simulate }) {
  const functionName = func.function_name;

  // Clear any previous results for this function
  executionErrors.value[functionName] = "";
  executionResults.value[functionName] = null;
  executionErrorContext.value[functionName] = null;

  if (error) {
    console.error("Function execution failed:", error);
    executionErrors.value[functionName] = error;
    executionErrorContext.value[functionName] = { simulate };
  } else if (res) {
    console.log(
      `Function ${simulate ? "simulated" : "executed"} successfully:`,
      res
    );

    // Extract useful information from scriptResponse or rawLog
    if (res.scriptResponse) {
      const { scriptResponse } = res;

      if (scriptResponse.exception) {
        // Show Python exception details and pass exception for navigation
        const exception = scriptResponse.exception;
        const errorMsg = `${exception.context}: ${exception.msg}\nLine ${exception.lineno}, column ${exception.col_offset}\nCode: ${exception.source_segment}`;
        executionErrors.value[functionName] = errorMsg;
        executionErrorContext.value[functionName] = { simulate, exception };

        // Also show stdout if available
        if (scriptResponse.stdout) {
          executionErrors.value[
            functionName
          ] += `\n\nOutput:\n${scriptResponse.stdout}`;
        }
      } else {
        // Success case - store result for display
        executionResults.value[functionName] = {
          result: scriptResponse.result,
          stdout: scriptResponse.stdout,
          gasConsumed: scriptResponse.script_gas_consumed,
          nodesExecuted: scriptResponse.nodes_called,
          simulate,
          // For actual transactions, also include transaction info
          txHash: !simulate
            ? res.rawSendMsgsResponse?.raw?.tx_response?.txhash
            : null,
          blockHeight: !simulate
            ? res.rawSendMsgsResponse?.raw?.tx_response?.height
            : null,
        };
      }
    } else if (!res.success) {
      // Script failed but no scriptResponse - show transaction info if available
      let errorMsg = "Script execution failed";
      if (!simulate && res.rawSendMsgsResponse?.raw?.tx_response?.txhash) {
        errorMsg += `\n\nTransaction: ${res.rawSendMsgsResponse.raw.tx_response.txhash}`;
        if (res.rawSendMsgsResponse.raw.tx_response.height) {
          errorMsg += `\nBlock: ${res.rawSendMsgsResponse.raw.tx_response.height}`;
        }
      }
      executionErrors.value[functionName] = errorMsg;
      executionErrorContext.value[functionName] = { simulate };
    }
  }
}

// Draggable sidebar methods
function startDrag(e) {
  e.preventDefault();
  isDragging.value = true;
}

function drag(e) {
  if (isDragging.value) {
    e.preventDefault();
    let movementX;

    if (e.type === "touchmove") {
      // For touch events, calculate movement from stored touch position
      const touch = e.touches[0];
      if (lastTouchX.value !== null) {
        movementX = touch.clientX - lastTouchX.value;
      } else {
        movementX = 0;
      }
      lastTouchX.value = touch.clientX;
    } else {
      // For mouse events, use movementX
      movementX = e.movementX;
    }

    const newWidth = sidebarWidth.value + movementX;
    sidebarWidth.value = Math.max(200, Math.min(800, newWidth)); // Add min/max constraints
  }
}

function stopDrag() {
  isDragging.value = false;
  lastTouchX.value = null;
}

// Watchers

watch(
  () => address.value,
  () => {
    loadScript();
  },
  { immediate: true }
);

onMounted(() => {
  loadScript();

  // Add global event listeners for dragging
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", stopDrag);
  document.addEventListener("touchmove", drag, { passive: false });
  document.addEventListener("touchend", stopDrag);
});
</script>

<style scoped>
/* Additional styles if needed */
</style>
