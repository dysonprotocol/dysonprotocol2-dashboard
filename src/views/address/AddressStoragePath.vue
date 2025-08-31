<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold">
      Storage Get — <code>{{ address }}</code>
    </h2>
    <div class="grid gap-2 md:grid-cols-3">
      <input
        v-model="indexModel"
        class="input w-full"
        placeholder="index"
      >
      <input
        v-model="extractModel"
        class="input w-full"
        placeholder="extract (optional)"
      >
      <button
        class="btn btn-primary"
        @click="fetchOne"
      >
        Fetch
      </button>
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

    <form
      class="grid md:grid-cols-3 gap-2 items-end"
      @submit.prevent="submitSet"
    >
      <div>
        <label class="text-xs">Set data</label>
        <input
          v-model="setData"
          class="input w-full"
          placeholder="string data"
        >
      </div>
      <div class="text-xs opacity-70">
        Owner: <code>{{ address }}</code>
      </div>
      <button
        class="btn btn-primary"
        type="submit"
        :disabled="!canSet"
      >
        Set
      </button>
    </form>

    <div>
      <button
        class="btn btn-warning btn-sm"
        :disabled="!canDelete"
        @click="submitDelete"
      >
        Delete
      </button>
    </div>

    <div
      v-if="error"
      class="text-sm text-red-600"
    >
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import Storage from '@/orm/models/storage/Storage'
import { useWallet } from '@/composables/useWallet'

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

// Set/Delete actions
const wallet = useWallet()
const setData = ref('')
const canSet = computed(() => Boolean(props.address && indexModel.value && setData.value))
const canDelete = computed(() => Boolean(props.address && indexModel.value))

async function submitSet() {
  error.value = ''
  if (!canSet.value) return
  await useAxiosRepo(Storage)
    .api()
    .storageSet({
      owner: props.address,
      index: indexModel.value,
      data: setData.value,
      wallet: { sendMsg: wallet.sendMsg },
      gasLimit: 'auto',
    })
  setData.value = ''
  await fetchOne()
}

async function submitDelete() {
  error.value = ''
  if (!canDelete.value) return
  await useAxiosRepo(Storage)
    .api()
    .storageDelete({
      owner: props.address,
      indexes: [indexModel.value],
      wallet: { sendMsg: wallet.sendMsg },
      gasLimit: 'auto',
    })
  await fetchOne()
}
</script>
