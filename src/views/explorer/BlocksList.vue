<template>
  <section class="w-full max-w-3xl mx-auto p-4 flex flex-col gap-6">
    <div class="flex items-center justify-between mb-2">
      <h1 class="text-2xl font-bold">Recent Blocks</h1>
      <!-- Pagination controls -->
      <div class="join">
        <button
          class="join-item btn btn-sm"
          :disabled="currentPage <= 1 || isLoading"
          @click="prevPage"
        >
          Prev
        </button>
        <button
          class="join-item btn btn-sm"
          :disabled="isLoading"
          @click="nextPage"
        >
          Next
        </button>
      </div>
    </div>
    <div class="overflow-x-auto shadow bg-base-200">
      <table class="table table-zebra w-full">
        <thead>
          <tr>
            <th>Height</th>
            <th>Timestamp</th>
            <th>Txs</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="block in blocks" :key="block.height">
            <td>
              <router-link
                :to="`/block/${block.height}`"
                class="link link-primary"
              >
                {{ block.height }}
              </router-link>
            </td>
            <td>{{ formatTimestamp(block.timestamp) }}</td>
            <td>{{ block.txCount }}</td>
            <td>
              <router-link
                :to="`/block/${block.height}`"
                class="btn btn-xs btn-outline"
                >View</router-link
              >
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="isLoading" class="flex justify-center items-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
      <div v-if="hasError" class="alert alert-error mt-4">
        {{ errorMessage }}
      </div>
      <div
        v-if="!isLoading && !blocks.length"
        class="text-base-content/60 italic p-4"
      >
        No blocks found.
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useExplorerStore } from "@/stores/explorerStore";

const explorerStore = useExplorerStore();

const currentPage = ref(1);
const pageSize = ref(20);

const blocks = computed(() => explorerStore.blocksList);
const isLoading = computed(() => explorerStore.isLoading);
const hasError = computed(() => explorerStore.hasError);
const errorMessage = computed(() => explorerStore.errorMessage);

const loadBlocks = async () => {
  try {
    await explorerStore.fetchBlocks(currentPage.value, pageSize.value);
  } catch (error) {
    console.error("Failed to load blocks:", error);
  }
};

const nextPage = async () => {
  currentPage.value++;
  await loadBlocks();
};

const prevPage = async () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    await loadBlocks();
  }
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

onMounted(() => {
  loadBlocks();
});
</script>
