<script setup lang="ts">
import { onMounted } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import GovProposal from '@/orm/models/gov/Proposal'

const api = useAxiosRepo(GovProposal).api()
const repo = useRepo(GovProposal)

onMounted(() => {
  api.fetchProposals().catch((e: unknown) => console.error(e))
})
</script>

<template>
  <div class="p-4 space-y-3">
    <div class="text-lg font-medium">Governance Proposals</div>
    <div class="border rounded divide-y">
      <div
        v-for="p in repo.all() as Array<{ id: string; title: string; status: string }>"
        :key="p.id"
        class="p-3 flex items-center justify-between hover:bg-gray-50"
      >
        <RouterLink
          :to="{ name: 'GovernanceProposal', params: { proposalId: p.id } }"
          class="font-medium"
        >
          #{{ p.id }} — {{ p.title || 'Untitled' }}
        </RouterLink>
        <div class="text-xs text-gray-500">{{ p.status }}</div>
      </div>
    </div>
  </div>
</template>
