<template>
  <div class="space-y-6 p-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-base-content">Transaction Explorer</h1>
      <p class="text-base-content/60">
        Search and explore blockchain transactions
      </p>
    </div>

    <!-- Search Form -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Search Transactions</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Column 1: Query + Options -->
          <form @submit.prevent="handleSearch" class="space-y-4">
            <!-- Query Input -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Query</span>
              </label>
              <input
                v-model="searchForm.query"
                type="text"
                placeholder="e.g. tx.height=123"
                class="input input-bordered w-full"
              />
            </div>

            <!-- Advanced Options (always visible) -->
            <div class="bg-base-200 rounded-box p-4">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Order By -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Order By</span>
                  </label>
                  <select
                    v-model="searchForm.orderBy"
                    class="select select-bordered"
                  >
                    <option value="ORDER_BY_DESC">Newest First</option>
                    <option value="ORDER_BY_ASC">Oldest First</option>
                  </select>
                </div>

                <!-- Page Size -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Results per page</span>
                  </label>
                  <select
                    v-model="searchForm.limit"
                    class="select select-bordered"
                  >
                    <option :value="10">10</option>
                    <option :value="25">25</option>
                    <option :value="50">50</option>
                    <option :value="100">100</option>
                  </select>
                </div>

                <!-- Page -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Page</span>
                  </label>
                  <input
                    v-model.number="searchForm.page"
                    type="number"
                    min="1"
                    class="input input-bordered"
                  />
                </div>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="card-actions">
              <button
                type="submit"
                class="btn btn-primary"
                :class="{ loading: isLoading }"
                :disabled="isLoading"
              >
                <MagnifyingGlassIcon v-if="!isLoading" class="w-4 h-4 mr-2" />
                Search Transactions
              </button>
              <button
                v-if="hasResults"
                type="button"
                @click="clearResults"
                class="btn btn-ghost"
              >
                Clear Results
              </button>
            </div>
          </form>

          <!-- Column 2: Quick Links -->
          <div>
            <div class="font-semibold mb-3">Quick Links</div>
            <div
              v-if="wallets.length === 0"
              class="text-sm text-base-content/60"
            >
              Connect or unlock a wallet to see quick links.
            </div>
            <div v-else class="space-y-4">
              <div
                v-for="(w, idx) in wallets"
                :key="w.address || idx"
                class="rounded-box border border-base-300 p-4"
              >
                <div class="text-sm font-medium mb-2">
                  {{ w.name }} — {{ w.address }}
                </div>
                <ul class="space-y-2 text-sm">
                  <li>
                    <button
                      class="link"
                      @click="applyQuickQuery(`message.sender='${w.address}'`)"
                    >
                      All Transactions
                    </button>
                  </li>
                  <li>
                    <button
                      class="link"
                      @click="
                        applyQuickQuery(`coin_spent.spender='${w.address}'`)
                      "
                    >
                      Coins sent from
                    </button>
                  </li>
                  <li>
                    <button
                      class="link"
                      @click="
                        applyQuickQuery(`coin_received.receiver='${w.address}'`)
                      "
                    >
                      Coins sent to
                    </button>
                  </li>
                  <li>
                    <button
                      class="link"
                      @click="
                        applyQuickQuery(
                          `dysonprotocol.script.v1.EventExecScript.executor_address='\u0022${w.address}\u0022'`
                        )
                      "
                    >
                      All scripts this address has called
                    </button>
                  </li>
                  <li>
                    <button
                      class="link"
                      @click="
                        applyQuickQuery(
                          `dysonprotocol.script.v1.EventExecScript.script_address='\u0022${w.address}\u0022'`
                        )
                      "
                    >
                      All addresses that have called this script
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
      <p class="mt-4 text-base-content/60">Searching transactions...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="alert alert-error">
      <span>Error: {{ error }}</span>
    </div>

    <!-- Results -->
    <div v-else-if="searchResults" class="space-y-4">
      <!-- Pruned history warning -->
      <div v-if="limitedFromHeight" class="alert alert-warning">
        <span>
          This node serves cometbft transactions starting from height
          {{ limitedFromHeight }}. Your search was adjusted to include
          <code class="px-1">tx.height&gt;={{ limitedFromHeight }}</code
          >. Note, this is managed by the node's
          <code>min-retain-blocks</code> setting and is different from the
          <code>pruning</code> settings.
        </span>
      </div>
      <!-- Results Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold">
          Search Results ({{ searchResults.tx_responses?.length || 0 }}
          transactions)
        </h2>
        <div v-if="searchResults.total" class="text-sm text-base-content/60">
          Total: {{ searchResults.total }}
        </div>
      </div>

      <!-- Transaction List -->
      <div v-if="searchResults.tx_responses?.length > 0" class="space-y-4">
        <div
          v-for="(tx, index) in searchResults.tx_responses"
          :key="tx.txhash || index"
        >
          <DisplayTx :txData="toTxData(tx)" />
        </div>
      </div>

      <!-- No Results -->
      <div v-else class="text-center py-12">
        <p class="text-base-content/60">
          No transactions found matching your search criteria.
        </p>
      </div>

      <!-- Pagination -->
      <div
        v-if="searchResults.tx_responses?.length > 0"
        class="flex justify-center mt-8"
      >
        <div class="join">
          <button
            class="join-item btn"
            :disabled="searchForm.page <= 1"
            @click="goToPage(searchForm.page - 1)"
          >
            Previous
          </button>
          <button class="join-item btn btn-active">
            Page {{ searchForm.page }}
          </button>
          <button
            class="join-item btn"
            :disabled="!hasNextPage"
            @click="goToPage(searchForm.page + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { MagnifyingGlassIcon } from "@heroicons/vue/20/solid";
import { useRoute, useRouter } from "vue-router";
import { useExplorerStore } from "@/stores/explorerStore";
import { useWallet } from "@/composables/useWallet";
import DisplayTx from "@/components/explorer/DisplayTx.vue";

const explorerStore = useExplorerStore();
const route = useRoute();
const router = useRouter();
const { unlockedWallets } = useWallet();
const wallets = computed(() => unlockedWallets.value || []);

// Form state
const searchForm = ref({
  query: "",
  orderBy: "ORDER_BY_DESC",
  limit: 25,
  page: 1,
});

// UI state
const isLoading = ref(false);
const error = ref(null);
const searchResults = ref(null);
const limitedFromHeight = ref(null);

// Computed properties
const hasResults = computed(() => searchResults.value !== null);
const hasNextPage = computed(() => {
  if (!searchResults.value?.tx_responses) return false;
  return searchResults.value.tx_responses.length === searchForm.value.limit;
});

// Methods
const runSearch = async () => {
  if (!searchForm.value.query.trim()) return;

  isLoading.value = true;
  error.value = null;

  try {
    const results = await explorerStore.searchTransactions({
      query: searchForm.value.query.trim(),
      orderBy: searchForm.value.orderBy,
      limit: searchForm.value.limit,
      page: searchForm.value.page,
    });

    searchResults.value = results;
    limitedFromHeight.value = results.limitedFromHeight || null;
  } catch (err) {
    console.error("Transaction search failed:", err);
    error.value = err.message || "Failed to search transactions";
  } finally {
    isLoading.value = false;
  }
};

const handleSearch = () => {
  if (!searchForm.value.query.trim()) return;
  // New searches start from page 1
  searchForm.value.page = 1;
  router.push({
    query: {
      ...route.query,
      query: searchForm.value.query.trim(),
      page: String(searchForm.value.page),
    },
  });
};

const clearResults = () => {
  searchResults.value = null;
  error.value = null;
  searchForm.value.page = 1;
  router.push({ query: { ...route.query, query: undefined } });
};

const goToPage = (page) => {
  searchForm.value.page = page;
  router.push({
    query: {
      ...route.query,
      query: searchForm.value.query.trim(),
      page: String(searchForm.value.page),
    },
  });
};

const formatTimestamp = (timestamp) => new Date(timestamp).toLocaleString();
const formatNumber = (num) => new Intl.NumberFormat().format(parseInt(num));
const toTxData = (tx) => ({
  hash: tx.txhash,
  height: Number(tx.height),
  gas_used: tx.gas_used,
  gas_wanted: tx.gas_wanted,
  fee: tx.tx?.auth_info?.fee?.amount,
  code: tx.code,
  raw_log: tx.raw_log,
  timestamp: tx.timestamp,
  memo: tx.tx?.body?.memo,
  messages: tx.tx?.body?.messages,
  events: tx.logs?.flatMap((l) => l.events) || [],
});

// React to URL query changes to support deep linking and back/forward navigation
watch(
  () => ({ q: route.query.query, p: route.query.page }),
  ({ q, p }) => {
    if (typeof q === "string" && q.trim()) {
      searchForm.value.query = q;
      const pageFromRoute = Number(p);
      searchForm.value.page =
        Number.isFinite(pageFromRoute) && pageFromRoute > 0 ? pageFromRoute : 1;
      runSearch();
      return;
    }
    // No query present → clear view
    searchResults.value = null;
    error.value = null;
  },
  { immediate: true }
);

const applyQuickQuery = (q) => {
  if (!q || typeof q !== "string") return;
  searchForm.value.query = q;
  searchForm.value.page = 1;
  router.push({
    query: {
      ...route.query,
      query: q,
      page: String(searchForm.value.page),
    },
  });
};
</script>
