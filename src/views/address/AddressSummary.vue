<template>
  <div class="text-sm space-y-4 flex">
    <div class="w-1/4">
      <div class="card bg-base-100">
        <div class="card-body p-4">
          <h3 class="card-title text-base">
            Bank
          </h3>
          <div class="overflow-x-auto">
            <table class="table table-xs table-fixed w-full">
              <thead>
                <tr>
                  <th class="text-left">
                    denom
                  </th>
                  <th class="text-left">
                    amount
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in bankRows"
                  :key="r.key"
                >
                  <td class="text-left">
                    {{ r.denom }}
                  </td>
                  <td class="text-left">
                    <code>{{ r.amount }}</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card bg-base-100">
        <div class="card-body p-4">
          <h3 class="card-title text-base">
            Staking
          </h3>
          <div class="overflow-x-auto">
            <table class="table table-xs table-fixed w-full">
              <thead>
                <tr>
                  <th class="text-left">
                    metric
                  </th>
                  <th class="text-left">
                    value
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in stakingRows"
                  :key="r.key"
                >
                  <td class="text-left">
                    {{ r.label }}
                  </td>
                  <td class="text-left">
                    <code>{{ r.value }}</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card bg-base-100">
        <div class="card-body p-4">
          <h3 class="card-title text-base">
            Authz Grants
          </h3>
          <div class="overflow-x-auto">
            <table class="table table-xs table-fixed w-full">
              <thead>
                <tr>
                  <th class="text-left">
                    role
                  </th>
                  <th class="text-left">
                    count
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in authzRows"
                  :key="r.key"
                >
                  <td class="text-left">
                    {{ r.label }}
                  </td>
                  <td class="text-left">
                    <code>{{ r.value }}</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 md:col-span-2 lg:col-span-1">
        <div class="card-body p-4">
          <h3 class="card-title text-base">
            NFTs
          </h3>
          <div>
            NFTs total: <code>{{ nfts.length }}</code>
          </div>
          <div class="overflow-x-auto">
            <table class="table table-xs table-fixed w-full">
              <thead>
                <tr>
                  <th class="text-left">
                    class
                  </th>
                  <th class="text-left">
                    count
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="c in nftClassRows"
                  :key="c.class_id"
                >
                  <td class="text-left font-mono">
                    {{ c.class_id }}
                  </td>
                  <td class="text-left">
                    <code>{{ c.count }}</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    <div class="w-3/4">
      <div class="card bg-base-100">
        <div class="card-body p-4">
          <h3 class="card-title text-base">
            Script
          </h3>

          <div class="overflow-x-auto">
            <table class="table table-xs table-fixed w-full">
              <thead>
                <tr>
                  <th class="text-left">
                    info
                  </th>
                  <th class="text-left">
                    value
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-left">
                    version
                  </td>
                  <td class="text-left">
                    <code>{{ scriptVersion }}</code>
                  </td>
                </tr>
                <tr>
                  <td class="text-left">
                    height
                  </td>
                  <td class="text-left">
                    <code>{{ scriptHeight }}</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <a
            v-if="hasWsgi"
            :href="dwappUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-outline"
          >
            Go to Dwapp
            <ArrowTopRightOnSquareIcon class="w-4 h-4 inline-block ml-1" />
          </a>
          <h4 class="text-sm font-semibold">
            Docstring
          </h4>
          <pre
            v-if="scriptDocstring"
            class="overflow-x-auto"
          >{{ scriptDocstring }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import Balance from '@/orm/models/bank/Balance'
import SpendableBalance from '@/orm/models/bank/SpendableBalance'
import Delegation from '@/orm/models/staking/Delegation'
import NamesByDestination from '@/orm/models/nameservice/NamesByDestination'
import NftItem from '@/orm/models/nft/NftItem'
import Script from '@/orm/models/script/Script'
import DelegatorTotalReward from '@/orm/models/distribution/DelegatorTotalReward'
import Grant from '@/orm/models/authz/Grant'
import DenomMetadata from '@/orm/models/bank/DenomMetadata'
import { ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{ address: string }>()

const balanceRepo = useRepo(Balance)
const spendableRepo = useRepo(SpendableBalance)
const delegationRepo = useRepo(Delegation)
const namesRepo = useRepo(NamesByDestination)
const nftRepo = useRepo(NftItem)
const scriptRepo = useRepo(Script)
const rewardRepo = useRepo(DelegatorTotalReward)
const grantRepo = useRepo(Grant)

const spendables = computed<any[]>(() =>
  props.address
    ? (spendableRepo.where('address', (v: string) => v === props.address).get() as any[])
    : []
)
const balances = computed<any[]>(() =>
  props.address
    ? (balanceRepo.where('address', (v: string) => v === props.address).get() as any[])
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
  (nftRepo.all() as any[]).filter((n) => n.owner === props.address)
)
const scriptVersion = computed(() => (scriptRepo.find(props.address) as any)?.version || '')
const scriptHeight = computed(() => (scriptRepo.find(props.address) as any)?.update_height || '')
const scriptDocstring = computed(() => (scriptRepo.find(props.address) as any)?.docstring || '')

const hasWsgi = computed(() => {
  const code = (scriptRepo.find(props.address) as any)?.code || ''
  return /(^|\s)def\s+wsgi\s*\(/.test(String(code))
})
const dwappName = computed(() => (namesByDest.value as Array<{ name: string }>)[0]?.name || '')
const dwappUrl = computed(
  () => `/redirect-to-dwapp/${encodeURIComponent(dwappName.value || props.address)}`
)

function addDecimalStrings(a: string, b: string): string {
  const [ai, af = ''] = String(a || '0').split('.')
  const [bi, bf = ''] = String(b || '0').split('.')
  const fracLen = Math.max(af.length, bf.length)
  const A = ai + (af + '0'.repeat(fracLen - af.length))
  const B = bi + (bf + '0'.repeat(fracLen - bf.length))
  let carry = 0
  let out = ''
  for (let i = A.length - 1; i >= 0; i -= 1) {
    const s = A.charCodeAt(i) - 48 + (B.charCodeAt(i) - 48) + carry
    out = String(s % 10) + out
    carry = Math.floor(s / 10)
  }
  if (carry) out = String(carry) + out
  const int = out.slice(0, out.length - fracLen) || '0'
  const frac = out.slice(out.length - fracLen).replace(/0+$/, '')
  return frac ? `${int}.${frac}` : int
}

const bankRows = computed(() => {
  const byBase = new Map<string, bigint>()
  for (const c of balances.value as Array<{ amount: string; denom: string }>) {
    try {
      const n = (DenomMetadata as any).normalize({ amount: c.amount, denom: c.denom })
      const baseDenom = n.base.denom
      const baseAmt = BigInt(n.base.amount)
      byBase.set(baseDenom, (byBase.get(baseDenom) || 0n) + baseAmt)
    } catch {}
  }
  const out: Array<{ key: string; amount: string; denom: string }> = []
  for (const [base, amt] of byBase.entries()) {
    try {
      const disp = (DenomMetadata as any).normalize({ amount: amt.toString(), denom: base }).display
      if (String(disp.denom || '').includes('/')) continue
      out.push({ key: base, amount: disp.amount, denom: disp.denom })
    } catch {}
  }
  out.sort((a, b) => (a.denom > b.denom ? 1 : a.denom < b.denom ? -1 : 0))
  return out
})

const stakedShares = computed(() => {
  const list = delegations.value as Array<{ shares?: string }>
  if (!Array.isArray(list) || list.length === 0) return '0'
  return list.map((d) => String(d.shares || '0')).reduce((acc, v) => addDecimalStrings(acc, v), '0')
})

const rewardsUdys = computed(() => {
  const list = rewardRepo
    .where('delegator_address', (v: string) => v === props.address)
    .get() as any[] as Array<{ denom: string; amount: string }>
  let total = '0'
  for (const r of list)
    if (r.denom === 'udys') total = addDecimalStrings(total, String(r.amount || '0'))
  return total
})

const rewardsUdysDisplay = computed(() => {
  const base = rewardsUdys.value || '0'
  return (DenomMetadata as any).normalize({ amount: base, denom: 'udys' }).display
})

const stakingRows = computed(() => [
  { key: 'delegations', label: 'delegations', value: String(delegations.value.length || 0) },
  { key: 'staked', label: 'staked (shares)', value: stakedShares.value },
  {
    key: 'rewards',
    label: 'rewards',
    value: `${rewardsUdysDisplay.value.amount} ${rewardsUdysDisplay.value.denom}`,
  },
])

const grantsAsGranter = computed(
  () => (grantRepo.where('granter', (v: string) => v === props.address).get() as any[]).length
)
const grantsAsGrantee = computed(
  () => (grantRepo.where('grantee', (v: string) => v === props.address).get() as any[]).length
)

const authzRows = computed(() => [
  { key: 'as_granter', label: 'as granter', value: String(grantsAsGranter.value) },
  { key: 'as_grantee', label: 'as grantee', value: String(grantsAsGrantee.value) },
])

const nftClassRows = computed(() => {
  const byClass: Record<string, number> = {}
  for (const n of nfts.value as Array<{ class_id: string }>) {
    const k = n.class_id || ''
    if (!k) continue
    byClass[k] = (byClass[k] || 0) + 1
  }
  return Object.entries(byClass).map(([class_id, count]) => ({ class_id, count }))
})

async function refresh() {
  if (!props.address) return
  await Promise.all([
    useAxiosRepo(Balance).api().fetchByAddress(props.address),
    useAxiosRepo(SpendableBalance).api().fetchAll(props.address),
    useAxiosRepo(Delegation).api().fetchByDelegator(props.address),

    useAxiosRepo(NftItem).api().fetchNfts({ owner: props.address }),
    useAxiosRepo(Script).api().fetchInfo(props.address),
    useAxiosRepo(DelegatorTotalReward).api().fetch(props.address),
    useAxiosRepo(Grant).api().fetchByGranter(props.address),
    useAxiosRepo(Grant).api().fetchByGrantee(props.address),
    useAxiosRepo(DenomMetadata).api().fetchAll(),
  ])
}

watchEffect(() => {
  if (!props.address) return
  void refresh()
})
</script>
