<template>
  <div class="p-4 space-y-4">
    <h2 class="text-xl font-semibold">Offers by {{ address }}</h2>
    <div class="text-sm text-muted-foreground" v-if="isLoading">Loading…</div>
    <div v-else>
      <div v-if="offers.length === 0" class="text-sm">No offers.</div>
      <ul v-else class="space-y-2">
        <li v-for="o in offers" :key="o.offer_id" class="rounded-md border p-2">
          <RouterLink
            :to="{ name: 'WhaleswapOffer', params: { offerId: o.offer_id } }"
            class="hover:underline"
          >
            Offer #{{ o.offer_id }} — {{ o.status }}
          </RouterLink>
          <div class="text-xs text-muted-foreground">
            have {{ o.remaining_have?.amount }} {{ o.remaining_have?.denom }} / want
            {{ o.remaining_want?.amount }} {{ o.remaining_want?.denom }}
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import WhaleswapOffer from '@/orm/models/whaleswap/Offer'

const route = useRoute()
const address = computed(() => String(route.params.address || ''))
const isLoading = ref(false)

const offerApi = useAxiosRepo(WhaleswapOffer).api()
const offerRepo = useRepo(WhaleswapOffer)
const offers = computed(() =>
  (offerRepo.all() as Array<Record<string, any>>).filter((o) => o.maker === address.value)
)

async function load() {
  if (!address.value) return
  isLoading.value = true
  try {
    await offerApi.fetchOffersByOwner({ owner: address.value, limit: '50' })
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
watch(() => address.value, load)
</script>
