<template>
  <div class="p-4 space-y-4">
    <h2 class="text-xl font-semibold">Pools for {{ address }}</h2>
    <div class="rounded-md border p-3">
      <PoolCreateForm :base-denoms="[]" :creator-default="address" />
    </div>
    <div class="text-sm text-muted-foreground" v-if="isLoading">Loading…</div>
    <div v-else>
      <div v-if="pools.length === 0" class="text-sm">No pools.</div>
      <ul v-else class="space-y-2">
        <li v-for="p in pools" :key="p.pool_id" class="rounded-md border p-2">
          <RouterLink
            :to="{ name: 'WhaleswapPool', params: { poolId: p.pool_id } }"
            class="hover:underline"
          >
            Pool #{{ p.pool_id }} — fee {{ p.fee_pct }}
          </RouterLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import PoolCreateForm from '@/components/whaleswap/forms/PoolCreateForm.vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import WhaleswapPool from '@/orm/models/whaleswap/Pool'

const route = useRoute()
const address = computed(() => String(route.params.address || ''))
const isLoading = ref(false)

const poolApi = useAxiosRepo(WhaleswapPool).api()
const poolRepo = useRepo(WhaleswapPool)
const pools = computed(() => poolRepo.all() as Array<Record<string, any>>)

async function load() {
  if (!address.value) return
  isLoading.value = true
  try {
    await poolApi.fetchPoolsByOwner(address.value, { limit: '50' })
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
watch(() => address.value, load)
</script>
