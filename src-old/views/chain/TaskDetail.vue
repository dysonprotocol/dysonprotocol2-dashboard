<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-2">
      Task {{ taskId }}
    </h2>
    <p class="text-sm text-gray-600 mb-4">
      Details for task ID {{ taskId }}
    </p>

    <div class="mb-3 text-sm">
      <span
        v-if="error"
        class="text-error"
      >{{ error }}</span>
      <span v-else-if="isLoading">Loading…</span>
    </div>

    <div
      v-if="task"
      class="grid gap-4"
    >
      <div class="bg-base-200 p-4 rounded">
        <div class="grid md:grid-cols-2 gap-3">
          <div>
            <div class="text-xs opacity-70">
              creator
            </div>
            <div class="font-mono break-all">
              {{ task.creator }}
            </div>
          </div>
          <div>
            <div class="text-xs opacity-70">
              status
            </div>
            <div>{{ task.status }}</div>
          </div>
          <div>
            <div class="text-xs opacity-70">
              scheduled_timestamp
            </div>
            <div class="font-mono">
              {{ task.scheduled_timestamp }}
            </div>
          </div>
          <div>
            <div class="text-xs opacity-70">
              execution_timestamp
            </div>
            <div class="font-mono">
              {{ task.execution_timestamp }}
            </div>
          </div>
          <div>
            <div class="text-xs opacity-70">
              expiry_timestamp
            </div>
            <div class="font-mono">
              {{ task.expiry_timestamp }}
            </div>
          </div>
          <div>
            <div class="text-xs opacity-70">
              creation_time
            </div>
            <div class="font-mono">
              {{ task.creation_time }}
            </div>
          </div>
          <div>
            <div class="text-xs opacity-70">
              task_gas_limit
            </div>
            <div class="font-mono">
              {{ task.task_gas_limit }}
            </div>
          </div>
          <div>
            <div class="text-xs opacity-70">
              task_gas_consumed
            </div>
            <div class="font-mono">
              {{ task.task_gas_consumed }}
            </div>
          </div>
          <div>
            <div class="text-xs opacity-70">
              task_gas_fee
            </div>
            <div class="font-mono">
              <span v-if="task.task_gas_fee">{{ task.task_gas_fee.amount }}
                {{ task.task_gas_fee.denom }}</span>
            </div>
          </div>
          <div>
            <div class="text-xs opacity-70">
              task_gas_price
            </div>
            <div class="font-mono">
              <span v-if="task.task_gas_price">{{ task.task_gas_price.amount }}
                {{ task.task_gas_price.denom }}</span>
            </div>
          </div>
        </div>
        <div
          v-if="task.error_log"
          class="mt-3"
        >
          <div class="text-xs opacity-70">
            error_log
          </div>
          <pre
            class="font-mono whitespace-pre-wrap break-words bg-base-300 p-2 rounded"
          >{{ task.error_log }}</pre>
        </div>
      </div>

      <div class="bg-base-200 p-4 rounded">
        <h3 class="font-semibold mb-2">
          Messages
        </h3>
        <div class="grid gap-3">
          <DisplayMsg
            v-for="(m, i) in task.msgs || []"
            :key="i"
            :msg-data="m"
          />
        </div>
      </div>

      <div class="bg-base-200 p-4 rounded">
        <h3 class="font-semibold mb-2">
          Message Results
        </h3>
        <div class="grid gap-3">
          <DisplayMsg
            v-for="(m, i) in task.msg_results || []"
            :key="i"
            :msg-data="m"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from "vue";
import { useRoute } from "vue-router";
import DisplayMsg from "@/components/explorer/DisplayMsg.vue";

const route = useRoute();
const CHAIN_INFO = inject("chainInfo", {
  restUrl: "",
});

const taskId = computed(() => String(route.params.taskId || ""));
const isLoading = ref(false);
const error = ref("");
const task = ref(null);

async function loadTask() {
  if (!taskId.value) return;
  isLoading.value = true;
  error.value = "";
  task.value = null;
  try {
    const url = `${
      CHAIN_INFO.restUrl
    }/dysonprotocol/crontask/v1/tasks/${encodeURIComponent(taskId.value)}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const json = await r.json();
    task.value = json?.task || null;
  } catch (e) {
    error.value = e?.message || "Failed to load task";
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => taskId.value,
  () => loadTask(),
  { immediate: true }
);
</script>
