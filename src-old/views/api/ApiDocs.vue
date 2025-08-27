<template>
  <div class="max-w-6xl mx-auto p-4 space-y-4">
    <div class="flex items-center gap-3">
      <input
        v-model="q"
        type="text"
        placeholder="Search schemas..."
        class="input input-bordered w-full"
      />
      <select v-model="activeGroup" class="select select-bordered">
        <option value="all">All</option>
        <option value="query">query</option>
        <option value="tx">tx</option>
      </select>
    </div>

    <div v-if="loading" class="flex justify-center py-10">
      <span class="loading loading-spinner"></span>
    </div>

    <div v-else class="space-y-2">
      <SchemaCollapseItem
        v-for="item in filtered"
        :key="item.key"
        :title="item.key"
        :group="item.group"
        :path="item.path"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import SchemaCollapseItem from "@/components/forms/SchemaCollapseItem.vue";

const q = ref("");
const activeGroup = ref("all");
const loading = ref(true);
const items = ref([]);

const filtered = computed(() => {
  const needle = q.value.trim().toLowerCase();
  return items.value.filter((it) => {
    if (activeGroup.value !== "all" && it.group !== activeGroup.value)
      return false;
    if (!needle) return true;
    return (
      it.key.toLowerCase().includes(needle) ||
      it.path.toLowerCase().includes(needle)
    );
  });
});

async function fetchIndex() {
  const res = await fetch("/proto-json-schema/index.json");
  const index = await res.json();
  const out = [];
  for (const entry of index[0].contents) {
    if (entry.type !== "directory") continue;
    const group = entry.name; // query or tx
    for (const f of entry.contents) {
      if (f.type !== "file" || !f.name.endsWith(".json")) continue;
      const path = `/proto-json-schema/${group}/${f.name}`;
      out.push({ key: f.name.replace(/\.json$/, ""), path, group });
    }
  }
  items.value = out;
}

onMounted(async () => {
  await fetchIndex();
  loading.value = false;
});
</script>
