<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">Function: {{ functionName }}</h2>
    <p class="text-sm text-gray-600 mb-4">Execute function for {{ address }}</p>

    <div class="bg-base-200 p-4">
      <h3 class="font-medium mb-2">Function Parameters</h3>
      <p class="text-sm">Function execution form coming soon</p>
      <p class="text-xs text-gray-500">
        Args: {{ route.query.args || "none" }}
      </p>
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
const functionName = computed(() => route.params.functionName);
</script>
