<template>
  <div class="tabs tabs-boxed">
    <router-link
      v-for="tab in tabs"
      :key="tab.name"
      :to="`/address/${address}/${tab.path}`"
      class="tab"
      :class="{ 'tab-active': currentTab === tab.path }"
    >
      {{ tab.name }}
    </router-link>
  </div>
</template>

<script setup>
defineProps({
  address: String,
  tabs: {
    type: Array,
    default: () => [],
  },
  currentTab: {
    type: String,
    default: "",
  },
});
</script>
