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
import WalletSelector from '@/components/shared/WalletSelector.vue'
import AmountDenomSelector from '@/components/AmountDenomSelector.vue'
import { Button } from '@/components/ui/button'

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
const selectedDepositor = ref('')
const depositCoinBase = ref<{ amount: string; denom: string }>({ amount: '', denom: 'udys' })
const depositError = ref('')

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

async function submitDeposit() {
  if (!id.value) return
  if (!selectedDepositor.value) {
    depositError.value = 'Select a wallet first'
    return
  }
  const denom = String(depositCoinBase.value?.denom || '')
  const amt = String(depositCoinBase.value?.amount || '')
  if (!denom || !amt) {
    depositError.value = 'Enter an amount and denom'
    return
  }
  if (!/^[0-9]+$/.test(amt) || Number(amt) <= 0) {
    depositError.value = 'Amount must be a positive integer'
    return
  }
  depositError.value = ''
  isSubmitting.value = true
  try {
    await pApi.deposit({
      proposalId: id.value,
      depositor: selectedDepositor.value,
      amount: [{ denom, amount: amt }],
      wallet: { sendMsg: wallet.sendMsg },
      gasLimit: 'auto',
      memo: undefined,
    })
    await dApi.fetchByProposal(id.value)
  } catch (e: any) {
    console.error(e)
    depositError.value = e?.message || String(e)
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
const votes = computed<any[]>(
  () => vRepo.where('proposal_id', (x: string) => x === id.value).get() as any[]
)
const deposits = computed<any[]>(
  () => dRepo.where('proposal_id', (x: string) => x === id.value).get() as any[]
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

// badge variants removed; display plain text instead

const unlockedWallets = computed<Array<{ address: string; name?: string }>>(() => {
  const list = Array.isArray(wallet.unlockedWallets?.value) ? wallet.unlockedWallets.value : []
  return list as Array<{ address: string; name?: string }>
})

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
  const list = unlockedWallets.value as Array<{ address: string; name?: string }>
  const entry = list.find((w) => String(w?.address || '') === String(address))
  return (entry && entry.name) || (address ? String(address).slice(0, 10) + '…' : 'wallet')
}

// walletVoteClass removed (replaced with Badge variants)

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

function isVoted(address: string, option: number) {
  const rec = vRepo
    .where('proposal_id', (x: string) => x === id.value)
    .where('voter', (x: string) => x === address)
    .first() as { options?: Array<{ option: string | number; weight: string }> } | null
  const cls = classifyVote(rec?.options || [])
  if (option === 1) return cls === 'yes'
  if (option === 2) return cls === 'abstain'
  if (option === 3) return cls === 'no'
  if (option === 4) return cls === 'veto'
  return false
}
</script>

<template>
  <div class="p-4 space-y-4 mx-auto max-w-screen-lg">
    <div class="text-lg font-medium">Proposal #{{ id }}</div>

    <div class="grid grid-cols-1 gap-3">
      <div class="font-medium">Proposal</div>
      <div>
        <span class="opacity-70">Title:</span>
        <span class="font-medium">{{ p?.title || '—' }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="opacity-70">Status:</span>
        <span>{{ p?.status || '—' }}</span>
      </div>
      <div class="whitespace-pre-wrap">
        <span class="opacity-70">Summary:</span>
        <div>{{ p?.summary || '—' }}</div>
      </div>

      <div class="font-medium" v-if="p?.status === 'PROPOSAL_STATUS_DEPOSIT_PERIOD'">Deposit</div>
      <div class="grid grid-cols-2 gap-2" v-if="p?.status === 'PROPOSAL_STATUS_DEPOSIT_PERIOD'">
        <AmountDenomSelector
          v-model:base="depositCoinBase"
          :baseDenoms="['udys']"
          :defaultBaseDenom="'udys'"
        />
        <div class="flex gap-2">
          <WalletSelector v-model="selectedDepositor" :buttonClass="'btn btn-outline'" />
          <Button
            variant="outline"
            @click="submitDeposit"
            :disabled="!selectedDepositor || isSubmitting"
          >
            Deposit
          </Button>
          <div v-if="depositError" class="text-red-600">{{ depositError }}</div>
        </div>
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
          <table class="table w-full">
            <thead>
              <tr>
                <th>Wallet</th>
                <th>Staked Voting Power</th>
                <th>Current Vote</th>
                <th class="w-0"></th>
                <th class="w-0"></th>
                <th class="w-0"></th>
                <th class="w-0"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in unlockedWallets" :key="w.address">
                <td class="font-mono" :title="w.address">
                  <RouterLink :to="{ name: 'AddressSummary', params: { address: w.address } }">
                    {{ walletNameForAddress(w.address) }}
                  </RouterLink>
                </td>
                <td class="font-mono">{{ stakingPower[w.address] || '—' }}</td>
                <td>{{ walletVoteValue(w.address) }}</td>
                <td>
                  <Button
                    :variant="isVoted(w.address, 1) ? undefined : 'outline'"
                    @click="submitVoteFor(w.address, 1)"
                    :disabled="isSubmitting"
                  >
                    Yes
                  </Button>
                </td>
                <td>
                  <Button
                    :variant="isVoted(w.address, 2) ? undefined : 'outline'"
                    @click="submitVoteFor(w.address, 2)"
                    :disabled="isSubmitting"
                  >
                    Abstain
                  </Button>
                </td>
                <td>
                  <Button
                    :variant="isVoted(w.address, 3) ? undefined : 'outline'"
                    @click="submitVoteFor(w.address, 3)"
                    :disabled="isSubmitting"
                  >
                    No
                  </Button>
                </td>
                <td>
                  <Button
                    :variant="isVoted(w.address, 4) ? undefined : 'outline'"
                    @click="submitVoteFor(w.address, 4)"
                    :disabled="isSubmitting"
                  >
                    Veto
                  </Button>
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
          <RouterLink
            class="font-mono truncate max-w-[60%]"
            :to="{ name: 'AddressSummary', params: { address: v.voter } }"
          >
            {{ v.voter }}
          </RouterLink>
          <span>{{ classifyVote(v.options) }}</span>
        </div>
      </div>

      <div class="font-medium">Deposits</div>
      <div class="space-y-1">
        <div
          v-for="d in deposits"
          :key="d.depositor"
          class="flex items-center justify-between gap-2"
        >
          <RouterLink
            class="font-mono truncate max-w-[60%]"
            :to="{ name: 'AddressSummary', params: { address: d.depositor } }"
          >
            {{ d.depositor }}
          </RouterLink>
          <span class="truncate max-w-[35%]">{{ formatCoins(d.amount as any) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
