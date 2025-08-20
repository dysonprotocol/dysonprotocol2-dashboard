<template>
  <div class="p-4">
    <div class="mb-2">
      <h2 class="text-xl font-bold">Storage</h2>
      <p class="text-sm text-gray-600">Owner: {{ address }}</p>
    </div>

    <!-- Main: Controls and list -->
    <section>
      <form class="" @submit.prevent>
        <div class="grid md:grid-cols-4 gap-4">
          <!-- Column 1: index_prefix, filter, extract -->
          <fieldset
            class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4"
          >
            <legend class="fieldset-legend">Filters</legend>
            <input
              v-model.trim="form.index_prefix"
              type="text"
              class="input"
              placeholder="Index prefix (e.g. user/)"
            />
            <input
              v-model.trim="form.filter"
              type="text"
              class="input"
              placeholder='Filter (e.g. status == "active")'
            />
            <input
              v-model.trim="form.extract"
              type="text"
              class="input"
              placeholder="Extract (e.g. user.name)"
            />
          </fieldset>

          <!-- Column 2: limit, offset, reverse, key -->
          <fieldset
            class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4"
          >
            <legend class="fieldset-legend">Pagination</legend>
            <input
              v-model.number="form.limit"
              min="1"
              max="500"
              type="number"
              class="input"
              placeholder="Limit (default: 100)"
            />
            <input
              v-model.trim="form.offset"
              type="number"
              min="0"
              class="input"
              placeholder="Offset (e.g. 0)"
            />
            <label class="cursor-pointer flex items-center gap-2">
              <span>Reverse</span>
              <input v-model="form.reverse" type="checkbox" class="checkbox" />
            </label>
          </fieldset>
        </div>
      </form>

      <div class="mb-2 text-sm">
        <span v-if="error" class="text-error">{{ error }}</span>
        <span v-else-if="isLoading">Loading…</span>
        <span v-else class="opacity-70"
          >{{ entries.length }} entries per page</span
        >
      </div>

      <!-- Page numbers -->
      <div v-if="showPageNumbers" class="mb-2 flex items-center">
        <div class="join">
          <button
            class="join-item btn btn-xs"
            :disabled="currentPage === 1"
            @click="firstPage()"
          >
            «
          </button>
          <button
            class="join-item btn btn-xs"
            :disabled="currentPage === 1"
            @click="prevPage()"
          >
            ‹
          </button>
          <button
            v-for="p in pages"
            :key="p"
            class="join-item btn btn-xs"
            :class="{ 'btn-active': p === currentPage }"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
          <button
            class="join-item btn btn-xs"
            :disabled="currentPage === totalPages"
            @click="nextPageBtn()"
          >
            ›
          </button>
          <button
            class="join-item btn btn-xs"
            :disabled="currentPage === totalPages"
            @click="lastPage()"
          >
            »
          </button>
          <button class="join-item btn btn-xs btn-ghost" disabled>
            {{ currentPage }}/{{ totalPages }} • {{ entries.length }} per page
          </button>
        </div>
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
            <tr v-if="!isLoading && !error && !entries.length">
              <td colspan="4" class="text-center opacity-70">No results</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Removed bottom next-page controls; page numbers shown above -->
    </section>
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

const CHAIN_INFO = inject("chainInfo", {
  restUrl: "",
});

const form = ref({
  index_prefix: String(route.query.index_prefix || ""),
  filter: String(route.query.filter || ""),
  extract: String(route.query.extract || ""),
  limit: Number(route.query["pagination.limit"] || 0),
  offset: String(route.query["pagination.offset"] || ""),
  reverse: route.query["pagination.reverse"] === "true",
});

// key-based pagination removed; rely on offset + limit + total
const total = ref("");
// page-numbering helpers
const currentPage = computed(() => {
  const offsetNum = Number(form.value.offset || 0);
  const limitNum = Number(form.value.limit || 100);
  if (!limitNum) return 1;
  return Math.floor(offsetNum / limitNum) + 1;
});
const totalPages = computed(() => {
  const t = Number(total.value || 0);
  const limitNum = Number(form.value.limit || 100);
  if (!limitNum) return 1;
  return Math.max(1, Math.ceil(t / limitNum));
});
const pages = computed(() =>
  Array.from({ length: totalPages.value }, (_, i) => i + 1)
);
const showPageNumbers = computed(() => Boolean(total.value));
const isLoading = ref(false);
const error = ref("");
const entries = ref([]);
const expandedRows = ref(new Set());
const TRUNCATE_LEN = 100;

// No filename assumptions; list uses raw entries

// folder tree removed entirely

// Removed normalize/fileName/prefix navigation

// Icon and file-type logic removed for minimal UI

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
  if (form.value.offset) q["pagination.offset"] = String(form.value.offset);
  else delete q["pagination.offset"];
  if (form.value.reverse) q["pagination.reverse"] = "true";
  else delete q["pagination.reverse"];
  // always remove key-based pagination
  delete q["pagination.key"];
  router.replace({ query: q });
}

// key-based apply/reset/next functions removed

function goToPage(p) {
  const pageNum = Number(p);
  const limitNum = Number(form.value.limit || 1);
  if (Number.isNaN(pageNum) || pageNum < 1 || !limitNum) return;
  // switch to offset mode and clear key
  form.value.offset = String((pageNum - 1) * limitNum);
  syncQuery();
}

function firstPage() {
  goToPage(1);
}

function prevPage() {
  if (currentPage.value > 1) goToPage(currentPage.value - 1);
}

function nextPageBtn() {
  if (currentPage.value < totalPages.value) goToPage(currentPage.value + 1);
}

function lastPage() {
  goToPage(totalPages.value);
}

async function reload() {
  // sync local state from URL
  form.value.index_prefix = String(route.query.index_prefix || "");
  form.value.filter = String(route.query.filter || "");
  form.value.extract = String(route.query.extract || "");
  form.value.limit = Number(route.query["pagination.limit"] || 0);
  form.value.offset = String(route.query["pagination.offset"] || "");
  form.value.reverse =
    String(route.query["pagination.reverse"] || "") === "true";

  if (!address.value) return;
  isLoading.value = true;
  error.value = "";
  entries.value = [];
  total.value = "";
  try {
    const u = new URL(
      `${CHAIN_INFO.restUrl}/dysonprotocol/storage/v1/storage_list`
    );
    u.searchParams.set("owner", String(address.value));
    u.searchParams.set("pagination.count_total", "true");
    if (form.value.index_prefix)
      u.searchParams.set("index_prefix", form.value.index_prefix);
    if (form.value.filter) u.searchParams.set("filter", form.value.filter);
    if (form.value.extract) u.searchParams.set("extract", form.value.extract);
    if (form.value.limit)
      u.searchParams.set("pagination.limit", String(form.value.limit));
    if (form.value.offset)
      u.searchParams.set("pagination.offset", String(form.value.offset));
    if (form.value.reverse) u.searchParams.set("pagination.reverse", "true");

    const resp = await fetch(u.toString());
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    const json = await resp.json();
    const newEntries = Array.isArray(json?.entries) ? json.entries : [];
    // Always replace when using offset-based pagination
    entries.value = newEntries;
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

// Debounced auto-apply on form changes
let autoApplyTimer = null;
watch(
  () => ({ ...form.value }),
  () => {
    if (autoApplyTimer) clearTimeout(autoApplyTimer);
    autoApplyTimer = setTimeout(() => {
      syncQuery();
    }, 350);
  },
  { deep: true }
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

// Infinite scroll removed in favor of numbered pages

function displayData(e) {
  const key = rowKey(e);
  const data = String(e?.data || "");
  if (isExpanded(key)) return data;
  if (data.length <= TRUNCATE_LEN) return data;
  return data.slice(0, TRUNCATE_LEN) + "…";
}

// tree component removed
</script>
