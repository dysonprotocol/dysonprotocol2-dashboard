<template>
  <h2 class="text-xl font-semibold">
    Address Summary — <code>{{ address }}</code>
  </h2>
  <div class="flex gap-2">
    <button class="btn btn-primary" @click="refresh">Refresh</button>
  </div>
  <div class="grid md:grid-cols-2 gap-4 text-sm">
    <div>
      <h3 class="font-semibold">Bank</h3>
      <div>
        balances: <code>{{ balances.length }}</code>
      </div>
      <div>
        spendable: <code>{{ spendables.length }}</code>
      </div>
    </div>
    <div>
      <h3 class="font-semibold">Script</h3>
      <div>
        version: <code>{{ scriptVersion }}</code>
      </div>
      <div>
        height: <code>{{ scriptHeight }}</code>
      </div>
    </div>
    <div>
      <h3 class="font-semibold">Staking</h3>
      <div>
        delegations: <code>{{ delegations.length }}</code>
      </div>
    </div>
    <div>
      <h3 class="font-semibold">Names & NFTs</h3>
      <div>
        names: <code>{{ namesByDest.length }}</code>
      </div>
      <div>
        NFTs: <code>{{ nfts.length }}</code>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import Balance from '@/orm/models/bank/Balance'
import SpendableBalance from '@/orm/models/bank/SpendableBalance'
import Delegation from '@/orm/models/staking/Delegation'
import NamesByDestination from '@/orm/models/nameservice/NamesByDestination'
import NftItem from '@/orm/models/nft/NftItem'
import Script from '@/orm/models/script/Script'

const props = defineProps<{ address: string }>()

const balanceRepo = useRepo(Balance)
const spendableRepo = useRepo(SpendableBalance)
const delegationRepo = useRepo(Delegation)
const namesRepo = useRepo(NamesByDestination)
const nftRepo = useRepo(NftItem)
const scriptRepo = useRepo(Script)

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
const delegations = computed<any[]>(() =>
  props.address
    ? (delegationRepo.where('delegator_address', (v: string) => v === props.address).get() as any[])
    : []
)
const namesByDest = computed<any[]>(() =>
  (namesRepo.all() as any[]).filter((r) => r.destination === props.address)
)
const nfts = computed<any[]>(() =>
  (nftRepo.all() as any[]).filter(
    (n) => n.class_id === 'nameservice.dys' && n.owner === props.address
  )
)
const scriptVersion = computed(() => (scriptRepo.find(props.address) as any)?.version || '')
const scriptHeight = computed(() => (scriptRepo.find(props.address) as any)?.update_height || '')

async function refresh() {
  if (!props.address) return
  await Promise.allSettled([
    useAxiosRepo(Balance).api().fetchByAddress(props.address),
    useAxiosRepo(SpendableBalance).api().fetchAll(props.address),
    useAxiosRepo(Delegation).api().fetchByDelegator(props.address),
    useAxiosRepo(NamesByDestination).api().fetchInit({ destination: props.address }),
    useAxiosRepo(NftItem).api().fetchNfts({ class_id: 'nameservice.dys', owner: props.address }),
    useAxiosRepo(Script).api().fetchInfo(props.address),
  ])
}
</script>
