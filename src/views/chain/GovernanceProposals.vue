<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useTextareaAutosize } from '@vueuse/core'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import GovProposal from '@/orm/models/gov/Proposal'
import GovParams from '@/orm/models/gov/Params'
import GovVote from '@/orm/models/gov/Vote'
import DenomMetadata from '@/orm/models/bank/DenomMetadata'
import { useWallet } from '@/composables/useWallet'
import WalletSelector from '@/components/shared/WalletSelector.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import UpgradeAuthority from '@/orm/models/upgrade/Authority'

const api = useAxiosRepo(GovProposal).api()
const repo = useRepo(GovProposal)
const govParamsApi = useAxiosRepo(GovParams).api()
const govParamsRepo = useRepo(GovParams)
const votesApi = useAxiosRepo(GovVote).api()
const votesRepo = useRepo(GovVote)
const upgradeRepo = useRepo(UpgradeAuthority)
const denomMetadataApi = useAxiosRepo(DenomMetadata).api()
const upgradeApi = useAxiosRepo(UpgradeAuthority).api()
const wallet = useWallet()

const VOTE_OPTION_YES = 'VOTE_OPTION_YES'
const VOTE_OPTION_ABSTAIN = 'VOTE_OPTION_ABSTAIN'
const VOTE_OPTION_NO = 'VOTE_OPTION_NO'
const VOTE_OPTION_NO_WITH_VETO = 'VOTE_OPTION_NO_WITH_VETO'

const proposals = computed(
  () => repo.all() as Array<{ id: string; title: string; summary?: string; status: string }>
)
const isLoading = ref(false)
const error = ref('')
const isLoadingParams = ref(false)
const denomMetaVersion = ref(0)
const votesByProposalAndAddress = ref<
  Record<
    string,
    Record<string, 'loading' | 'yes' | 'no' | 'abstain' | 'veto' | 'missing' | 'error'>
  >
>({})
const unlockedWallets = computed(() =>
  Array.isArray(wallet.unlockedWallets?.value) ? wallet.unlockedWallets.value : []
)

const proposer = ref('')
const title = ref('')
const summary = ref('')
const metadata = ref('')
const messages = ref(
  JSON.stringify(
    [
      {
        '@type': '/dysonprotocol.nameservice.v1.MsgSetDenomMetadata',
        authority: 'dys2...',
        metadata: {
          description: 'My example token',
          denom_units: [
            { denom: 'example.dys', exponent: 0, aliases: [] },
            { denom: 'dys', exponent: 6, aliases: [] },
          ],
          base: 'example.dys',
          display: 'example.dys',
          name: 'Example',
          symbol: 'EXAMPLE',
          uri: '',
          uri_hash: '',
        },
      },
    ],
    null,
    2
  )
)
const initialDeposit = ref(JSON.stringify([{ denom: 'udys', amount: '100' }], null, 2))
const submitError = ref('')
const isSubmitting = ref(false)
const expedited = ref(false)
const govParams = computed(
  () =>
    govParamsRepo.find('default') as
      | {
          min_deposit: Array<{ denom: string; amount: string }>
          max_deposit_period: string
          voting_period: string
          quorum: string
          threshold: string
          veto_threshold: string
          min_initial_deposit_ratio: string
          proposal_cancel_ratio: string
          proposal_cancel_dest: string
          expedited_voting_period: string
          expedited_threshold: string
          expedited_min_deposit: Array<{ denom: string; amount: string }>
          burn_vote_quorum: boolean
          burn_proposal_deposit_prevote: boolean
          burn_vote_veto: boolean
          min_deposit_ratio: string
        }
      | undefined
)

const upgradeAuthorityAddress = computed(
  () => (upgradeRepo.find('default') as { address?: string } | null)?.address || ''
)

function formatCoin(input?: { denom: string; amount: string }) {
  // establish reactive dependency so UI updates after metadata loads
  void denomMetaVersion.value
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

function percentFromDecString(input?: string) {
  const n = Number(input)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n * 100))
}

function percentLabel(input?: string) {
  const v = percentFromDecString(input)
  return `${v.toFixed(1)}%`
}

function secondsFromDurationString(input?: string): number {
  if (!input) return 0
  const trimmed = String(input).trim()
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  const m = trimmed.match(/^(\d+)(s)$/)
  if (m) return Number(m[1])
  return 0
}

function humanizeSeconds(input?: string): string {
  const total = secondsFromDurationString(input)
  if (!Number.isFinite(total) || total < 0) return '—'
  if (total === 0) return '0s'
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const parts: string[] = []
  if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`)
  if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`)
  if (minutes && parts.length < 2) parts.push(`${minutes} min${minutes === 1 ? '' : 's'}`)
  if (seconds && parts.length === 0) parts.push(`${seconds}s`)
  return parts.slice(0, 2).join(' ')
}

// autosize textareas (bind to existing refs)
const { textarea: messagesTextarea } = useTextareaAutosize({ input: messages })
const { textarea: depositTextarea } = useTextareaAutosize({ input: initialDeposit })

// Disable Authz for proposal submit (not supported by submit flow)
function disableAuthz() {
  return { valid: false, notes: '' }
}

// removed prefill helpers

async function refresh() {
  error.value = ''
  isLoading.value = true
  try {
    await api.fetchProposals()
    await refreshVotes()
  } catch (e: any) {
    console.error(e)
    error.value = e?.message || String(e)
  } finally {
    isLoading.value = false
  }
}

async function refreshGovParams() {
  isLoadingParams.value = true
  try {
    await govParamsApi.fetch()
  } catch (e: any) {
    console.error(e)
  } finally {
    isLoadingParams.value = false
  }
}

async function refreshDenomMetadata() {
  try {
    await denomMetadataApi.fetchAll()
    denomMetaVersion.value++
  } catch (e: any) {
    console.error(e)
  }
}

function classifyVote(
  options: Array<{ option: string | number; weight: string }>
): 'yes' | 'abstain' | 'no' | 'veto' | 'missing' {
  if (!Array.isArray(options) || options.length === 0) return 'missing'
  function hasPositiveWeightForOptions(accepted: string[]): boolean {
    const entry = options.find((o) => accepted.includes(String((o as any)?.option ?? ''))) as
      | { weight?: string }
      | undefined
    if (!entry) return false
    const w = Number(entry.weight)
    return Number.isFinite(w) && w > 0
  }
  if (hasPositiveWeightForOptions([VOTE_OPTION_YES, '1'])) return 'yes'
  if (hasPositiveWeightForOptions([VOTE_OPTION_ABSTAIN, '2'])) return 'abstain'
  if (hasPositiveWeightForOptions([VOTE_OPTION_NO_WITH_VETO, '4'])) return 'veto'
  if (hasPositiveWeightForOptions([VOTE_OPTION_NO, '3'])) return 'no'
  return 'missing'
}

async function refreshVotes() {
  const list = proposals.value
  const wallets = Array.isArray(wallet.unlockedWallets?.value) ? wallet.unlockedWallets.value : []
  if (list.length === 0 || wallets.length === 0) return

  const localMap: Record<
    string,
    Record<string, 'loading' | 'yes' | 'no' | 'abstain' | 'veto' | 'missing' | 'error'>
  > = {
    ...votesByProposalAndAddress.value,
  }

  const tasks: Array<Promise<void>> = []
  for (const p of list) {
    const pid = String(p.id)
    if (!localMap[pid]) localMap[pid] = {}
    for (const w of wallets) {
      const addr = String(w.address || '')
      if (!addr) continue
      localMap[pid][addr] = 'loading'
      tasks.push(
        votesApi
          .fetchOne(pid, addr)
          .then(() => {
            const rec = votesRepo
              .query()
              .where('proposal_id', pid)
              .where('voter', addr)
              .first() as unknown as
              | { options?: Array<{ option: string | number; weight: string }> }
              | undefined
            const status = classifyVote(rec?.options || [])
            localMap[pid][addr] = status
          })
          .catch((err: any) => {
            const code = err?.response?.data?.code
            if (code === 3) localMap[pid][addr] = 'missing'
            else {
              console.warn('[Governance] Failed to fetch vote', { pid, addr, err })
              localMap[pid][addr] = 'error'
            }
          })
      )
    }
  }
  votesByProposalAndAddress.value = localMap
  await Promise.allSettled(tasks)
}

function voteBadgeVariant(
  proposalId: string | number,
  address: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const pid = String(proposalId)
  const status = votesByProposalAndAddress.value?.[pid]?.[address]
  if (status === 'yes') return 'default'
  if (status === 'no') return 'destructive'
  if (status === 'abstain') return 'secondary'
  if (status === 'veto') return 'destructive'
  if (status === 'loading') return 'outline'
  return 'outline'
}

function walletNameForAddress(address: string) {
  const entry = unlockedWallets.value.find((w: any) => String(w?.address || '') === String(address))
  return entry?.name || (address ? String(address).slice(0, 10) + '…' : 'wallet')
}

function voteBadgeLabel(proposalId: string | number, address: string) {
  const pid = String(proposalId)
  const status = votesByProposalAndAddress.value?.[pid]?.[address]
  const name = walletNameForAddress(address)
  if (status === 'yes') return `${name}: Yes`
  if (status === 'no') return `${name}: No`
  if (status === 'abstain') return `${name}: Abstain`
  if (status === 'veto') return `${name}: Veto`
  if (status === 'loading') return `${name}: ...`
  if (status === 'error') return `${name}: Error`
  return `${name}: -`
}

watch(
  () => [
    proposals.value.map((p) => p.id).join(','),
    unlockedWallets.value.map((w: any) => w.address).join(','),
  ],
  () => {
    refreshVotes()
  }
)

// removed upgrade authority helpers

function trySetDefaultProposer() {
  try {
    proposer.value = wallet.getSignerAddress()
  } catch {
    // ignore: no connected wallet
  }
}

async function submit() {
  submitError.value = ''
  isSubmitting.value = true
  try {
    const msgs = JSON.parse(messages.value)
    const deposit = JSON.parse(initialDeposit.value)
    await api.submitProposal({
      proposer: proposer.value.trim(),
      messages: msgs,
      initialDeposit: deposit,
      metadata: metadata.value || undefined,
      title: title.value || undefined,
      summary: summary.value || undefined,
      expedited: expedited.value,
      wallet: { sendMsg: wallet.sendMsg },
      gasLimit: 'auto',
    })
    title.value = ''
    summary.value = ''
    metadata.value = ''
  } catch (e: any) {
    console.error(e)
    submitError.value = e?.message || String(e)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  trySetDefaultProposer()
  await refreshGovParams()
  await refreshDenomMetadata()
  try {
    await upgradeApi.fetch()
  } catch (e) {
    console.error(e)
  }
  refresh()
})
</script>

<template>
  <div class="p-4 space-y-4 overflow-x-auto max-w-screen-md mx-auto">
    <div class="border rounded p-4 space-y-3 bg-base-100 shadow">
      <div class="flex items-center justify-between">
        <div class="font-medium">Governance Parameters</div>
      </div>

      <div v-if="!govParams" class="text-sm opacity-70">No parameters loaded.</div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="card bg-base-200/50">
          <div class="card-body p-3 text-sm">
            <div class="font-medium">Deposit</div>
            <div>
              <span class="opacity-70">Min Deposit:</span> {{ formatCoins(govParams.min_deposit) }}
            </div>
            <div>
              <span class="opacity-70">Max Deposit Period:</span>
              {{ humanizeSeconds(govParams.max_deposit_period) }}
            </div>
            <div>
              <span class="opacity-70">Min Initial Deposit Ratio:</span>
              {{
                govParams.min_initial_deposit_ratio
                  ? percentLabel(govParams.min_initial_deposit_ratio)
                  : '—'
              }}
            </div>
            <div>
              <span class="opacity-70">Min Deposit Ratio:</span>
              {{ govParams.min_deposit_ratio ? percentLabel(govParams.min_deposit_ratio) : '—' }}
            </div>
            <div>
              <span class="opacity-70">Expedited Min Deposit:</span>
              {{ formatCoins(govParams.expedited_min_deposit) }}
            </div>
          </div>
        </div>

        <div class="card bg-base-200/50">
          <div class="card-body p-3 text-sm">
            <div class="font-medium">Voting</div>
            <div class="mb-2">
              <span class="opacity-70">Voting Period:</span>
              {{ humanizeSeconds(govParams.voting_period) }}
            </div>
            <div><span class="opacity-70">Quorum:</span> {{ percentLabel(govParams.quorum) }}</div>
            <div>
              <span class="opacity-70">Threshold:</span> {{ percentLabel(govParams.threshold) }}
            </div>
            <div>
              <span class="opacity-70">Veto Threshold:</span>
              {{ percentLabel(govParams.veto_threshold) }}
            </div>
            <div class="mt-2">
              <span class="opacity-70">Expedited Voting Period:</span>
              {{ humanizeSeconds(govParams.expedited_voting_period) }}
            </div>
            <div>
              <span class="opacity-70">Expedited Threshold:</span>
              {{
                govParams.expedited_threshold ? percentLabel(govParams.expedited_threshold) : '—'
              }}
            </div>
          </div>
        </div>

        <div class="card bg-base-200/50 sm:col-span-2">
          <div class="card-body p-3 text-sm">
            <div class="font-medium">Other</div>
            <div class="flex flex-wrap gap-3">
              <div>
                <span class="opacity-70">Burn Vote Quorum: </span>
                {{ govParams.burn_vote_quorum ? 'Yes' : 'No' }}
              </div>
              <div>
                <span class="opacity-70">Burn Prevote Deposit: </span>
                {{ govParams.burn_proposal_deposit_prevote ? 'Yes' : 'No' }}
              </div>
              <div>
                <span class="opacity-70">Burn Vote Veto: </span>
                {{ govParams.burn_vote_veto ? 'Yes' : 'No' }}
              </div>
              <div>
                <span class="opacity-70">Cancel Ratio: </span>
                {{
                  govParams.proposal_cancel_ratio
                    ? percentLabel(govParams.proposal_cancel_ratio)
                    : '—'
                }}
              </div>
              <div class="min-w-0">
                <span class="opacity-70">Cancel Dest: </span>
                <span class="truncate inline-block max-w-[12rem] align-bottom">{{
                  govParams.proposal_cancel_dest || '—'
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/50 sm:col-span-2">
          <div class="card-body p-3 text-sm">
            <div class="font-medium">Authority</div>
            <div>
              <span class="opacity-70">Authority address: </span>
              <span class="font-mono">{{ upgradeAuthorityAddress || '—' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Accordion type="single" collapsible>
      <AccordionItem value="submit">
        <AccordionTrigger>Submit New Proposal</AccordionTrigger>
        <AccordionContent>
          <div class="space-y-3">
            <WalletSelector v-model="proposer" :button-class="''" :msg-type-filter="disableAuthz" />
            <Input v-model="title" class="w-full" placeholder="title (optional)" />
            <Input v-model="summary" class="w-full" placeholder="summary (optional)" />
            <Textarea
              ref="messagesTextarea"
              v-model="messages"
              class="w-full h-28 resize-none overflow-hidden"
              placeholder="messages JSON (Anys)"
            />
            <Textarea
              ref="depositTextarea"
              v-model="initialDeposit"
              class="w-full h-20 resize-none overflow-hidden"
              placeholder="initial_deposit JSON (coins)"
            />
            <Input v-model="metadata" class="w-full" placeholder="metadata (optional)" />
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model:checked="expedited" />
              <span>Expedited</span>
            </label>
          </div>
          <div class="flex flex-wrap gap-2 mt-3">
            <Button size="sm" :disabled="isSubmitting" @click="submit">
              {{ isSubmitting ? 'Submitting…' : 'Submit Proposal' }}
            </Button>
          </div>
          <div v-if="submitError" class="text-sm text-red-600 mt-2">{{ submitError }}</div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>

    <div class="flex items-center justify-between">
      <div class="text-lg font-medium">Governance Proposals</div>
      <Button size="sm" :disabled="isLoading" @click="refresh">
        {{ isLoading ? 'Loading…' : 'Refresh' }}
      </Button>
    </div>
    <div v-if="error" class="text-sm text-red-600">{{ error }}</div>

    <div class="border rounded">
      <div v-if="isLoading" class="p-3 text-sm opacity-70">Loading…</div>
      <div v-else-if="proposals.length === 0" class="p-3 text-sm opacity-70">
        No proposals found.
      </div>
      <template v-else>
        <div
          v-for="p in proposals"
          :key="p.id"
          class="p-3 flex items-center justify-between hover:bg-base-200/50"
        >
          <div class="min-w-0">
            <RouterLink
              :to="{ name: 'GovernanceProposal', params: { proposalId: p.id } }"
              class="font-medium"
            >
              #{{ p.id }} — {{ p.title || 'Untitled' }}
            </RouterLink>
            <div class="text-xs opacity-70 truncate" v-if="p.summary">{{ p.summary }}</div>
            <div class="">
              <Badge
                v-for="w in unlockedWallets"
                :key="w.address"
                :variant="voteBadgeVariant(p.id, w.address)"
                :title="w.address"
                class="text-xs"
              >
                {{ voteBadgeLabel(p.id, w.address) }}
              </Badge>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Badge variant="outline" class="text-xs">{{ p.status }}</Badge>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
