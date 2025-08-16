<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">Crontasks</h2>

    <!-- Section 1: Scheduled (by timestamp) -->
    <div class="bg-base-200 p-4 rounded mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Scheduled (by timestamp)</h3>
        <div class="flex gap-2 items-end">
          <label class="form-control w-28">
            <span class="label-text">limit</span>
            <input
              v-model.number="scheduled.limit"
              min="1"
              max="200"
              type="number"
              class="input input-bordered input-sm"
            />
          </label>
          <label class="form-control min-w-64">
            <span class="label-text">pagination.key</span>
            <input
              v-model="scheduled.key"
              type="text"
              class="input input-bordered input-sm"
              placeholder="base64 page key"
            />
          </label>
          <button class="btn btn-sm" @click="loadScheduled">Reload</button>
          <button
            class="btn btn-ghost btn-sm"
            :disabled="!scheduled.nextKey"
            @click="
              scheduled.key = scheduled.nextKey;
              loadScheduled();
            "
          >
            Next
          </button>
          <button
            class="btn btn-ghost btn-sm"
            :disabled="!scheduled.key"
            @click="
              scheduled.key = '';
              loadScheduled();
            "
          >
            Reset
          </button>
        </div>
      </div>
      <div class="text-sm mb-2">
        <span v-if="scheduled.error" class="text-error">{{
          scheduled.error
        }}</span>
        <span v-else-if="scheduled.loading">Loading…</span>
        <span v-else class="opacity-70"
          >{{ scheduled.items.length }} task(s)</span
        >
      </div>
      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm w-full">
          <thead>
            <tr>
              <th>id</th>
              <th>creator</th>
              <th>scheduled</th>
              <th>expiry</th>
              <th>gas_limit</th>
              <th>fee</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in scheduled.items" :key="t.task_id">
              <td class="font-mono">
                <router-link class="link" :to="`/tasks/${t.task_id}`">{{
                  t.task_id
                }}</router-link>
              </td>
              <td class="font-mono break-all">{{ t.creator }}</td>
              <td class="font-mono">{{ t.scheduled_timestamp }}</td>
              <td class="font-mono">{{ t.expiry_timestamp }}</td>
              <td class="font-mono">{{ t.task_gas_limit }}</td>
              <td class="font-mono">
                <span v-if="t.task_gas_fee"
                  >{{ t.task_gas_fee.amount }} {{ t.task_gas_fee.denom }}</span
                >
              </td>
            </tr>
            <tr
              v-if="
                !scheduled.loading &&
                !scheduled.error &&
                scheduled.items.length === 0
              "
            >
              <td colspan="6" class="text-center opacity-70">No tasks</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Section 2: Pending (by gas) -->
    <div class="bg-base-200 p-4 rounded mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Pending (by gas price)</h3>
        <div class="flex gap-2 items-end">
          <label class="form-control w-28">
            <span class="label-text">limit</span>
            <input
              v-model.number="pending.limit"
              min="1"
              max="200"
              type="number"
              class="input input-bordered input-sm"
            />
          </label>
          <label class="form-control w-28">
            <span class="label-text">offset</span>
            <input
              v-model.number="pending.offset"
              min="0"
              type="number"
              class="input input-bordered input-sm"
            />
          </label>
          <button class="btn btn-sm" @click="loadPending">Reload</button>
          <button
            class="btn btn-ghost btn-sm"
            :disabled="pending.offset <= 0"
            @click="
              pending.offset = Math.max(0, pending.offset - pending.limit);
              loadPending();
            "
          >
            Prev
          </button>
          <button
            class="btn btn-ghost btn-sm"
            @click="
              pending.offset = pending.offset + pending.limit;
              loadPending();
            "
          >
            Next
          </button>
        </div>
      </div>
      <div class="text-sm mb-2">
        <span v-if="pending.error" class="text-error">{{ pending.error }}</span>
        <span v-else-if="pending.loading">Loading…</span>
        <span v-else class="opacity-70"
          >{{ pending.items.length }} task(s) — total
          {{ pending.total || "?" }}</span
        >
      </div>
      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>id</th>
              <th>creator</th>
              <th>gas_price</th>
              <th>ahead</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(t, i) in pending.items" :key="t.task_id">
              <td class="font-mono">{{ pending.offset + i + 1 }}</td>
              <td class="font-mono">
                <router-link class="link" :to="`/tasks/${t.task_id}`">{{
                  t.task_id
                }}</router-link>
              </td>
              <td class="font-mono break-all">{{ t.creator }}</td>
              <td class="font-mono">
                <span v-if="t.task_gas_price"
                  >{{ t.task_gas_price.amount }}
                  {{ t.task_gas_price.denom }}</span
                >
              </td>
              <td class="font-mono">{{ pending.offset + i }}</td>
            </tr>
            <tr
              v-if="
                !pending.loading && !pending.error && pending.items.length === 0
              "
            >
              <td colspan="5" class="text-center opacity-70">No tasks</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Section 3: Finished (DONE/FAILED/EXPIRED by timestamp) -->
    <div class="bg-base-200 p-4 rounded">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Finished (by timestamp)</h3>
        <div class="flex gap-2 items-end">
          <label class="form-control">
            <span class="label-text">status</span>
            <select
              v-model="finished.status"
              class="select select-bordered select-sm"
            >
              <option value="DONE">DONE</option>
              <option value="FAILED">FAILED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </label>
          <label class="form-control w-28">
            <span class="label-text">limit</span>
            <input
              v-model.number="finished.limit"
              min="1"
              max="200"
              type="number"
              class="input input-bordered input-sm"
            />
          </label>
          <label class="form-control min-w-64">
            <span class="label-text">pagination.key</span>
            <input
              v-model="finished.key"
              type="text"
              class="input input-bordered input-sm"
              placeholder="base64 page key"
            />
          </label>
          <button class="btn btn-sm" @click="loadFinished">Reload</button>
          <button
            class="btn btn-ghost btn-sm"
            :disabled="!finished.nextKey"
            @click="
              finished.key = finished.nextKey;
              loadFinished();
            "
          >
            Next
          </button>
          <button
            class="btn btn-ghost btn-sm"
            :disabled="!finished.key"
            @click="
              finished.key = '';
              loadFinished();
            "
          >
            Reset
          </button>
        </div>
      </div>
      <div class="text-sm mb-2">
        <span v-if="finished.error" class="text-error">{{
          finished.error
        }}</span>
        <span v-else-if="finished.loading">Loading…</span>
        <span v-else class="opacity-70"
          >{{ finished.items.length }} task(s)</span
        >
      </div>
      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm w-full">
          <thead>
            <tr>
              <th>id</th>
              <th>status</th>
              <th>created</th>
              <th>executed</th>
              <th>gas_used</th>
              <th>error</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in finished.items" :key="t.task_id">
              <td class="font-mono">
                <router-link class="link" :to="`/tasks/${t.task_id}`">{{
                  t.task_id
                }}</router-link>
              </td>
              <td>{{ t.status }}</td>
              <td class="font-mono">{{ t.creation_time }}</td>
              <td class="font-mono">{{ t.execution_timestamp }}</td>
              <td class="font-mono">{{ t.task_gas_consumed }}</td>
              <td class="font-mono break-all">{{ t.error_log }}</td>
            </tr>
            <tr
              v-if="
                !finished.loading &&
                !finished.error &&
                finished.items.length === 0
              "
            >
              <td colspan="6" class="text-center opacity-70">No tasks</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject, reactive } from "vue";

const CHAIN_INFO = inject("chainInfo", {
  restUrl: "",
});

const scheduled = reactive({
  limit: 50,
  key: "",
  items: [],
  nextKey: "",
  loading: false,
  error: "",
});
const pending = reactive({
  limit: 50,
  offset: 0,
  items: [],
  total: "",
  loading: false,
  error: "",
});
const finished = reactive({
  status: "DONE",
  limit: 50,
  key: "",
  items: [],
  nextKey: "",
  loading: false,
  error: "",
});

async function loadScheduled() {
  scheduled.loading = true;
  scheduled.error = "";
  scheduled.items = [];
  scheduled.nextKey = "";
  try {
    const u = new URL(
      `${CHAIN_INFO.restUrl}/dysonprotocol/crontask/v1/tasks/status/SCHEDULED`
    );
    if (scheduled.limit)
      u.searchParams.set("pagination.limit", String(scheduled.limit));
    if (scheduled.key) u.searchParams.set("pagination.key", scheduled.key);
    const r = await fetch(u.toString());
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const json = await r.json();
    scheduled.items = Array.isArray(json?.tasks) ? json.tasks : [];
    scheduled.nextKey = String(json?.pagination?.next_key || "");
  } catch (e) {
    scheduled.error = e?.message || "Failed to load scheduled";
  } finally {
    scheduled.loading = false;
  }
}

async function loadPending() {
  pending.loading = true;
  pending.error = "";
  pending.items = [];
  pending.total = "";
  try {
    const u = new URL(
      `${CHAIN_INFO.restUrl}/dysonprotocol/crontask/v1/tasks/status/PENDING/by_gas`
    );
    if (pending.limit)
      u.searchParams.set("pagination.limit", String(pending.limit));
    u.searchParams.set("pagination.offset", String(pending.offset || 0));
    u.searchParams.set("pagination.count_total", "true");
    const r = await fetch(u.toString());
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const json = await r.json();
    pending.items = Array.isArray(json?.tasks) ? json.tasks : [];
    pending.total = String(json?.pagination?.total || "");
  } catch (e) {
    pending.error = e?.message || "Failed to load pending";
  } finally {
    pending.loading = false;
  }
}

async function loadFinished() {
  finished.loading = true;
  finished.error = "";
  finished.items = [];
  finished.nextKey = "";
  try {
    const status = finished.status || "DONE";
    const u = new URL(
      `${
        CHAIN_INFO.restUrl
      }/dysonprotocol/crontask/v1/tasks/status/${encodeURIComponent(status)}`
    );
    if (finished.limit)
      u.searchParams.set("pagination.limit", String(finished.limit));
    if (finished.key) u.searchParams.set("pagination.key", finished.key);
    const r = await fetch(u.toString());
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const json = await r.json();
    finished.items = Array.isArray(json?.tasks) ? json.tasks : [];
    finished.nextKey = String(json?.pagination?.next_key || "");
  } catch (e) {
    finished.error = e?.message || "Failed to load finished";
  } finally {
    finished.loading = false;
  }
}

// initial load
loadScheduled();
loadPending();
loadFinished();
</script>
