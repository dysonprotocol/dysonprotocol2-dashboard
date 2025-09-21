<template>
  <div class="space-y-3">
    <div class="flex gap-2 items-end">
      <label class="text-sm">
        Denom
        <input v-model="denom" class="input input-sm ml-2" placeholder="denom" />
      </label>
      <button class="btn btn-sm" @click="load">Search</button>
    </div>
    <div class="text-sm text-muted-foreground" v-if="isLoading">Loading…</div>
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import WhaleswapPool from '@/orm/models/whaleswap/Pool'

const denom = ref('')
const isLoading = ref(false)
const poolApi = useAxiosRepo(WhaleswapPool).api()
const poolRepo = useRepo(WhaleswapPool)
const pools = computed(() => poolRepo.all() as Array<Record<string, any>>)

async function load() {
  isLoading.value = true
  try {
    if (denom.value) await poolApi.fetchPoolsByDenom(denom.value, { limit: '50' })
    else await poolApi.fetchPools({ limit: '50' })
  } finally {
    isLoading.value = false
  }
}

load()
</script>
