<template>
  <section class="w-full max-w-4xl mx-auto p-4 flex flex-col gap-6">
    <!-- Breadcrumb Navigation -->
    <div class="breadcrumbs text-sm">
      <ul>
        <li>
          <router-link
            to="/blocks"
            class="link link-hover"
          >
            Explorer
          </router-link>
        </li>
        <li>Transaction</li>
        <li class="text-base-content/60">
          {{ truncatedHash }}
        </li>
      </ul>
    </div>

    <!-- Transaction Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-2xl font-bold">
          Transaction Details
        </h1>
        <div class="text-sm text-base-content/60 mt-1 font-mono break-all">
          <TxHashDisplay
            :hash="hash"
            :truncate="12"
            clickable
            status="success"
          />
        </div>
      </div>
      <div
        v-if="txData?.height"
        class="flex gap-2"
      >
        <router-link
          :to="`/block/${txData.height}`"
          class="btn btn-sm btn-outline"
        >
          View Block {{ txData.height }}
        </router-link>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="flex justify-center items-center py-12"
    >
      <span class="loading loading-spinner loading-lg" />
    </div>

    <!-- Error State -->
    <div
      v-else-if="hasError"
      class="alert alert-error"
    >
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Transaction Data -->
    <DisplayTx
      v-else-if="txData"
      :tx-data="txData"
    />

    <!-- Not Found State -->
    <div
      v-else
      class="alert alert-warning"
    >
      <span>Transaction {{ hash }} not found.</span>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useExplorerStore } from "@/stores/explorerStore";
import DisplayTx from "@/components/explorer/DisplayTx.vue";
import TxHashDisplay from "@/components/TxHashDisplay.vue";

const route = useRoute();
const explorerStore = useExplorerStore();

const txData = ref(null);

const hash = computed(() => {
  const h = route.params.hash;
  return Array.isArray(h) ? h[0] : h;
});

const truncatedHash = computed(() => {
  if (!hash.value) return "";
  return `${hash.value.slice(0, 8)}...${hash.value.slice(-8)}`;
});

const isLoading = computed(() => explorerStore.isLoading);
const hasError = computed(() => explorerStore.hasError);
const errorMessage = computed(() => explorerStore.errorMessage);

const isValidHash = computed(() => {
  if (!hash.value) return false;
  // Basic validation: should be a hex string, typically 64 characters for SHA256
  const hexRegex = /^[a-fA-F0-9]{64}$/;
  return hexRegex.test(hash.value);
});

const fetchTransaction = async () => {
  if (!hash.value) {
    return;
  }

  if (!isValidHash.value) {
    explorerStore.error = new Error("Invalid transaction hash format");
    return;
  }

  try {
    // Fetch from API via explorer store
    const tx = await explorerStore.fetchTxByHash(hash.value);
    txData.value = tx;
  } catch (error) {
    console.error("Failed to fetch transaction:", error);
  }
};

onMounted(() => {
  fetchTransaction();
});

watch(() => route.params.hash, fetchTransaction);
</script>
