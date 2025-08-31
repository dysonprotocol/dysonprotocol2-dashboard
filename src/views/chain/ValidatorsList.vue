<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import { useRouter } from 'vue-router'
import Validator from '@/orm/models/staking/Validator'

const api = useAxiosRepo(Validator).api()
const repo = useRepo(Validator)
const router = useRouter()

interface ValidatorRow {
  operator_address: string
  moniker: string
  status: string
}

const validators = computed<ValidatorRow[]>(() => repo.all() as unknown as ValidatorRow[])

function openDetails(operatorAddress: string) {
  router.push({ name: 'ValidatorDetails', params: { valAddress: operatorAddress } })
}

onMounted(() => {
  api.fetchAll().catch((e: unknown) => console.error(e))
})
</script>

<template>
  <div class="p-4 space-y-3">
    <div class="text-lg font-medium">Validators</div>
    <div class="overflow-x-auto max-w-3xl mx-auto">
      <table class="table table-zebra w-full" data-testid="validators-table">
        <thead>
          <tr>
            <th class="w-1/3">Moniker</th>
            <th class="w-1/2">Operator</th>
            <th class="w-20 text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="v in validators"
            :key="v.operator_address"
            class="hover cursor-pointer hover:bg-base-300"
            @click="openDetails(v.operator_address)"
          >
            <td class="font-medium">
              <RouterLink
                :to="{ name: 'ValidatorDetails', params: { valAddress: v.operator_address } }"
                class="link link-hover"
                @click.stop
              >
                {{ v.moniker || v.operator_address }}
              </RouterLink>
            </td>
            <td>
              <code class="text-xs">{{ v.operator_address }}</code>
            </td>
            <td class="text-right">
              <span class="badge badge-ghost badge-sm">{{ v.status }}</span>
            </td>
          </tr>
          <tr v-if="validators.length === 0">
            <td colspan="3" class="text-center text-sm opacity-70">No validators found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
