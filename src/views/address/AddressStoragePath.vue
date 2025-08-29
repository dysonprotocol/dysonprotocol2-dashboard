<template>
  <h2 class="text-xl font-semibold">
    Storage Get — <code>{{ address }}</code>
  </h2>
  <div class="grid gap-2 md:grid-cols-3">
    <input v-model="indexModel" class="input w-full" placeholder="index" />
    <input v-model="extractModel" class="input w-full" placeholder="extract (optional)" />
    <button class="btn btn-primary" @click="fetchOne">Fetch</button>
  </div>
  <div class="text-xs opacity-70 grid grid-cols-2 gap-x-2">
    <div>
      hash=<code>{{ hash }}</code>
    </div>
    <div>
      height=<code>{{ height }}</code>
    </div>
  </div>
  <div class="text-xs opacity-70">
    data=<code class="break-words">{{ data }}</code>
  </div>
  <div v-if="error" class="text-sm text-red-600">{{ error }}</div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import Storage from '@/orm/models/storage/Storage'

const props = defineProps<{ address: string; pathMatch?: string }>()

const repo = useRepo(Storage)
const indexModel = ref('')
const extractModel = ref('')
const error = ref('')

const entry = computed(() => (repo.find([props.address, indexModel.value]) as any) || null)
const hash = computed(() => entry.value?.hash || '')
const height = computed(() => entry.value?.updated_height || '')
const data = computed(() => entry.value?.data || '')

async function fetchOne() {
  error.value = ''
  if (!props.address || !indexModel.value.trim()) return
  try {
    await useAxiosRepo(Storage)
      .api()
      .storageGet({
        owner: props.address,
        index: indexModel.value,
        extract: extractModel.value || undefined,
      })
  } catch (e: any) {
    console.error(e)
    error.value = e?.message || String(e)
  }
}

watchEffect(() => {
  const raw = props.pathMatch || ''
  const [idx, ext] = raw.split('/').map((s) => s.trim())
  indexModel.value = idx || ''
  extractModel.value = ext || ''
  if (indexModel.value) void fetchOne()
})
</script>
