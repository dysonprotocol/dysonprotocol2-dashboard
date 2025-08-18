<template>
  <div class="p-4">
    <div class="text-center mb-6">
      <h1 class="text-4xl font-bold mb-2">Dys2</h1>
      <p class="text-lg text-gray-600">Make Dwapps, get Paid.</p>
    </div>

    <div class="grid md:grid-cols-1 gap-6">
      <NuanceTaggedPostList tag="dys" rating="hot" :limit="20" />
    </div>
  </div>
  
</template>

<script setup>
import NuanceTaggedPostList from "@/components/nuance/NuanceTaggedPostList.vue";
</script>
