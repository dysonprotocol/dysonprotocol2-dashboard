<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-2">Crontasks</h2>
    <p class="text-sm text-gray-600 mb-4">Address: {{ address }}</p>

    <!-- List tasks by creator -->
    <div class="bg-base-200 p-4 rounded mb-6">
      <div class="flex flex-wrap gap-2 items-end mb-3">
        <label class="form-control w-28">
          <span class="label-text">limit</span>
          <input
            v-model.number="listForm.limit"
            type="number"
            min="1"
            max="200"
            class="input input-bordered input-sm"
          />
        </label>
        <label class="form-control flex-1 min-w-56">
          <span class="label-text">pagination.key</span>
          <input
            v-model="listForm.key"
            type="text"
            class="input input-bordered input-sm"
            placeholder="base64 page key"
          />
        </label>
        <button class="btn btn-sm" @click="applyListParams">Apply</button>
        <button
          class="btn btn-ghost btn-sm"
          :disabled="!listForm.key"
          @click="resetListKey"
        >
          Reset
        </button>
        <span class="flex-1"></span>
        <button class="btn btn-sm" :disabled="!nextKey" @click="nextListPage">
          Next page
        </button>
      </div>

      <div class="text-sm mb-2">
        <span v-if="listError" class="text-error">{{ listError }}</span>
        <span v-else-if="isLoadingList">Loading…</span>
        <span v-else class="opacity-70">{{ tasks.length }} task(s)</span>
      </div>

      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm w-full">
          <thead>
            <tr>
              <th class="w-[10%]">id</th>
              <th class="w-[12%]">status</th>
              <th class="w-[18%]">scheduled</th>
              <th class="w-[18%]">expiry</th>
              <th class="w-[12%]">gas_limit</th>
              <th class="w-[15%]">gas_fee</th>
              <th class="w-[15%]">created</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tasks" :key="t.task_id">
              <td class="font-mono">
                <router-link class="link" :to="`/tasks/${t.task_id}`">{{
                  t.task_id
                }}</router-link>
              </td>
              <td>{{ t.status }}</td>
              <td class="font-mono">{{ t.scheduled_timestamp }}</td>
              <td class="font-mono">{{ t.expiry_timestamp }}</td>
              <td class="font-mono">{{ t.task_gas_limit }}</td>
              <td class="font-mono">
                <span v-if="t.task_gas_fee"
                  >{{ t.task_gas_fee.amount }} {{ t.task_gas_fee.denom }}</span
                >
              </td>
              <td class="font-mono">{{ t.creation_time }}</td>
            </tr>
            <tr v-if="!isLoadingList && !listError && tasks.length === 0">
              <td colspan="7" class="text-center opacity-70">No tasks</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/schedule a task -->
    <div class="bg-base-200 p-4 rounded">
      <h3 class="font-semibold mb-3">Create task</h3>
      <form class="grid gap-3" @submit.prevent="createTask">
        <div class="grid md:grid-cols-3 gap-3">
          <label class="form-control">
            <span class="label-text">scheduled_timestamp</span>
            <input
              v-model.trim="createForm.scheduled"
              type="text"
              class="input input-bordered input-sm"
              placeholder="e.g. +1h30m or 1736467200"
            />
          </label>
          <label class="form-control">
            <span class="label-text">expiry_timestamp</span>
            <input
              v-model.trim="createForm.expiry"
              type="text"
              class="input input-bordered input-sm"
              placeholder="optional, e.g. +2h"
            />
          </label>
          <label class="form-control">
            <span class="label-text">task_gas_limit</span>
            <input
              v-model.trim="createForm.gasLimit"
              type="text"
              class="input input-bordered input-sm"
              placeholder="e.g. 500000"
            />
          </label>
        </div>
        <div class="grid md:grid-cols-3 gap-3">
          <label class="form-control">
            <span class="label-text">task_gas_fee.amount</span>
            <input
              v-model.trim="createForm.feeAmount"
              type="text"
              class="input input-bordered input-sm"
              placeholder="e.g. 100000"
            />
          </label>
          <label class="form-control">
            <span class="label-text">task_gas_fee.denom</span>
            <input
              v-model.trim="createForm.feeDenom"
              type="text"
              class="input input-bordered input-sm"
              placeholder="udys"
            />
          </label>
          <label class="form-control">
            <span class="label-text">tx memo (optional)</span>
            <input
              v-model.trim="createForm.memo"
              type="text"
              class="input input-bordered input-sm"
              placeholder=""
            />
          </label>
        </div>

        <div class="grid gap-2">
          <span class="font-medium">Message (raw JSON including @type)</span>
          <textarea
            v-model="createForm.rawMsg"
            class="textarea textarea-bordered textarea-sm w-full font-mono"
            rows="6"
            placeholder='{"@type":"/cosmos.bank.v1beta1.MsgSend","from_address":"...","to_address":"...","amount":[{"denom":"udys","amount":"1"}]}'
          ></textarea>
          <span class="text-xs opacity-70">
            Provide the full message JSON as sent to encode_json, including
            "@type". Example: { "@type": "/cosmos.bank.v1beta1.MsgSend",
            "from_address": "...", "to_address": "...", "amount":
            [{"denom":"udys","amount":"1"}] }
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="btn btn-primary btn-sm"
            type="submit"
            :disabled="isCreating"
          >
            {{ isCreating ? "Creating…" : "Create Task" }}
          </button>
          <span class="text-error text-sm" v-if="createError">{{
            createError
          }}</span>
          <span class="text-success text-sm" v-if="createOk">Created</span>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, inject, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useWallet } from "@/composables/useWallet";

const route = useRoute();
const router = useRouter();
const address = computed(
  () => route.meta?.resolvedAddress || route.params.address
);

const CHAIN_INFO = inject("chainInfo", {
  restUrl: "",
});

// ---- List tasks by creator ----
const listForm = ref({
  limit: Number(route.query["pagination.limit"] || 50),
  key: String(route.query["pagination.key"] || ""),
});
const tasks = ref([]);
const isLoadingList = ref(false);
const listError = ref("");
const nextKey = ref("");

function syncListQuery() {
  const q = { ...route.query };
  if (listForm.value.limit)
    q["pagination.limit"] = String(listForm.value.limit);
  else delete q["pagination.limit"];
  if (listForm.value.key) q["pagination.key"] = listForm.value.key;
  else delete q["pagination.key"];
  router.replace({ query: q });
}
function applyListParams() {
  syncListQuery();
}
function resetListKey() {
  listForm.value.key = "";
  syncListQuery();
}
function nextListPage() {
  if (nextKey.value) {
    listForm.value.key = nextKey.value;
    syncListQuery();
  }
}

async function loadTasks() {
  listForm.value.limit = Number(route.query["pagination.limit"] || 50);
  listForm.value.key = String(route.query["pagination.key"] || "");
  if (!address.value) return;
  isLoadingList.value = true;
  listError.value = "";
  tasks.value = [];
  nextKey.value = "";
  try {
    const u = new URL(
      `${
        CHAIN_INFO.restUrl
      }/dysonprotocol/crontask/v1/tasks/creator/${encodeURIComponent(
        String(address.value)
      )}`
    );
    if (listForm.value.limit)
      u.searchParams.set("pagination.limit", String(listForm.value.limit));
    if (listForm.value.key)
      u.searchParams.set("pagination.key", listForm.value.key);
    const r = await fetch(u.toString());
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const json = await r.json();
    tasks.value = Array.isArray(json?.tasks) ? json.tasks : [];
    nextKey.value = String(json?.pagination?.next_key || "");
  } catch (e) {
    listError.value = e?.message || "Failed to load tasks";
  } finally {
    isLoadingList.value = false;
  }
}

watch(
  () => [address.value, route.query],
  () => loadTasks(),
  { immediate: true, deep: true }
);

// ---- Create task ----
const { sendMsg } = useWallet();
const createForm = ref({
  scheduled: "+1h",
  expiry: "",
  gasLimit: "500000",
  feeAmount: "0",
  feeDenom: "udys",
  memo: "",
  rawMsg: "",
});
const isCreating = ref(false);
const createError = ref("");
const createOk = ref(false);

// rawMsg only; no add/remove helpers needed

async function createTask() {
  if (!address.value) return;
  isCreating.value = true;
  createError.value = "";
  createOk.value = false;
  try {
    // msgs[] expects Any-JSON objects with "@type" inline
    const raw = String(createForm.value.rawMsg || "").trim();
    if (!raw) throw new Error("Message JSON is required");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Invalid JSON in message");
    }
    const typeUrl = String(parsed?.["@type"] || "").trim();
    if (!typeUrl) throw new Error("Message @type is required");
    const msgs = [parsed];

    const msg = {
      "@type": "/dysonprotocol.crontask.v1.MsgCreateTask",
      creator: String(address.value),
      scheduled_timestamp: String(createForm.value.scheduled || "+1h"),
      expiry_timestamp: String(createForm.value.expiry || ""),
      task_gas_limit: String(createForm.value.gasLimit || "500000"),
      task_gas_fee: {
        amount: String(createForm.value.feeAmount || "0"),
        denom: String(createForm.value.feeDenom || "udys"),
      },
      msgs,
    };

    const result = await sendMsg({
      msg,
      gasLimit: undefined,
      memo: createForm.value.memo,
      executorAddress: String(address.value),
    });

    if (!result?.success) throw new Error(result?.rawLog || "Broadcast failed");
    createOk.value = true;
    await loadTasks();
  } catch (e) {
    createError.value = e?.message || "Failed to create task";
  } finally {
    isCreating.value = false;
  }
}
</script>
