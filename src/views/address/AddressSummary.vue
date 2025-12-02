<template>
  <section class="w-full max-w-6xl mx-auto p-4">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Card>
        <CardHeader>
          <CardTitle>Bank</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="text-left">denom</TableHead>
                  <TableHead class="text-left">amount</TableHead>
                  <TableHead class="text-left">spendable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="r in bankRows" :key="r.key">
                  <TableCell class="text-left">{{ r.denom }}</TableCell>
                  <TableCell class="text-left font-mono">{{ r.amount }}</TableCell>
                  <TableCell class="text-left font-mono">{{ r.spendable }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staking</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="text-left">metric</TableHead>
                  <TableHead class="text-left">value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="r in stakingRows" :key="r.key">
                  <TableCell class="text-left">{{ r.label }}</TableCell>
                  <TableCell class="text-left"
                    ><span class="font-mono">{{ r.value }}</span></TableCell
                  >
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Authz Grants</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="text-left">role</TableHead>
                  <TableHead class="text-left">count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="r in authzRows" :key="r.key">
                  <TableCell class="text-left">{{ r.label }}</TableCell>
                  <TableCell class="text-left"
                    ><span class="font-mono">{{ r.value }}</span></TableCell
                  >
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>NFTs (Total: {{ nfts.length }})</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="text-left">class</TableHead>
                  <TableHead class="text-left">count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="c in nftClassRows" :key="c.class_id">
                  <TableCell class="text-left font-mono">{{ c.class_id }}</TableCell>
                  <TableCell class="text-left"
                    ><span class="font-mono">{{ c.count }}</span></TableCell
                  >
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div class="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Script</CardTitle>
          </CardHeader>
          <CardContent class="space-y-2">
            <div class="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead class="text-left">info</TableHead>
                    <TableHead class="text-left">value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell class="text-left">version</TableCell>
                    <TableCell class="text-left font-mono">{{ scriptVersion }}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell class="text-left">height</TableCell>
                    <TableCell class="text-left font-mono">{{ scriptHeight }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Button v-if="hasWsgi" as-child variant="outline">
              <a :href="dwappUrl" target="_blank" rel="noopener noreferrer">
                Go to Dwapp
                <ArrowTopRightOnSquareIcon class="w-4 h-4 inline-block ml-1" />
              </a>
            </Button>

            <div>
              <div class="font-semibold">Docstring</div>
              <pre v-if="scriptDocstring" class="whitespace-pre-wrap break-words overflow-x-auto">{{
                scriptDocstring
              }}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </section>
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'

const props = defineProps<{ address: string }>()

const balanceRepo = useRepo(Balance)
const spendableRepo = useRepo(SpendableBalance)
const delegationRepo = useRepo(Delegation)
const namesRepo = useRepo(NamesByDestination)
const nftRepo = useRepo(NftItem)
const scriptRepo = useRepo(Script)
const rewardRepo = useRepo(DelegatorTotalReward)
const grantRepo = useRepo(Grant)

// removed unused spendables
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
  const byBase = new Map<string, { total: bigint; spend: bigint }>()
  for (const c of balances.value as Array<{ amount: string; denom: string }>) {
    try {
      const n = (DenomMetadata as any).normalize({ amount: c.amount, denom: c.denom })
      const baseDenom = n.base.denom
      const baseAmt = BigInt(n.base.amount)
      const entry = byBase.get(baseDenom) || { total: 0n, spend: 0n }
      entry.total += baseAmt
      byBase.set(baseDenom, entry)
    } catch (e) {
      console.error('normalize balance failed', e)
    }
  }
  for (const c of spendables.value as Array<{ amount: string; denom: string }>) {
    try {
      const n = (DenomMetadata as any).normalize({ amount: c.amount, denom: c.denom })
      const baseDenom = n.base.denom
      const baseAmt = BigInt(n.base.amount)
      const entry = byBase.get(baseDenom) || { total: 0n, spend: 0n }
      entry.spend += baseAmt
      byBase.set(baseDenom, entry)
    } catch (e) {
      console.error('normalize spendable failed', e)
    }
  }
  const withSpend: Array<{ key: string; amount: string; spendable: string; denom: string }> = []
  for (const [base, entry] of byBase.entries()) {
    try {
      const disp = (DenomMetadata as any).normalize({
        amount: entry.total.toString(),
        denom: base,
      }).display
      const spendDisp = (DenomMetadata as any).normalize({
        amount: entry.spend.toString(),
        denom: base,
      }).display
      withSpend.push({
        key: base,
        amount: disp.amount,
        spendable: spendDisp.amount,
        denom: disp.denom,
      })
    } catch (e) {
      console.error('normalize display failed', e)
    }
  }
  withSpend.sort((a, b) => (a.denom > b.denom ? 1 : a.denom < b.denom ? -1 : 0))
  return withSpend
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
