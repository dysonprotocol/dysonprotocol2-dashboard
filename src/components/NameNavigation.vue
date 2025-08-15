<template>
  <div class="tabs tabs-boxed">
    <router-link
      v-for="tab in tabs"
      :key="tab.path"
      :to="buildTo(tab.path)"
      class="tab"
      :class="{ 'tab-active': activeTop === tab.path }"
    >
      {{ tab.name }}
    </router-link>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const props = defineProps({
  name: { type: String, required: true },
  tabs: { type: Array, default: () => [] },
});

const route = useRoute();
const activeTop = computed(() => {
  const seg = String(route.path.split("/")[3] || "");
  return seg === "destination" ? "destination" : seg === "nfts" ? "nfts" : "";
});

function buildTo(path) {
  const seg = String(path || "");
  if (seg === "nfts") return `/names/${encodeURIComponent(props.name)}/nfts`;
  if (seg === "destination")
    return `/names/${encodeURIComponent(props.name)}/destination/coins`;
  if (seg.startsWith("destination/"))
    return `/names/${encodeURIComponent(props.name)}/${seg.replace(
      /^destination\//,
      ""
    )}`;
  return `/names/${encodeURIComponent(props.name)}/${seg}`;
}
</script>
