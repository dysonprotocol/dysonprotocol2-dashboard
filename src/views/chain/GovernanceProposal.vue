<script setup lang="ts">
import { onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import GovProposal from '@/orm/models/gov/Proposal'
import GovTally from '@/orm/models/gov/Tally'
import GovVote from '@/orm/models/gov/Vote'
import GovDeposit from '@/orm/models/gov/Deposit'
import DenomMetadata from '@/orm/models/bank/DenomMetadata'
import Delegation from '@/orm/models/staking/Delegation'
import { useWallet } from '@/composables/useWallet'
import { ref } from 'vue'

const route = useRoute()
const id = computed(() => String(route.params.proposalId || ''))

const VOTE_OPTION_YES = 'VOTE_OPTION_YES'
const VOTE_OPTION_ABSTAIN = 'VOTE_OPTION_ABSTAIN'
const VOTE_OPTION_NO = 'VOTE_OPTION_NO'
const VOTE_OPTION_NO_WITH_VETO = 'VOTE_OPTION_NO_WITH_VETO'

const pApi = useAxiosRepo(GovProposal).api()
const tApi = useAxiosRepo(GovTally).api()
const vApi = useAxiosRepo(GovVote).api()
const dApi = useAxiosRepo(GovDeposit).api()
const dmApi = useAxiosRepo(DenomMetadata).api()
const delApi = useAxiosRepo(Delegation).api()

const pRepo = useRepo(GovProposal)
const tRepo = useRepo(GovTally)
const vRepo = useRepo(GovVote)
const dRepo = useRepo(GovDeposit)
const delegationRepo = useRepo(Delegation)
const wallet = useWallet()

const isSubmitting = ref(false)
const voteError = ref('')
const stakingPower = ref<Record<string, string>>({})

async function submitVoteFor(address: string, option: number) {
  if (!id.value) return
  if (!address) {
    voteError.value = 'Missing wallet address'
    return
  }
  voteError.value = ''
  isSubmitting.value = true
  try {
    await pApi.vote({
      proposalId: id.value,
      voter: address,
      option,
      wallet: { sendMsg: wallet.sendMsg },
      gasLimit: 'auto',
      memo: undefined,
    })
    await Promise.allSettled([vApi.fetchOne(id.value, address), tApi.fetch(id.value)])
  } catch (e: any) {
    console.error(e)
    voteError.value = e?.message || String(e)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  if (!id.value) return
  await Promise.allSettled([
    pApi.fetchProposal(id.value),
    tApi.fetch(id.value),
    vApi.fetchByProposal(id.value),
    dApi.fetchByProposal(id.value),
    dmApi.fetchAll(),
  ])
  // Preload staking power for unlocked wallets
  for (const w of unlockedWallets.value as Array<{ address: string }>) loadStakingPower(w.address)
})

const p = computed(
  () =>
    pRepo.find(id.value) as { id: string; title: string; summary: string; status: string } | null
)
const t = computed(
  () =>
    tRepo.find(id.value) as {
      yes_count: string
      abstain_count: string
      no_count: string
      no_with_veto_count: string
    } | null
)
const votes = computed(
  () =>
    vRepo.where('proposal_id', (x: string) => x === id.value).get() as Array<{
      voter: string
      metadata: string
      options?: Array<{ option: string | number; weight: string }>
    }>
)
const deposits = computed(
  () =>
    dRepo.where('proposal_id', (x: string) => x === id.value).get() as Array<{
      depositor: string
      amount?: Array<{ denom: string; amount: string }>
    }>
)

function formatCoin(input?: { denom: string; amount: string }) {
  if (!input || !input.denom) return ''
  try {
    const norm = DenomMetadata.normalize({ amount: input.amount, denom: input.denom })
    const a = norm.display?.amount || String(input.amount || '')
    const d = norm.display?.denom || input.denom
    return `${a} ${d}`.trim()
  } catch (e) {
    console.error(e)
    return `${input.amount} ${input.denom}`.trim()
  }
}

function formatCoins(coins?: Array<{ denom: string; amount: string }>) {
  const list = Array.isArray(coins) ? coins : []
  if (list.length === 0) return '—'
  return list.map((c) => formatCoin(c)).join(', ')
}

function classifyVote(
  options?: Array<{ option: string | number; weight: string }>
): 'yes' | 'abstain' | 'no' | 'veto' | '-' {
  if (!Array.isArray(options) || options.length === 0) return '-'
  const toKey = (val: unknown): string => (typeof val === 'string' ? val : '')
  const hasPositiveWeight = (opt: string) => {
    const entry = options.find((o) => toKey((o as any)?.option) === opt)
    if (!entry) return false
    const w = Number((entry as any).weight)
    return Number.isFinite(w) && w > 0
  }
  if (hasPositiveWeight(VOTE_OPTION_YES)) return 'yes'
  if (hasPositiveWeight(VOTE_OPTION_ABSTAIN)) return 'abstain'
  if (hasPositiveWeight(VOTE_OPTION_NO)) return 'no'
  if (hasPositiveWeight(VOTE_OPTION_NO_WITH_VETO)) return 'veto'
  return '-'
}

function voteBadgeClass(options?: Array<{ option: string | number; weight: string }>) {
  const cls = classifyVote(options)
  if (cls === 'yes') return 'badge-success'
  if (cls === 'abstain') return ''
  if (cls === 'no') return 'badge-error'
  if (cls === 'veto') return 'badge-error badge-soft'
  return 'badge-ghost'
}

const unlockedWallets = computed(() =>
  Array.isArray(wallet.unlockedWallets?.value) ? wallet.unlockedWallets.value : []
)

async function loadStakingPower(address: string) {
  if (!address) return
  try {
    await delApi.fetchByDelegator(address)
  } catch (e) {
    console.error(e)
  }
  const list = delegationRepo
    .where('delegator_address', (x: string) => x === address)
    .get() as Array<{ shares?: string }>
  const sum = list.reduce((acc, d) => acc + (parseFloat(String(d.shares || '0')) || 0), 0)
  stakingPower.value[address] = String(sum)
}

watch(
  unlockedWallets,
  (list) => {
    for (const w of list as Array<{ address: string }>) loadStakingPower(w.address)
  },
  { immediate: false }
)

function walletNameForAddress(address: string) {
  const entry = unlockedWallets.value.find((w: any) => String(w?.address || '') === String(address))
  return entry?.name || (address ? String(address).slice(0, 10) + '…' : 'wallet')
}

function walletVoteClass(address: string) {
  const rec = vRepo
    .where('proposal_id', (x: string) => x === id.value)
    .where('voter', (x: string) => x === address)
    .first() as { options?: Array<{ option: string | number; weight: string }> } | null
  return voteBadgeClass(rec?.options || [])
}

function walletVoteValue(address: string) {
  const rec = vRepo
    .where('proposal_id', (x: string) => x === id.value)
    .where('voter', (x: string) => x === address)
    .first() as { options?: Array<{ option: string | number; weight: string }> } | null
  const cls = classifyVote(rec?.options || [])
  if (cls === 'yes') return 'Yes'
  if (cls === 'abstain') return 'Abstain'
  if (cls === 'no') return 'No'
  if (cls === 'veto') return 'Veto'
  return '-'
}
</script>

<template>
  <div class="p-4 space-y-4 mx-auto max-w-screen-md">
    <div class="text-lg font-medium">Proposal #{{ id }}</div>

    <div class="grid grid-cols-1 gap-3">
      <div class="font-medium">Proposal</div>
      <div>
        <span class="opacity-70">Title:</span>
        <span class="font-medium">{{ p?.title || '—' }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="opacity-70">Status:</span>
        <span class="badge badge-outline">{{ p?.status || '—' }}</span>
      </div>
      <div class="whitespace-pre-wrap">
        <span class="opacity-70">Summary:</span>
        <div>{{ p?.summary || '—' }}</div>
      </div>

      <div class="font-medium">Tally</div>
      <div class="stats shadow w-full">
        <div class="stat">
          <div class="stat-title">Yes</div>
          <div class="stat-value text-success">{{ t?.yes_count || '0' }}</div>
          <div class="stat-desc"></div>
        </div>

        <div class="stat">
          <div class="stat-title">Abstain</div>
          <div class="stat-value">{{ t?.abstain_count || '0' }}</div>
          <div class="stat-desc"></div>
        </div>

        <div class="stat">
          <div class="stat-title">No</div>
          <div class="stat-value text-error">{{ t?.no_count || '0' }}</div>
          <div class="stat-desc"></div>
        </div>

        <div class="stat">
          <div class="stat-title">No w/ Veto</div>
          <div class="stat-value text-error">{{ t?.no_with_veto_count || '0' }}</div>
          <div class="stat-desc"></div>
        </div>
      </div>
      <div class="font-medium">Your Wallets</div>
      <div v-if="unlockedWallets.length">
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Wallet</th>
                <th>Voting Power</th>
                <th>Current Vote</th>
                <th class="w-0"></th>
                <th class="w-0"></th>
                <th class="w-0"></th>
                <th class="w-0"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in unlockedWallets" :key="w.address">
                <td class="font-mono" :title="w.address">{{ walletNameForAddress(w.address) }}</td>
                <td class="font-mono">{{ stakingPower[w.address] || '—' }}</td>
                <td>
                  <span class="badge badge-outline" :class="walletVoteClass(w.address)">{{
                    walletVoteValue(w.address)
                  }}</span>
                </td>
                <td>
                  <button
                    class="btn btn-primary"
                    @click="submitVoteFor(w.address, 1)"
                    :disabled="isSubmitting"
                  >
                    Yes
                  </button>
                </td>
                <td>
                  <button
                    class="btn btn-primary"
                    @click="submitVoteFor(w.address, 2)"
                    :disabled="isSubmitting"
                  >
                    Abstain
                  </button>
                </td>
                <td>
                  <button
                    class="btn btn-primary"
                    @click="submitVoteFor(w.address, 3)"
                    :disabled="isSubmitting"
                  >
                    No
                  </button>
                </td>
                <td>
                  <button
                    class="btn btn-primary"
                    @click="submitVoteFor(w.address, 4)"
                    :disabled="isSubmitting"
                  >
                    Veto
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="voteError" class="text-red-600">{{ voteError }}</div>
      </div>
      <div v-else class="opacity-70">No unlocked wallets.</div>
    </div>

    <div class="grid grid-cols-1 gap-3">
      <div class="font-medium">Votes</div>
      <div class="space-y-1">
        <div v-for="v in votes" :key="v.voter" class="flex items-center justify-between gap-2">
          <span class="font-mono truncate max-w-[60%]">{{ v.voter }}</span>
          <span class="badge badge-outline" :class="voteBadgeClass(v.options)">{{
            classifyVote(v.options)
          }}</span>
        </div>
      </div>

      <div class="font-medium">Deposits</div>
      <div class="space-y-1">
        <div
          v-for="d in deposits"
          :key="d.depositor"
          class="flex items-center justify-between gap-2"
        >
          <span class="font-mono truncate max-w-[60%]">{{ d.depositor }}</span>
          <span class="truncate max-w-[35%]">{{ formatCoins(d.amount as any) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
