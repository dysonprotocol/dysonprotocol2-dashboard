<template>
  <div>
    <NuancePost :post="post" :post-id="id" :tag="tag" />
  </div>
</template>

<script setup>
import NuancePost from "./NuancePost.vue";

defineProps({
  tag: { type: String, required: true },
  id: { type: Number, required: true },
  post: { type: Object, required: true },
});
</script>


