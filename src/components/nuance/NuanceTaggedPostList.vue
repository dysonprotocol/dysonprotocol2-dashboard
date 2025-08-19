<template>
  <section>
    <span v-if="error" class="text-error">{{ error }}</span>
    <span v-else-if="loading">Loading…</span>
    <ul role="list" class="divide-y divide-gray-200 dark:divide-white/10">
      <li v-for="it in items" :key="`${it.rating}-${it.tag}-${it.paddedId}`">
        <NuanceTaggedPost
          :tag="it.tag"
          :id="it.id"
          :post="it.post || placeholderPost"
        />
      </li>
      <li v-if="!loading && !error && items.length === 0" class="opacity-70">
        No posts
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useNuanceStore } from "@/stores/nuanceStore";
import NuanceTaggedPost from "./NuanceTaggedPost.vue";

const props = defineProps({
  tag: { type: String, required: true },
  rating: { type: String, required: true }, // initial: 'hot' | 'best'
  limit: { type: Number, default: 20 },
});

const store = useNuanceStore();

const activeRating = ref(props.rating);
const state = computed(() => store.getList(props.tag, activeRating.value));
const items = computed(() => store.getViewItems(props.tag, activeRating.value));
const loading = computed(() => state.value.loading);
const error = computed(() => state.value.error);
const nextKey = computed(() => state.value.nextKey);

const placeholderPost = {
  post_id: "",
  author: "",
  content: "",
  created_time: "",
};

onMounted(() => {
  store.loadInitial(props.tag, activeRating.value, props.limit);
});

watch(
  () => activeRating.value,
  () => {
    store.loadInitial(props.tag, activeRating.value, props.limit);
  }
);

function setRating(r) {
  if (activeRating.value === r) return;
  activeRating.value = r;
}
</script>
