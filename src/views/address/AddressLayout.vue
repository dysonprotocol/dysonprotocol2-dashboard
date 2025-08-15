<template>
  <div class="h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
    <div class="bg-base-100 shadow-sm border-b flex-col items-start gap-2">
      <!-- Address and current tab -->
      <div class="text-sm p-2 flex items-center gap-2">
        <router-link
          v-if="name"
          class="btn btn-sm"
          :to="`/names/${encodeURIComponent(name)}`"
        >
          {{ name }}
        </router-link>
        <AddressDisplay :address="address" :truncate="0" />
      </div>
      <!-- Menu links -->
      <div class="flex-none w-full md:w-auto">
        <ul class="menu menu-horizontal p-0">
          <li v-for="tab in addressTabsInjected" :key="tab.path">
            <router-link
              :to="linkForTab(tab.path)"
              class="p-2"
              :class="{ 'text-primary font-medium': currentTab === tab.path }"
            >
              {{ tab.name }}
            </router-link>
          </li>
        </ul>
      </div>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto p-2">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from "vue";
import { useRoute } from "vue-router";
import AddressDisplay from "@/components/AddressDisplay.vue";

const route = useRoute();

const name = computed(() => String(route.params.name || ""));
const address = computed(() =>
  String(route.meta?.resolvedAddress || route.params.address || "")
);

// Provided by App.vue or overridden by DestinationLayout
const addressTabsInjected = inject("addressTabs", []);
const computeCurrentTabInjected = inject("computeCurrentTab", null);
const currentTab = computed(() =>
  typeof computeCurrentTabInjected === "function"
    ? String(computeCurrentTabInjected(route) || "")
    : String(route.path.split("/")[3] || "")
);

const currentTabLabel = computed(() => {
  const seg = currentTab.value;
  const tabs = Array.isArray(addressTabsInjected) ? addressTabsInjected : [];
  const found = tabs.find((t) => String(t.path) === seg);
  return found?.name || seg || "Summary";
});

const customLinkBuilder = inject("addressLinkBuilder", null);
function linkForTab(path) {
  const p = String(path || "");
  if (typeof customLinkBuilder === "function") return customLinkBuilder(p);
  return `/address/${encodeURIComponent(address.value)}/${p}`;
}
</script>

<style scoped></style>
