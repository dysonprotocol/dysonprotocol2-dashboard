<template>
  <h2 class="text-xl font-semibold" id="slashing">Slashing</h2>
  <section class="grid gap-6 md:grid-cols-3">
    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">Slashing: Params</h3>
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="loadParams">Load Params</button>
      </div>
      <div class="text-sm">
        <div>
          signed_blocks_window: <code>{{ params?.signed_blocks_window }}</code>
        </div>
        <div>
          min_signed_per_window: <code>{{ params?.min_signed_per_window }}</code>
        </div>
        <div>
          downtime_jail_duration: <code>{{ params?.downtime_jail_duration }}</code>
        </div>
        <div>
          slash_fraction_double_sign: <code>{{ params?.slash_fraction_double_sign }}</code>
        </div>
        <div>
          slash_fraction_downtime: <code>{{ params?.slash_fraction_downtime }}</code>
        </div>
      </div>
      <div v-if="paramsError" class="text-sm text-red-600">{{ paramsError }}</div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">Slashing: Signing Info</h3>
      <div class="grid gap-2">
        <input v-model="consAddr" class="input w-full" placeholder="consensus address" />
        <div class="flex gap-2">
          <button class="btn btn-primary" @click="loadSigningInfo">By Address</button>
          <button class="btn btn-secondary" @click="loadSigningInfos">All</button>
        </div>
      </div>
      <ul class="list-disc pl-6 text-sm max-h-56 overflow-auto">
        <li v-for="s in signingInfos" :key="s.cons_address">
          <div class="font-mono">{{ s.cons_address }}</div>
          <div class="opacity-70">
            start_height=<code>{{ s.start_height }}</code> index_offset=<code>{{
              s.index_offset
            }}</code>
          </div>
          <div class="opacity-70">
            jailed_until=<code>{{ s.jailed_until }}</code> tombstoned=<code>{{
              s.tombstoned
            }}</code>
          </div>
          <div class="opacity-70">
            missed=<code>{{ s.missed_blocks_counter }}</code>
          </div>
        </li>
      </ul>
      <div v-if="signingError" class="text-sm text-red-600">{{ signingError }}</div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">Slashing: Unjail</h3>
      <input
        v-model="validatorAddr"
        class="input w-full"
        placeholder="validator operator address"
      />
      <input v-model="unjailMemo" class="input w-full" placeholder="memo (optional)" />
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="submitUnjail">Unjail</button>
      </div>
      <div v-if="unjailError" class="text-sm text-red-600">{{ unjailError }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import SlashingParams from '@/orm/models/slashing/Params'
import SlashingSigningInfo from '@/orm/models/slashing/SigningInfo'
import Validator from '@/orm/models/staking/Validator'
import { useWallet } from '@/composables/useWallet'

const wallet = useWallet()

const paramsRepo = useRepo(SlashingParams)
const signingRepo = useRepo(SlashingSigningInfo)

const params = computed(() => paramsRepo.first())
const signingInfos = computed(() => signingRepo.all())

const paramsError = ref('')
const signingError = ref('')
const unjailError = ref('')

const consAddr = ref('')
const validatorAddr = ref('')
const unjailMemo = ref('')

async function loadParams() {
  paramsError.value = ''
  try {
    await useAxiosRepo(SlashingParams).api().fetchParams()
  } catch (e: any) {
    console.error(e)
    paramsError.value = e?.message || String(e)
  }
}

async function loadSigningInfo() {
  signingError.value = ''
  try {
    if (!consAddr.value) return
    await useAxiosRepo(SlashingSigningInfo).api().fetch(consAddr.value)
  } catch (e: any) {
    console.error(e)
    signingError.value = e?.message || String(e)
  }
}

async function loadSigningInfos() {
  signingError.value = ''
  try {
    await useAxiosRepo(SlashingSigningInfo).api().fetchAll()
  } catch (e: any) {
    console.error(e)
    signingError.value = e?.message || String(e)
  }
}

async function submitUnjail() {
  unjailError.value = ''
  try {
    await useAxiosRepo(Validator)
      .api()
      .unjail({
        validatorAddress: validatorAddr.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: unjailMemo.value || undefined,
      })
  } catch (e: any) {
    console.error(e)
    unjailError.value = e?.message || String(e)
  }
}
</script>
