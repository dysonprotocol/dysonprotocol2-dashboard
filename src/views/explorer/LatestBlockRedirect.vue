<template>
  <div v-if="isLoading" class="flex justify-center items-center py-12">
    <span class="loading loading-spinner loading-lg" />
  </div>
  
  <div v-else-if="error" class="alert alert-error">
    <span>{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import LatestBlock from '@/orm/models/base/TendermintService'

const router = useRouter()
const blockApi = useAxiosRepo(LatestBlock).api()
const blockRepo = useRepo(LatestBlock)

const isLoading = ref(true)
const error = ref<string | null>(null)

async function redirectToLatest() {
  try {
    await blockApi.fetch()
    
    // Get the latest block from the repo
    const latestBlock = blockRepo.all()[0] as any
    
    if (latestBlock?.height) {
      await router.replace(`/block/${latestBlock.height}`)
    } else {
      error.value = 'Could not find latest block'
    }
  } catch (e) {
    console.error('Failed to fetch latest block:', e)
    error.value = 'Failed to fetch latest block'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  redirectToLatest()
})
</script>
