<template>
  <h2 class="text-xl font-semibold">
    Staking — <code>{{ address }}</code>
  </h2>
  <div class="flex gap-2">
    <button class="btn btn-primary" @click="refresh">Load Delegations</button>
  </div>
  <ul class="list-disc pl-6 text-sm">
    <li v-for="d in delegations" :key="d.validator_address">
      <span class="font-mono">{{ d.validator_address }}</span>
      <span class="opacity-70"> — shares: {{ d.shares }}</span>
    </li>
    <li v-if="delegations.length === 0" class="opacity-70">No delegations</li>
  </ul>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import Delegation from '@/orm/models/staking/Delegation'

const props = defineProps<{ address: string }>()

const repo = useRepo(Delegation)
const delegations = computed<any[]>(() =>
  props.address
    ? (repo.where('delegator_address', (v: string) => v === props.address).get() as any[])
    : []
)

async function refresh() {
  if (!props.address) return
  await useAxiosRepo(Delegation).api().fetchByDelegator(props.address)
}

watchEffect(() => {
  if (props.address) void refresh()
})
</script>
