<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-2">Storage</h2>
    <p class="text-sm text-gray-600 mb-4">Owner: {{ address }}</p>

    <form
      class="bg-base-200 p-4 rounded mb-4 grid gap-3"
      @submit.prevent="applyFilters"
    >
      <div class="grid md:grid-cols-2 gap-3">
        <label class="form-control">
          <span class="label-text">index_prefix</span>
          <input
            v-model.trim="form.index_prefix"
            type="text"
            class="input input-bordered input-sm"
            placeholder="e.g. user/"
          />
        </label>
        <label class="form-control">
          <span class="label-text">filter</span>
          <input
            v-model.trim="form.filter"
            type="text"
            class="input input-bordered input-sm"
            placeholder='e.g. status == "active"'
          />
        </label>
      </div>
      <div class="grid md:grid-cols-2 gap-3 items-end">
        <label class="form-control">
          <span class="label-text">extract</span>
          <input
            v-model.trim="form.extract"
            type="text"
            class="input input-bordered input-sm"
            placeholder="e.g. user.name"
          />
        </label>
        <label class="form-control">
          <span class="label-text">pagination.limit</span>
          <input
            v-model.number="form.limit"
            min="1"
            max="500"
            type="number"
            class="input input-bordered input-sm"
          />
        </label>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="submit" class="btn btn-primary btn-sm">Apply</button>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          @click="clearFilters"
        >
          Clear
        </button>
        <span class="flex-1"></span>
        <input
          v-model="pageKey"
          type="text"
          class="input input-bordered input-sm w-full md:w-96"
          placeholder="pagination.key (base64)"
        />
        <button
          type="button"
          class="btn btn-sm"
          :disabled="!pageKey"
          @click="applyFilters"
        >
          Go
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="!pageKey"
          @click="resetPagination"
        >
          Reset
        </button>
      </div>
    </form>

    <div class="mb-2 text-sm">
      <span v-if="error" class="text-error">{{ error }}</span>
      <span v-else-if="isLoading">Loading…</span>
      <span v-else class="opacity-70">{{ entries.length }} result(s)</span>
    </div>

    <div class="overflow-x-auto">
      <table class="table table-zebra table-sm w-full">
        <thead>
          <tr>
            <th class="w-[28%]">index</th>
            <th class="w-[44%]">data</th>
            <th class="w-[14%]">height</th>
            <th class="w-[14%]">timestamp</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in entries" :key="`${e.index}-${e.updated_height}`">
            <td class="font-mono align-top break-all">{{ e.index }}</td>
            <td class="font-mono whitespace-pre-wrap break-words align-top">
              <div
                class="cursor-pointer"
                @click="toggleExpand(rowKey(e))"
                :title="
                  isExpanded(rowKey(e))
                    ? 'Click to collapse'
                    : 'Click to expand'
                "
              >
                {{ displayData(e) }}
              </div>
            </td>
            <td class="align-top">{{ e.updated_height }}</td>
            <td class="align-top">{{ e.updated_timestamp }}</td>
          </tr>
          <tr v-if="!isLoading && !error && entries.length === 0">
            <td colspan="4" class="text-center opacity-70">No results</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4 flex gap-2 items-center">
      <button class="btn btn-sm" :disabled="!nextKey" @click="nextPage">
        Next page
      </button>
      <button
        class="btn btn-ghost btn-sm"
        :disabled="!pageKey"
        @click="resetPagination"
      >
        Reset pagination
      </button>
      <span v-if="total" class="text-sm opacity-70">total: {{ total }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, inject, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const address = computed(
  () => route.meta?.resolvedAddress || route.params.address
);

const DEFAULT_CHAIN_INFO = inject("chainInfo", {
  restUrl: "http://localhost:1317",
});

const form = ref({
  index_prefix: String(route.query.index_prefix || ""),
  filter: String(route.query.filter || ""),
  extract: String(route.query.extract || ""),
  limit: Number(route.query["pagination.limit"] || 50),
});

const pageKey = ref(String(route.query["pagination.key"] || ""));
const nextKey = ref("");
const total = ref("");
const isLoading = ref(false);
const error = ref("");
const entries = ref([]);
const expandedRows = ref(new Set());
const TRUNCATE_LEN = 100;

function syncQuery() {
  const q = { ...route.query };
  if (form.value.index_prefix) q.index_prefix = form.value.index_prefix;
  else delete q.index_prefix;
  if (form.value.filter) q.filter = form.value.filter;
  else delete q.filter;
  if (form.value.extract) q.extract = form.value.extract;
  else delete q.extract;
  if (form.value.limit) q["pagination.limit"] = String(form.value.limit);
  else delete q["pagination.limit"];
  if (pageKey.value) q["pagination.key"] = pageKey.value;
  else delete q["pagination.key"];
  router.replace({ query: q });
}

function applyFilters() {
  // When filters change, reset pagination unless user explicitly set a key
  if (!route.query["pagination.key"]) pageKey.value = "";
  syncQuery();
}

function clearFilters() {
  form.value.index_prefix = "";
  form.value.filter = "";
  form.value.extract = "";
  form.value.limit = 50;
  pageKey.value = "";
  syncQuery();
}

function resetPagination() {
  pageKey.value = "";
  syncQuery();
}

function nextPage() {
  if (!nextKey.value) return;
  pageKey.value = nextKey.value;
  syncQuery();
}

async function reload() {
  // sync local state from URL
  form.value.index_prefix = String(route.query.index_prefix || "");
  form.value.filter = String(route.query.filter || "");
  form.value.extract = String(route.query.extract || "");
  form.value.limit = Number(route.query["pagination.limit"] || 50);
  pageKey.value = String(route.query["pagination.key"] || "");

  if (!address.value) return;
  isLoading.value = true;
  error.value = "";
  entries.value = [];
  nextKey.value = "";
  total.value = "";
  try {
    const u = new URL(
      `${DEFAULT_CHAIN_INFO.restUrl}/dysonprotocol/storage/v1/storage_list`
    );
    u.searchParams.set("owner", String(address.value));
    if (form.value.index_prefix)
      u.searchParams.set("index_prefix", form.value.index_prefix);
    if (form.value.filter) u.searchParams.set("filter", form.value.filter);
    if (form.value.extract) u.searchParams.set("extract", form.value.extract);
    if (form.value.limit)
      u.searchParams.set("pagination.limit", String(form.value.limit));
    if (pageKey.value) u.searchParams.set("pagination.key", pageKey.value);

    const resp = await fetch(u.toString());
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    const json = await resp.json();
    entries.value = Array.isArray(json?.entries) ? json.entries : [];
    nextKey.value = String(json?.pagination?.next_key || "");
    total.value = String(json?.pagination?.total || "");
  } catch (e) {
    error.value = e?.message || "Failed to load storage";
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => [address.value, route.query],
  () => reload(),
  { immediate: true, deep: true }
);

function rowKey(e) {
  const h = String(e?.hash || "");
  if (h) return h;
  return `${String(e?.index || "")}-${String(e?.updated_height || "")}`;
}

function isExpanded(key) {
  return expandedRows.value.has(key);
}

function toggleExpand(key) {
  const s = new Set(expandedRows.value);
  if (s.has(key)) s.delete(key);
  else s.add(key);
  expandedRows.value = s;
}

function displayData(e) {
  const key = rowKey(e);
  const data = String(e?.data || "");
  if (isExpanded(key)) return data;
  if (data.length <= TRUNCATE_LEN) return data;
  return data.slice(0, TRUNCATE_LEN) + "…";
}
</script>
