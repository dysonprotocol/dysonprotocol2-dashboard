<template>
  <AddressLayout />
  <!-- Children will render inside AddressLayout's router-view -->
</template>

<script setup>
import { provide, inject, computed } from "vue";
import { useRoute } from "vue-router";
import AddressLayout from "@/views/address/AddressLayout.vue";

const route = useRoute();
const name = computed(() => String(route.params.name || ""));
const address = computed(() => String(route.meta?.resolvedAddress || ""));

function destinationLinkBuilder(path) {
  const p = String(path || "");
  return `/names/${encodeURIComponent(name.value)}/destination/${p}`;
}

function computeCurrentTabForDestination(r) {
  const parts = String(r.path || "").split("/");
  const idx = parts.indexOf("destination");
  if (idx >= 0) return String(parts[idx + 1] || "");
  return "";
}

provide("addressLinkBuilder", destinationLinkBuilder);
provide("computeCurrentTab", computeCurrentTabForDestination);
provide("addressResolved", address);

// Reuse the base address tabs without an extra "NFT Classes" tab
const baseTabs = inject("addressTabs", []);
provide("addressTabs", baseTabs);
</script>
