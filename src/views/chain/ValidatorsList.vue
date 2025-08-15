<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-2">Validators</h2>
    <p class="text-sm text-gray-600 mb-4">Current validator set</p>

    <div class="bg-base-200 p-4 rounded mb-4 grid gap-3">
      <div class="flex flex-wrap gap-2 items-end">
        <label class="form-control">
          <span class="label-text">status</span>
          <select
            v-model="form.status"
            class="select select-bordered select-sm"
          >
            <option value="">All</option>
            <option value="BOND_STATUS_BONDED">BOND_STATUS_BONDED</option>
            <option value="BOND_STATUS_UNBONDING">BOND_STATUS_UNBONDING</option>
            <option value="BOND_STATUS_UNBONDED">BOND_STATUS_UNBONDED</option>
          </select>
        </label>
        <label class="form-control w-28">
          <span class="label-text">limit</span>
          <input
            v-model.number="form.limit"
            min="1"
            max="200"
            type="number"
            class="input input-bordered input-sm"
          />
        </label>
        <label class="form-control flex-1 min-w-64">
          <span class="label-text">pagination.key</span>
          <input
            v-model="form.key"
            type="text"
            class="input input-bordered input-sm"
            placeholder="base64 page key"
          />
        </label>
        <button class="btn btn-sm" @click="apply">Apply</button>
        <button
          class="btn btn-ghost btn-sm"
          :disabled="!form.key"
          @click="resetKey"
        >
          Reset
        </button>
        <span class="flex-1"></span>
        <button class="btn btn-sm" :disabled="!nextKey" @click="nextPage">
          Next
        </button>
      </div>
      <div class="text-sm">
        <span v-if="error" class="text-error">{{ error }}</span>
        <span v-else-if="isLoading">Loading…</span>
        <span v-else class="opacity-70"
          >{{ validators.length }} validator(s)</span
        >
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="table table-zebra table-sm w-full">
        <thead>
          <tr>
            <th>moniker</th>
            <th>operator</th>
            <th>status</th>
            <th>jailed</th>
            <th>tokens</th>
            <th>delegator_shares</th>
            <th>commission</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in validators" :key="v.operator_address">
            <td>{{ v.description?.moniker || "" }}</td>
            <td class="font-mono break-all">
              <router-link
                class="link"
                :to="`/validators/${v.operator_address}`"
                >{{ v.operator_address }}</router-link
              >
            </td>
            <td>{{ v.status }}</td>
            <td>{{ v.jailed ? "true" : "false" }}</td>
            <td class="font-mono">{{ v.tokens }}</td>
            <td class="font-mono">{{ v.delegator_shares }}</td>
            <td class="font-mono">
              {{ v.commission?.commission_rates?.rate }}
            </td>
          </tr>
          <tr v-if="!isLoading && !error && validators.length === 0">
            <td colspan="7" class="text-center opacity-70">No validators</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { inject, ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const DEFAULT_CHAIN_INFO = inject("chainInfo", {
  restUrl: "http://localhost:1317",
});

const form = ref({
  status: String(route.query.status || ""),
  limit: Number(route.query["pagination.limit"] || 50),
  key: String(route.query["pagination.key"] || ""),
});

const validators = ref([]);
const isLoading = ref(false);
const error = ref("");
const nextKey = ref("");

function syncQuery() {
  const q = { ...route.query };
  if (form.value.status) q.status = form.value.status;
  else delete q.status;
  if (form.value.limit) q["pagination.limit"] = String(form.value.limit);
  else delete q["pagination.limit"];
  if (form.value.key) q["pagination.key"] = form.value.key;
  else delete q["pagination.key"];
  router.replace({ query: q });
}

function apply() {
  syncQuery();
}
function resetKey() {
  form.value.key = "";
  syncQuery();
}
function nextPage() {
  if (nextKey.value) {
    form.value.key = nextKey.value;
    syncQuery();
  }
}

async function load() {
  form.value.status = String(route.query.status || "");
  form.value.limit = Number(route.query["pagination.limit"] || 50);
  form.value.key = String(route.query["pagination.key"] || "");

  isLoading.value = true;
  error.value = "";
  validators.value = [];
  nextKey.value = "";
  try {
    const u = new URL(
      `${DEFAULT_CHAIN_INFO.restUrl}/cosmos/staking/v1beta1/validators`
    );
    if (form.value.status) u.searchParams.set("status", form.value.status);
    if (form.value.limit)
      u.searchParams.set("pagination.limit", String(form.value.limit));
    if (form.value.key) u.searchParams.set("pagination.key", form.value.key);
    const r = await fetch(u.toString());
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const json = await r.json();
    validators.value = Array.isArray(json?.validators) ? json.validators : [];
    nextKey.value = String(json?.pagination?.next_key || "");
  } catch (e) {
    error.value = e?.message || "Failed to load validators";
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => route.query,
  () => load(),
  { immediate: true, deep: true }
);
</script>
