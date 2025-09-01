<template>
  <div class="space-y-4 max-w-xl mx-auto">
    <h2 class="text-lg font-medium">Names: {{ address }}</h2>
    <div>
      <h3 class="font-semibold">Names owned by this address and resolve to this address</h3>
      <div class="text-sm opacity-70">
        count: <code>{{ ownedAndResolvingHere.length }}</code>
      </div>
      <ul class="list-disc pl-6 text-sm">
        <li v-for="n in ownedAndResolvingHere" :key="n">
          <RouterLink
            :to="{ name: 'NameDetails', params: { name: n } }"
            class="font-mono link link-primary"
          >
            {{ n }}
          </RouterLink>
        </li>
        <li v-if="ownedAndResolvingHere.length === 0" class="opacity-70">No names</li>
      </ul>
    </div>

    <div>
      <h3 class="font-semibold">Names owned by other addresses and resolving to this address</h3>
      <div class="text-sm opacity-70">
        count: <code>{{ notOwnedResolvingHere.length }}</code>
      </div>
      <ul class="list-disc pl-6 text-sm">
        <li v-for="n in notOwnedResolvingHere" :key="n">
          <RouterLink
            :to="{ name: 'NameDetails', params: { name: n } }"
            class="font-mono link link-primary"
          >
            {{ n }}
          </RouterLink>
        </li>
        <li v-if="notOwnedResolvingHere.length === 0" class="opacity-70">No names</li>
      </ul>
    </div>

    <div>
      <h3 class="font-semibold">Names owned by this address resolving to other addresses</h3>
      <div class="text-sm opacity-70">
        count: <code>{{ ownedResolvingElsewhere.length }}</code>
      </div>
      <ul class="list-disc pl-6 text-sm">
        <li v-for="n in ownedResolvingElsewhere" :key="n">
          <RouterLink
            :to="{ name: 'NameDetails', params: { name: n } }"
            class="font-mono link link-primary"
          >
            {{ n }}
          </RouterLink>
        </li>
        <li v-if="ownedResolvingElsewhere.length === 0" class="opacity-70">No names</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import NamesByDestination from '@/orm/models/nameservice/NamesByDestination'
import NftItem from '@/orm/models/nft/NftItem'

const props = defineProps<{ address: string }>()

const repo = useRepo(NamesByDestination)
const byDest = computed<any[]>(() =>
  (repo.all() as any[]).filter((r) => r.destination === props.address)
)
const byDestNames = computed<string[]>(() => byDest.value.map((r: any) => String(r?.name || '')))

const itemRepo = useRepo(NftItem)
const ownedNames = computed<string[]>(() =>
  (
    itemRepo
      .all()
      .filter((n: any) => n.class_id === 'nameservice.dys' && n.owner === props.address) as any[]
  ).map((n: any) => String(n.id))
)

const ownedAndResolvingHere = computed<string[]>(() => {
  const ownedSet = new Set(ownedNames.value)
  return byDestNames.value.filter((n) => ownedSet.has(n))
})
const notOwnedResolvingHere = computed<string[]>(() => {
  const ownedSet = new Set(ownedNames.value)
  return byDestNames.value.filter((n) => !ownedSet.has(n))
})
const ownedResolvingElsewhere = computed<string[]>(() => {
  const byDestSet = new Set(byDestNames.value)
  return ownedNames.value.filter((n) => !byDestSet.has(n))
})

async function refresh() {
  if (!props.address) return
  await useAxiosRepo(NamesByDestination).api().fetchInit({ destination: props.address })
  await useAxiosRepo(NftItem).api().fetchNfts({ class_id: 'nameservice.dys', owner: props.address })
}

watchEffect(() => {
  if (props.address) void refresh()
})
</script>
