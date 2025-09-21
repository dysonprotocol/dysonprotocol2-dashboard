<template>
  <div class="space-y-3">
    <div class="flex gap-2 items-end">
      <label class="text-sm">
        Have
        <input v-model="have" class="input input-sm ml-2" placeholder="denom" />
      </label>
      <label class="text-sm">
        Want
        <input v-model="want" class="input input-sm ml-2" placeholder="denom" />
      </label>
      <button class="btn btn-sm" @click="load">Search</button>
    </div>
    <div class="text-sm text-muted-foreground" v-if="isLoading">Loading…</div>
    <ul v-else class="space-y-2">
      <li v-for="o in offers" :key="o.offer_id" class="rounded-md border p-2">
        <RouterLink
          :to="{ name: 'WhaleswapOffer', params: { offerId: o.offer_id } }"
          class="hover:underline"
        >
          Offer #{{ o.offer_id }} — {{ o.status }}
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import WhaleswapOffer from '@/orm/models/whaleswap/Offer'

const have = ref('')
const want = ref('')
const isLoading = ref(false)
const offerApi = useAxiosRepo(WhaleswapOffer).api()
const offerRepo = useRepo(WhaleswapOffer)
const offers = computed(() => offerRepo.all() as Array<Record<string, any>>)

async function load() {
  isLoading.value = true
  try {
    await offerApi.fetchOffers({
      have_denom: have.value || undefined,
      want_denom: want.value || undefined,
      limit: '50',
    })
  } finally {
    isLoading.value = false
  }
}

load()
</script>
