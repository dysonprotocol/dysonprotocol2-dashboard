<template>
  <div class="p-4 space-y-2">
    <h2 class="text-xl font-semibold">Offer #{{ offerId }}</h2>
    <div class="rounded-md border p-3">
      <OfferTakeForm :offer-id-prop="offerId" />
    </div>
    <pre class="text-xs overflow-auto">{{ JSON.stringify(offer, null, 2) }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import WhaleswapOffer from '@/orm/models/whaleswap/Offer'
import OfferTakeForm from '@/components/whaleswap/forms/OfferTakeForm.vue'

const route = useRoute()
const offerId = computed(() => String(route.params.offerId || ''))
const api = useAxiosRepo(WhaleswapOffer).api()
const repo = useRepo(WhaleswapOffer)
const offer = computed(() => repo.find(offerId.value) || {})

onMounted(() => {
  if (offerId.value) api.fetchOffer(offerId.value)
})
</script>
