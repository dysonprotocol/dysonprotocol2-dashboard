<template>
  <section class="w-full max-w-4xl mx-auto p-4 flex flex-col gap-6">
    <!-- Breadcrumb Navigation -->
    <div class="breadcrumbs text-sm">
      <ul>
        <li>
          <router-link to="/blocks" class="link link-hover">Blocks</router-link>
        </li>
        <li>Block {{ height }}</li>
      </ul>
    </div>

    <!-- Block Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Block {{ height }}</h1>
      <div class="flex gap-2">
        <router-link
          v-if="prevHeight"
          :to="`/block/${prevHeight}`"
          class="btn btn-sm btn-outline"
        >
          ← Prev
        </router-link>
        <router-link
          v-if="nextHeight"
          :to="`/block/${nextHeight}`"
          class="btn btn-sm btn-outline"
        >
          Next →
        </router-link>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Error State -->
    <div v-else-if="hasError" class="alert alert-error">
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Block Data -->
    <DisplayBlock v-else-if="blockData" :blockData="blockData" />

    <!-- Not Found State -->
    <div v-else class="alert alert-warning">
      <span>Block {{ height }} not found.</span>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useExplorerStore } from "@/stores/explorerStore";
import DisplayBlock from "@/components/explorer/DisplayBlock.vue";

const route = useRoute();
const explorerStore = useExplorerStore();

const blockData = ref(null);

const height = computed(() => {
  const h = route.params.height;
  return Array.isArray(h) ? h[0] : h;
});

const heightNumber = computed(() => parseInt(height.value || "0", 10));

const prevHeight = computed(() => {
  const prev = heightNumber.value - 1;
  return prev > 0 ? prev : null;
});

const nextHeight = computed(() => {
  // Will be determined by latest block height from store
  // For now, just allow navigation forward
  return heightNumber.value + 1;
});

const isLoading = computed(() => explorerStore.isLoading);
const hasError = computed(() => explorerStore.hasError);
const errorMessage = computed(() => explorerStore.errorMessage);

const fetchBlock = async () => {
  if (!height.value || isNaN(heightNumber.value)) {
    return;
  }

  try {
    // Fetch from API
    const block = await explorerStore.fetchBlockByHeight(heightNumber.value);
    blockData.value = block;
  } catch (error) {
    console.error("Failed to fetch block:", error);
  }
};

onMounted(() => {
  fetchBlock();
});

watch(() => route.params.height, fetchBlock);
</script>
