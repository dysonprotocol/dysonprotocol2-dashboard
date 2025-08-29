<template>
  <div class="">
    <h2 class="text-xl font-semibold">
      Coins — <code>{{ address }}</code>
    </h2>
    <div class="flex gap-2">
      <button class="btn btn-primary" @click="refresh">Refresh</button>
    </div>

    <div>
      <h3 class="font-semibold">Balances</h3>
      <ul class="list-disc pl-6 text-sm">
        <li v-for="b in balances" :key="b.denom">
          <code>{{ b.amount }}</code> <span class="opacity-70">{{ b.denom }}</span>
        </li>
        <li v-if="balances.length === 0" class="opacity-70">No balances</li>
      </ul>
    </div>

    <div>
      <h3 class="font-semibold">Spendable</h3>
      <ul class="list-disc pl-6 text-sm">
        <li v-for="s in spendables" :key="s.denom">
          <code>{{ s.amount }}</code> <span class="opacity-70">{{ s.denom }}</span>
        </li>
        <li v-if="spendables.length === 0" class="opacity-70">No spendable balances</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import Balance from '@/orm/models/bank/Balance'
import SpendableBalance from '@/orm/models/bank/SpendableBalance'

const props = defineProps<{ address: string }>()

const balanceRepo = useRepo(Balance)
const spendableRepo = useRepo(SpendableBalance)

const balances = computed<any[]>(() =>
  props.address
    ? (balanceRepo.where('address', (v: string) => v === props.address).get() as any[])
    : []
)
const spendables = computed<any[]>(() =>
  props.address
    ? (spendableRepo.where('address', (v: string) => v === props.address).get() as any[])
    : []
)

async function refresh() {
  if (!props.address) return
  await Promise.allSettled([
    useAxiosRepo(Balance).api().fetchByAddress(props.address),
    useAxiosRepo(SpendableBalance).api().fetchAll(props.address),
  ])
}

watchEffect(() => {
  if (props.address) void refresh()
})
</script>
