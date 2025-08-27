<template>
  <h2 class="text-xl font-semibold" id="gov">Gov</h2>
  <section class="grid gap-6 md:grid-cols-3">
    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">Gov</h3>
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="loadProposals">Load Proposals</button>
      </div>
      <ul class="list-disc pl-6 text-sm max-h-40 overflow-auto">
        <li v-for="p in proposals" :key="p.id">
          <span class="font-mono">#{{ p.id }}</span> —
          <span class="opacity-70">{{ p.status }}</span>
          <div class="opacity-70">{{ p.title || p.summary }}</div>
        </li>
      </ul>
      <form class="space-y-2" @submit.prevent="submitGovVote">
        <fieldset class="space-y-2">
          <legend class="text-sm font-semibold opacity-70">/cosmos.gov.v1.MsgVote</legend>
          <input v-model="govProposalId" class="input w-full" placeholder="proposal_id" />
          <input v-model="govProposer" class="input w-full" placeholder="voter" />
          <input
            v-model="govVoteOption"
            class="input w-full"
            placeholder="option (1=yes,2=abstain,3=no,4=no_with_veto)"
          />
          <button class="btn btn-primary" type="submit">Vote</button>
          <div v-if="govError" class="text-sm text-red-600">{{ govError }}</div>
        </fieldset>
      </form>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <form class="space-y-2" @submit.prevent="submitGovProposal">
        <fieldset class="space-y-2">
          <legend class="text-sm font-semibold opacity-70">/cosmos.gov.v1.MsgSubmitProposal</legend>
          <input v-model="govProposer" class="input w-full" placeholder="proposer" />
          <textarea
            v-model="govMessages"
            class="input w-full h-24"
            placeholder="messages JSON (Anys)"
          ></textarea>
          <textarea
            v-model="govInitialDeposit"
            class="input w-full h-20"
            placeholder="initial_deposit JSON (coins)"
          ></textarea>
          <input v-model="govTitle" class="input w-full" placeholder="title (optional)" />
          <input v-model="govSummary" class="input w-full" placeholder="summary (optional)" />
          <input v-model="govMetadata" class="input w-full" placeholder="metadata (optional)" />
          <div class="flex flex-wrap gap-2">
            <button class="btn btn-primary" type="button" @click="prefillGovMsgSend">
              Prefill MsgSend
            </button>
            <button class="btn btn-primary" type="button" @click="prefillGovDeposit">
              Prefill Deposit
            </button>
          </div>
          <button class="btn btn-primary" type="submit">Submit Proposal</button>
          <div v-if="govError" class="text-sm text-red-600">{{ govError }}</div>
        </fieldset>
      </form>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <form class="space-y-2" @submit.prevent="submitGovDeposit">
        <fieldset class="space-y-2">
          <legend class="text-sm font-semibold opacity-70">/cosmos.gov.v1.MsgDeposit</legend>
          <input v-model="govProposalId" class="input w-full" placeholder="proposal_id" />
          <input v-model="govProposer" class="input w-full" placeholder="depositor" />
          <textarea
            v-model="govDepositAmount"
            class="input w-full h-20"
            placeholder="amount JSON (coins)"
          ></textarea>
          <div class="flex flex-wrap gap-2">
            <button class="btn btn-primary" type="button" @click="prefillGovDepositAmount">
              Prefill Amount
            </button>
          </div>
          <button class="btn btn-primary" type="submit">Deposit</button>
          <div v-if="govError" class="text-sm text-red-600">{{ govError }}</div>
        </fieldset>
      </form>
    </div>
  </section>

  <section class="grid gap-6 md:grid-cols-3">
    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">Gov Votes</h3>
      <div class="grid gap-2 md:grid-cols-2">
        <input v-model="govProposalId" class="input w-full" placeholder="proposal_id" />
        <button class="btn btn-primary" @click="loadGovVotes">Load Votes</button>
      </div>
      <ul class="list-disc pl-6 text-sm max-h-56 overflow-auto">
        <li v-for="v in govVotes" :key="v.proposal_id + ':' + v.voter">
          <span class="font-mono">{{ v.voter }}</span> — on #{{ v.proposal_id }}
          <span class="opacity-70"> meta={{ v.metadata || '—' }}</span>
        </li>
      </ul>
      <div v-if="govVotesError" class="text-sm text-red-600">{{ govVotesError }}</div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">Gov Deposits</h3>
      <div class="grid gap-2 md:grid-cols-2">
        <input v-model="govProposalId" class="input w/full" placeholder="proposal_id" />
        <button class="btn btn-primary" @click="loadGovDeposits">Load Deposits</button>
      </div>
      <ul class="list-disc pl-6 text-sm max-h-56 overflow-auto">
        <li v-for="d in govDeposits" :key="d.proposal_id + ':' + d.depositor">
          <span class="font-mono">{{ d.depositor }}</span> — #{{ d.proposal_id }}
          <span class="opacity-70">
            amount={{
              (d.amount || []).map((c: any) => c.amount + ' ' + c.denom).join(', ') || '—'
            }}
          </span>
        </li>
      </ul>
      <div v-if="govDepositsError" class="text-sm text-red-600">{{ govDepositsError }}</div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">Gov Tally</h3>
      <div class="grid gap-2 md:grid-cols-2">
        <input v-model="govProposalId" class="input w-full" placeholder="proposal_id" />
        <button class="btn btn-primary" @click="loadGovTally">Load Tally</button>
      </div>
      <div class="text-sm">
        <div>
          yes: <code>{{ govTally?.yes_count || '0' }}</code>
        </div>
        <div>
          abstain: <code>{{ govTally?.abstain_count || '0' }}</code>
        </div>
        <div>
          no: <code>{{ govTally?.no_count || '0' }}</code>
        </div>
        <div>
          no_with_veto: <code>{{ govTally?.no_with_veto_count || '0' }}</code>
        </div>
      </div>
      <div v-if="govTallyError" class="text-sm text-red-600">{{ govTallyError }}</div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">Gov Params</h3>
      <div class="flex flex-wrap gap-2">
        <button class="btn btn-primary" @click="loadGovParamsVoting">Voting</button>
        <button class="btn btn-primary" @click="loadGovParamsTallying">Tallying</button>
        <button class="btn btn-primary" @click="loadGovParamsDeposit">Deposit</button>
      </div>
      <div class="text-sm">
        <div>
          min_deposit:
          <code>{{
            (govParams?.min_deposit || []).map((c: any) => c.amount + ' ' + c.denom).join(', ')
          }}</code>
        </div>
        <div>
          max_deposit_period: <code>{{ govParams?.max_deposit_period }}</code>
        </div>
        <div>
          voting_period: <code>{{ govParams?.voting_period }}</code>
        </div>
        <div>
          quorum: <code>{{ govParams?.quorum }}</code>
        </div>
        <div>
          threshold: <code>{{ govParams?.threshold }}</code>
        </div>
        <div>
          veto_threshold: <code>{{ govParams?.veto_threshold }}</code>
        </div>
        <div>
          min_initial_deposit_ratio: <code>{{ govParams?.min_initial_deposit_ratio }}</code>
        </div>
        <div>
          proposal_cancel_ratio: <code>{{ govParams?.proposal_cancel_ratio }}</code>
        </div>
        <div>
          proposal_cancel_dest: <code>{{ govParams?.proposal_cancel_dest }}</code>
        </div>
        <div>
          expedited_voting_period: <code>{{ govParams?.expedited_voting_period }}</code>
        </div>
        <div>
          expedited_threshold: <code>{{ govParams?.expedited_threshold }}</code>
        </div>
        <div>
          expedited_min_deposit:
          <code>{{
            (govParams?.expedited_min_deposit || [])
              .map((c: any) => c.amount + ' ' + c.denom)
              .join(', ')
          }}</code>
        </div>
        <div>
          burn_vote_quorum: <code>{{ String(govParams?.burn_vote_quorum) }}</code>
        </div>
        <div>
          burn_proposal_deposit_prevote:
          <code>{{ String(govParams?.burn_proposal_deposit_prevote) }}</code>
        </div>
        <div>
          burn_vote_veto: <code>{{ String(govParams?.burn_vote_veto) }}</code>
        </div>
        <div>
          min_deposit_ratio: <code>{{ govParams?.min_deposit_ratio }}</code>
        </div>
      </div>
      <div v-if="govParamsError" class="text-sm text-red-600">{{ govParamsError }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import GovProposal from '@/orm/models/gov/Proposal'
import GovParams from '@/orm/models/gov/Params'
import GovDeposit from '@/orm/models/gov/Deposit'
import GovVote from '@/orm/models/gov/Vote'
import GovTally from '@/orm/models/gov/Tally'
import { useWallet } from '@/composables/useWallet'

const wallet = useWallet()

const govRepo = useRepo(GovProposal)
const govParamsRepo = useRepo(GovParams)
const govDepositRepo = useRepo(GovDeposit)
const govVoteRepo = useRepo(GovVote)
const govTallyRepo = useRepo(GovTally)

const proposals = computed(() => govRepo.all())
const govParams = computed(() => govParamsRepo.first())
const govDeposits = computed(() => govDepositRepo.all())
const govVotes = computed(() => govVoteRepo.all())
const govTally = computed(() => govTallyRepo.first())

const govProposer = ref('')
const govInitialDeposit = ref('[{"denom":"udys","amount":"100"}]')
const govMessages = ref(
  '[{"@type":"/cosmos.bank.v1beta1.MsgSend","from_address":"cosmos1...","to_address":"cosmos1...","amount":[{"denom":"udys","amount":"1"}]}]'
)
const govTitle = ref('Demo Proposal')
const govSummary = ref('Short summary')
const govMetadata = ref('')
const govProposalId = ref('')
const govVoteOption = ref('1')
const govDepositAmount = ref('[{"denom":"udys","amount":"50"}]')
const govError = ref('')
const govVotesError = ref('')
const govDepositsError = ref('')
const govTallyError = ref('')
const govParamsError = ref('')

async function loadProposals() {
  govError.value = ''
  try {
    await useAxiosRepo(GovProposal).api().fetchProposals()
  } catch (e: any) {
    console.error(e)
    govError.value = e?.message || String(e)
  }
}
async function loadGovVotes() {
  govVotesError.value = ''
  try {
    if (!govProposalId.value) return
    await useAxiosRepo(GovVote).api().fetchByProposal(govProposalId.value)
  } catch (e: any) {
    console.error(e)
    govVotesError.value = e?.message || String(e)
  }
}
async function loadGovDeposits() {
  govDepositsError.value = ''
  try {
    if (!govProposalId.value) return
    await useAxiosRepo(GovDeposit).api().fetchByProposal(govProposalId.value)
  } catch (e: any) {
    console.error(e)
    govDepositsError.value = e?.message || String(e)
  }
}
async function loadGovTally() {
  govTallyError.value = ''
  try {
    if (!govProposalId.value) return
    await useAxiosRepo(GovTally).api().fetch(govProposalId.value)
  } catch (e: any) {
    console.error(e)
    govTallyError.value = e?.message || String(e)
  }
}
async function loadGovParamsVoting() {
  govParamsError.value = ''
  try {
    await useAxiosRepo(GovParams).api().fetchByType('voting')
  } catch (e: any) {
    console.error(e)
    govParamsError.value = e?.message || String(e)
  }
}
async function loadGovParamsTallying() {
  govParamsError.value = ''
  try {
    await useAxiosRepo(GovParams).api().fetchByType('tallying')
  } catch (e: any) {
    console.error(e)
    govParamsError.value = e?.message || String(e)
  }
}
async function loadGovParamsDeposit() {
  govParamsError.value = ''
  try {
    await useAxiosRepo(GovParams).api().fetchByType('deposit')
  } catch (e: any) {
    console.error(e)
    govParamsError.value = e?.message || String(e)
  }
}

function prefillGovMsgSend() {
  const msg = [
    {
      '@type': '/cosmos.bank.v1beta1.MsgSend',
      from_address: 'cosmos1...',
      to_address: 'cosmos1...',
      amount: [{ denom: 'udys', amount: '1' }],
    },
  ]
  govMessages.value = JSON.stringify(msg, null, 2)
}
function prefillGovDeposit() {
  const deposit = [{ denom: 'udys', amount: '100' }]
  govInitialDeposit.value = JSON.stringify(deposit, null, 2)
}
function prefillGovDepositAmount() {
  const deposit = [{ denom: 'udys', amount: '50' }]
  govDepositAmount.value = JSON.stringify(deposit, null, 2)
}
async function submitGovProposal() {
  govError.value = ''
  try {
    const messages = JSON.parse(govMessages.value)
    const initial_deposit = JSON.parse(govInitialDeposit.value)
    await useAxiosRepo(GovProposal)
      .api()
      .submitProposal({
        proposer: govProposer.value,
        messages,
        initialDeposit: initial_deposit,
        metadata: govMetadata.value || undefined,
        title: govTitle.value || undefined,
        summary: govSummary.value || undefined,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: undefined,
      })
  } catch (e: any) {
    console.error(e)
    govError.value = e?.message || String(e)
  }
}
async function submitGovVote() {
  govError.value = ''
  try {
    await useAxiosRepo(GovProposal)
      .api()
      .vote({
        proposalId: govProposalId.value,
        voter: govProposer.value,
        option: Number(govVoteOption.value),
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: undefined,
      })
  } catch (e: any) {
    console.error(e)
    govError.value = e?.message || String(e)
  }
}
async function submitGovDeposit() {
  govError.value = ''
  try {
    const amount = JSON.parse(govDepositAmount.value)
    await useAxiosRepo(GovProposal)
      .api()
      .deposit({
        proposalId: govProposalId.value,
        depositor: govProposer.value,
        amount,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: undefined,
      })
  } catch (e: any) {
    console.error(e)
    govError.value = e?.message || String(e)
  }
}
</script>
