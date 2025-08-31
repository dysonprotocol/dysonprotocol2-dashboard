<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import GovProposal from '@/orm/models/gov/Proposal'
import GovTally from '@/orm/models/gov/Tally'
import GovVote from '@/orm/models/gov/Vote'
import GovDeposit from '@/orm/models/gov/Deposit'

const route = useRoute()
const id = computed(() => String(route.params.proposalId || ''))

const pApi = useAxiosRepo(GovProposal).api()
const tApi = useAxiosRepo(GovTally).api()
const vApi = useAxiosRepo(GovVote).api()
const dApi = useAxiosRepo(GovDeposit).api()

const pRepo = useRepo(GovProposal)
const tRepo = useRepo(GovTally)
const vRepo = useRepo(GovVote)
const dRepo = useRepo(GovDeposit)

onMounted(async () => {
  if (!id.value) return
  await Promise.allSettled([
    pApi.fetchProposal(id.value),
    tApi.fetch(id.value),
    vApi.fetchByProposal(id.value),
    dApi.fetchByProposal(id.value),
  ])
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
    }>
)
const deposits = computed(
  () =>
    dRepo.where('proposal_id', (x: string) => x === id.value).get() as Array<{ depositor: string }>
)
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="text-lg font-medium">Proposal #{{ id }}</div>
    <div v-if="p" class="border rounded p-3 space-y-2">
      <div class="text-sm"><span class="text-gray-500">Title:</span> {{ p.title }}</div>
      <div class="text-sm"><span class="text-gray-500">Status:</span> {{ p.status }}</div>
      <div class="text-sm whitespace-pre-wrap">
        <span class="text-gray-500">Summary:</span> {{ p.summary }}
      </div>
    </div>
    <div v-if="t" class="border rounded p-3 space-y-1">
      <div class="font-medium">Tally</div>
      <div class="text-sm">Yes: {{ t.yes_count }}</div>
      <div class="text-sm">Abstain: {{ t.abstain_count }}</div>
      <div class="text-sm">No: {{ t.no_count }}</div>
      <div class="text-sm">NoWithVeto: {{ t.no_with_veto_count }}</div>
    </div>
    <div class="grid md:grid-cols-2 gap-3">
      <div class="border rounded p-3">
        <div class="font-medium mb-2">Votes</div>
        <div class="space-y-1">
          <div v-for="v in votes" :key="v.voter" class="text-sm flex justify-between">
            <span class="font-mono truncate max-w-[60%]">{{ v.voter }}</span>
            <span class="text-gray-500 truncate max-w-[35%]">{{ v.metadata }}</span>
          </div>
        </div>
      </div>
      <div class="border rounded p-3">
        <div class="font-medium mb-2">Deposits</div>
        <div class="space-y-1">
          <div v-for="d in deposits" :key="d.depositor" class="text-sm">
            {{ d.depositor }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
