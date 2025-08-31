<template>
  <h2
    id="mint"
    class="text-xl font-semibold"
  >
    Mint
  </h2>
  <section class="grid gap-6 md:grid-cols-3">
    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Mint Params
      </h3>
      <button
        class="btn btn-primary"
        @click="loadMintParams"
      >
        Load Params
      </button>
      <div class="text-sm">
        <div>
          mint_denom: <code>{{ mintParams?.mint_denom }}</code>
        </div>
        <div>
          inflation_rate_change: <code>{{ mintParams?.inflation_rate_change }}</code>
        </div>
        <div>
          inflation_max: <code>{{ mintParams?.inflation_max }}</code>
        </div>
        <div>
          inflation_min: <code>{{ mintParams?.inflation_min }}</code>
        </div>
        <div>
          goal_bonded: <code>{{ mintParams?.goal_bonded }}</code>
        </div>
        <div>
          blocks_per_year: <code>{{ mintParams?.blocks_per_year }}</code>
        </div>
      </div>
      <div
        v-if="mintParamsError"
        class="text-sm text-red-600"
      >
        {{ mintParamsError }}
      </div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Mint Inflation
      </h3>
      <button
        class="btn btn-primary"
        @click="loadMintInflation"
      >
        Load Inflation
      </button>
      <div class="text-sm">
        inflation: <code>{{ mintInflation?.inflation }}</code>
      </div>
      <div
        v-if="mintInflationError"
        class="text-sm text-red-600"
      >
        {{ mintInflationError }}
      </div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Mint Annual Provisions
      </h3>
      <button
        class="btn btn-primary"
        @click="loadMintAnnualProvisions"
      >
        Load Annual
      </button>
      <div class="text-sm">
        annual_provisions: <code>{{ mintAnnualProvisions?.annual_provisions }}</code>
      </div>
      <div
        v-if="mintAnnualError"
        class="text-sm text-red-600"
      >
        {{ mintAnnualError }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import MintParams from '@/orm/models/mint/Params'
import MintInflation from '@/orm/models/mint/Inflation'
import MintAnnualProvisions from '@/orm/models/mint/AnnualProvisions'

const mintParamsRepo = useRepo(MintParams)
const mintInflationRepo = useRepo(MintInflation)
const mintAnnualRepo = useRepo(MintAnnualProvisions)

const mintParams = computed(() => mintParamsRepo.first())
const mintInflation = computed(() => mintInflationRepo.first())
const mintAnnualProvisions = computed(() => mintAnnualRepo.first())

const mintParamsError = ref('')
const mintInflationError = ref('')
const mintAnnualError = ref('')

async function loadMintParams() {
  mintParamsError.value = ''
  try {
    await useAxiosRepo(MintParams).api().fetch()
  } catch (e: any) {
    console.error(e)
    mintParamsError.value = e?.message || String(e)
  }
}
async function loadMintInflation() {
  mintInflationError.value = ''
  try {
    await useAxiosRepo(MintInflation).api().fetch()
  } catch (e: any) {
    console.error(e)
    mintInflationError.value = e?.message || String(e)
  }
}
async function loadMintAnnualProvisions() {
  mintAnnualError.value = ''
  try {
    await useAxiosRepo(MintAnnualProvisions).api().fetch()
  } catch (e: any) {
    console.error(e)
    mintAnnualError.value = e?.message || String(e)
  }
}
</script>
