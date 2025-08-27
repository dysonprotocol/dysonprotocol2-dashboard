<template>
  <AddressNavigation :address="address" />
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import AddressNavigation from "@/components/AddressNavigation.vue";

const route = useRoute();
const address = computed(
  () => route.meta?.resolvedAddress || route.params.address
);
</script>
