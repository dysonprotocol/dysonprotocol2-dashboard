<template>
  <div class="p-4">
    <div class="mb-2">
      <h2 class="text-xl font-bold">Storage</h2>
      <p class="text-sm text-gray-600">Owner: {{ address }}</p>
    </div>

    <!-- Upload: set new storage entry -->

    <!-- Main: Controls and list -->
    <section>
      <div class="lg:flex gap-4 pb-4 flex-wrap">
        <fieldset
          class="fieldset bg-base-200 border-base-300 rounded-box border p-4 lg:w-1/3 md:w-full"
        >
          <legend class="fieldset-legend">Metrics</legend>
          <div class="text-sm">
            <div v-if="metricsError" class="text-error">
              {{ metricsError }}
            </div>
            <div v-else>
              <table class="table table-compact table-sm w-full">
                <tbody>
                  <tr>
                    <td class="opacity-70 w-1/3 align-top">owner</td>
                    <td class="align-top">
                      <AddressDisplay
                        :address="metrics.owner || address"
                        :truncate="10"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td class="opacity-70 align-top">total_bytes</td>
                    <td class="align-top">
                      <span class="font-mono">{{
                        metrics.total_bytes || "0"
                      }}</span>
                    </td>
                  </tr>
                  <tr>
                    <td class="opacity-70 align-top">min_stake_amount</td>
                    <td class="align-top">
                      <span class="font-mono">{{
                        minStakeDisplay.amount
                      }}</span>
                      <span class="text-xs opacity-70">{{
                        minStakeDisplay.denom
                      }}</span>
                    </td>
                  </tr>
                  <tr>
                    <td class="opacity-70 align-top">current_stake_amount</td>
                    <td class="align-top">
                      <span class="font-mono"
                        >{{ currentStakeDisplay.amount }}
                      </span>
                      <span class="text-xs opacity-70">{{
                        currentStakeDisplay.denom
                      }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </fieldset>

        <form class="lg:w-1/3 md:w-full" @submit.prevent>
          <div class="">
            <!-- Column 1: index_prefix, filter, extract -->
            <fieldset
              class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4"
            >
              <legend class="fieldset-legend">Filters</legend>
              <input
                v-model.trim="form.index_prefix"
                type="text"
                class="input w-full"
                placeholder="Index prefix (e.g. user/)"
              />
              <input
                v-model.trim="form.filter"
                type="text"
                class="input w-full"
                placeholder='Filter (e.g. status == "active")'
              />
              <input
                v-model.trim="form.extract"
                type="text"
                class="input w-full"
                placeholder="Extract (e.g. user.name)"
              />
            </fieldset>
          </div>
        </form>
      </div>
      <div class="mb-2 text-sm">
        <span v-if="error" class="text-error">{{ error }}</span>
        <span v-else-if="isLoading">Loading…</span>
        <span v-else class="opacity-70"
          >{{ entries.length }} entries per page</span
        >
      </div>

      <!-- Page numbers -->
      <div
        v-if="showPageNumbers"
        class="mb-2 flex items-center gap-3 flex-wrap"
      >
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
        <!-- Inline pagination controls -->
        <form class="flex items-center gap-2" @submit.prevent>
          <label class="text-xs opacity-70">limit</label>
          <input
            v-model.number="form.limit"
            min="1"
            max="500"
            type="number"
            class="input input-xs w-20"
            placeholder="100"
          />
          <label class="text-xs opacity-70">offset</label>
          <input
            v-model.trim="form.offset"
            type="number"
            min="0"
            class="input input-xs w-24"
            placeholder="0"
          />
          <label class="cursor-pointer flex items-center gap-1 text-xs">
            <span>reverse</span>
            <input
              v-model="form.reverse"
              type="checkbox"
              class="checkbox checkbox-xs"
            />
          </label>
        </form>
      </div>

      <!-- Split view: list (left) and editor (right) with independent scroll -->
      <div class="grid md:grid-cols-2 gap-4">
        <!-- Left: entries list -->
        <div class="overflow-x-auto h-[60vh] overflow-y-auto">
          <table class="table table-zebra table-sm w-full">
            <thead>
              <tr>
                <th class="w-[48%]">index</th>
                <th class="w-[18%]">height</th>
                <th class="w-[18%]">timestamp</th>
                <th class="w-[16%] text-right">actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="e in entries"
                :key="`${e.index}-${e.updated_height}`"
                class="cursor-pointer"
                :class="{ 'bg-base-200': isSelected(e) }"
                @click="selectEntry(e)"
              >
                <td class="font-mono align-top break-all">{{ e.index }}</td>
                <td class="align-top">{{ e.updated_height }}</td>
                <td class="align-top">{{ e.updated_timestamp }}</td>
                <td class="align-top text-right">
                  <button
                    class="btn btn-xs btn-error"
                    :disabled="isDeleting(e.index)"
                    title="Delete this entry"
                    @click.stop="deleteEntry(e)"
                  >
                    <span
                      v-if="isDeleting(e.index)"
                      class="loading loading-spinner loading-xs"
                    ></span>
                    <span v-else>Delete</span>
                  </button>
                </td>
              </tr>
              <tr v-if="!isLoading && !error && !entries.length">
                <td colspan="4" class="text-center opacity-70">No results</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Right: selected entry editor (also supports creating new entries) -->
        <div class="h-[60vh] overflow-y-auto">
          <fieldset
            class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4"
          >
            <legend class="fieldset-legend">Entry</legend>
            <div class="text-sm mb-2">
              <div>
                <span class="opacity-70">index:</span>
                <input
                  v-model.trim="selectedIndex"
                  class="input input-sm w-full font-mono"
                  placeholder="index (e.g. user/123)"
                />
              </div>
            </div>
            <textarea
              v-model="editorData"
              class="textarea w-full min-h-48 h-[42vh]"
              placeholder="Select a row to view/edit its data"
            />
            <div class="mt-2 flex items-center gap-2">
              <input
                ref="fileInput"
                type="file"
                class="hidden"
                @change="onFileChangeForEditor"
              />
              <button
                type="button"
                class="btn btn-sm"
                @click="pickFileForEditor"
              >
                Select file
              </button>
              <button
                class="btn btn-sm btn-primary"
                :disabled="editorBusy || !selectedIndex"
                @click="saveSelected"
              >
                Save
              </button>
              <span v-if="editorError" class="text-error text-sm">{{
                editorError
              }}</span>
            </div>
          </fieldset>
        </div>
      </div>

      <!-- Removed bottom next-page controls; page numbers shown above (kept removed) -->
    </section>
  </div>
</template>

<script setup>
import { computed, ref, inject, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useWallet } from "@/composables/useWallet";
import AddressDisplay from "@/components/AddressDisplay.vue";

const route = useRoute();
const router = useRouter();
const address = computed(
  () => route.meta?.resolvedAddress || route.params.address
);

const CHAIN_INFO = inject("chainInfo", {
  restUrl: "",
});

// File input for editor/new entry
const fileInput = ref(null);

const { sendMsg, normalizeCoin, loadDenomMetadata } = useWallet();

// Metrics state
const metrics = ref({
  owner: "",
  total_bytes: "",
  min_stake_amount: "",
  current_stake_amount: "",
});
const metricsError = ref("");

const minStakeDisplay = computed(() => {
  try {
    const n = normalizeCoin({
      amount: String(metrics.value.min_stake_amount || "0"),
      denom: "udys",
    });
    return { amount: n.display.amount, denom: n.display.denom };
  } catch {
    return {
      amount: String(metrics.value.min_stake_amount || "0"),
      denom: "udys",
    };
  }
});

const currentStakeDisplay = computed(() => {
  try {
    const n = normalizeCoin({
      amount: String(metrics.value.current_stake_amount || "0"),
      denom: "udys",
    });
    return { amount: n.display.amount, denom: n.display.denom };
  } catch {
    return {
      amount: String(metrics.value.current_stake_amount || "0"),
      denom: "udys",
    };
  }
});

function pickFileForEditor() {
  const el = fileInput.value;
  if (el) el.click();
}

function onFileChangeForEditor(e) {
  editorError.value = "";
  const el = e?.target;
  const file = el?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    editorData.value = String(reader.result || "");
  };
  reader.onerror = () => {
    editorError.value = "Failed to read file";
  };
  reader.readAsText(file);
}

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

// Selection/editor state
const selectedIndex = ref("");
const editorData = ref("");
const editorBusy = ref(false);
const editorError = ref("");
const deleting = ref(new Set());

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
    // Fetch metrics in parallel with list
    const metricsUrl = new URL(
      `${CHAIN_INFO.restUrl}/dysonprotocol/storage/v1/metrics`
    );
    metricsUrl.searchParams.set("owner", String(address.value));

    const listUrl = new URL(
      `${CHAIN_INFO.restUrl}/dysonprotocol/storage/v1/storage_list`
    );
    listUrl.searchParams.set("owner", String(address.value));
    listUrl.searchParams.set("pagination.count_total", "true");
    if (form.value.index_prefix)
      listUrl.searchParams.set("index_prefix", form.value.index_prefix);
    if (form.value.filter)
      listUrl.searchParams.set("filter", form.value.filter);
    if (form.value.extract)
      listUrl.searchParams.set("extract", form.value.extract);
    if (form.value.limit)
      listUrl.searchParams.set("pagination.limit", String(form.value.limit));
    if (form.value.offset)
      listUrl.searchParams.set("pagination.offset", String(form.value.offset));
    if (form.value.reverse)
      listUrl.searchParams.set("pagination.reverse", "true");

    const [metricsResp, listResp] = await Promise.all([
      fetch(metricsUrl.toString()),
      fetch(listUrl.toString()),
    ]);
    if (!metricsResp.ok) {
      metricsError.value = `HTTP ${metricsResp.status} ${metricsResp.statusText}`;
    } else {
      const m = await metricsResp.json();
      metrics.value = {
        owner: String(m?.owner || address.value || ""),
        total_bytes: String(m?.total_bytes || ""),
        min_stake_amount: String(m?.min_stake_amount || ""),
        current_stake_amount: String(m?.current_stake_amount || ""),
      };
      metricsError.value = "";
    }

    if (!listResp.ok)
      throw new Error(`HTTP ${listResp.status} ${listResp.statusText}`);
    const json = await listResp.json();
    const newEntries = Array.isArray(json?.entries) ? json.entries : [];
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

onMounted(async () => {
  await loadDenomMetadata();
});

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

// Infinite scroll removed in favor of numbered pages

function isSelected(e) {
  return selectedIndex.value && String(e?.index || "") === selectedIndex.value;
}

function selectEntry(e) {
  selectedIndex.value = String(e?.index || "");
  editorData.value = String(e?.data || "");
  editorError.value = "";
}

async function saveSelected() {
  editorError.value = "";
  if (!address.value) {
    editorError.value = "Missing owner address";
    return;
  }
  if (!selectedIndex.value) {
    editorError.value = "No entry selected";
    return;
  }
  editorBusy.value = true;
  try {
    const msg = {
      "@type": "/dysonprotocol.storage.v1.MsgStorageSet",
      owner: String(address.value),
      index: String(selectedIndex.value),
      data: String(editorData.value || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: String(address.value),
      gasLimit: "auto",
    });
    if (!res?.success) throw new Error(res?.rawLog || `code=${res?.code}`);
    await reload();
  } catch (e) {
    editorError.value = e?.message || "Failed to save";
  } finally {
    editorBusy.value = false;
  }
}

function isDeleting(index) {
  const key = String(index || "");
  return deleting.value.has(key);
}

async function deleteEntry(e) {
  editorError.value = "";
  if (!address.value) return;
  const index = String(e?.index || "");
  if (!index) return;
  const s = new Set(deleting.value);
  s.add(index);
  deleting.value = s;
  try {
    const msg = {
      "@type": "/dysonprotocol.storage.v1.MsgStorageDelete",
      owner: String(address.value),
      indexes: [index],
    };
    const res = await sendMsg({
      msg,
      executorAddress: String(address.value),
      gasLimit: "auto",
    });
    if (!res?.success) throw new Error(res?.rawLog || `code=${res?.code}`);
    if (selectedIndex.value === index) {
      selectedIndex.value = "";
      editorData.value = "";
    }
    await reload();
  } catch (err) {
    editorError.value = err?.message || "Failed to delete";
  } finally {
    const t = new Set(deleting.value);
    t.delete(index);
    deleting.value = t;
  }
}
</script>
