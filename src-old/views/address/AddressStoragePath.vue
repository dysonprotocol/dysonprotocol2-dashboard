<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">Storage Path</h2>
    <p class="text-sm text-gray-600 mb-4">{{ address }}/{{ storagePath }}</p>

    <div class="bg-base-200 p-4">
      <p class="text-sm">Storage path viewer coming soon</p>
      <p class="text-xs text-gray-500">Path: {{ storagePath || "root" }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const address = computed(
  () => route.meta?.resolvedAddress || route.params.address
);
const storagePath = computed(() => route.params.pathMatch);
</script>
