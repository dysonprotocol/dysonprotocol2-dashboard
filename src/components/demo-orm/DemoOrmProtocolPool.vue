<template>
  <h2 class="text-xl font-semibold" id="protocol-pool">Protocol Pool</h2>
  <section class="grid gap-6 md:grid-cols-3">
    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">ProtocolPool: Community Pool</h3>
      <button class="btn btn-primary" @click="ppLoadPool">Load Pool</button>
      <ul class="list-disc pl-6 text-sm">
        <li v-for="c in ppPool" :key="c.denom">
          <code>{{ c.amount }}</code> <span class="opacity-70">{{ c.denom }}</span>
        </li>
      </ul>
      <div class="flex gap-2 mt-2">
        <input v-model="ppFundFrom" class="input w-full" placeholder="from address" />
        <input v-model="ppFundAmount" class="input w-40" placeholder="amount" />
        <input v-model="ppFundDenom" class="input w-28" placeholder="denom" />
        <button class="btn btn-primary" @click="ppFund">Fund</button>
      </div>
    </div>
    <div class="space-y-2 p-4 border rounded">
      <div class="grid gap-2">
        <input v-model="ppSpendAuthority" class="input w-full" placeholder="authority" />
        <input v-model="ppSpendRecipient" class="input w-full" placeholder="recipient" />
        <input
          v-model="ppSpendCoins"
          class="input w-full"
          placeholder='coins JSON e.g. [{"denom":"udys","amount":"1"}]'
        />
      </div>
      <button class="btn btn-primary" @click="ppSpend">Spend</button>
      <div v-if="ppPoolError" class="text-sm text-red-600">{{ ppPoolError }}</div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">ProtocolPool: Continuous Funds</h3>
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="cfLoadAll">Load All</button>
        <input v-model="cfRecipient" class="input w-full" placeholder="recipient" />
        <button class="btn btn-primary" @click="cfLoadOne">Load One</button>
      </div>
      <ul class="list-disc pl-6 text-sm max-h-56 overflow-auto">
        <li v-for="cf in cfList" :key="cf.recipient">
          <span class="font-mono">{{ cf.recipient }}</span> — pct: <code>{{ cf.percentage }}</code>
          <span class="opacity-70"> expiry: {{ cf.expiry || '—' }}</span>
        </li>
      </ul>
      <div class="grid gap-2 md:grid-cols-4">
        <input v-model="cfAuthority" class="input w-full" placeholder="authority" />
        <input v-model="cfRecipient" class="input w-full" placeholder="recipient" />
        <input v-model="cfPercentage" class="input w-full" placeholder="percentage (Dec)" />
        <input v-model="cfExpiry" class="input w-full" placeholder="expiry RFC3339 (optional)" />
      </div>
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="cfCreate">Create</button>
        <button class="btn btn-primary" @click="cfCancel">Cancel</button>
      </div>
      <div v-if="cfError" class="text-sm text-red-600">{{ cfError }}</div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">ProtocolPool: Params</h3>
      <button class="btn btn-primary" @click="ppLoadParams">Load Params</button>
      <div class="text-sm">
        <div>
          enabled_distribution_denoms:
          <code>{{ ppParams?.enabled_distribution_denoms?.join(', ') || '' }}</code>
        </div>
        <div>
          distribution_frequency: <code>{{ ppParams?.distribution_frequency }}</code>
        </div>
      </div>
      <div class="grid gap-2 md:grid-cols-3">
        <input v-model="ppParamsAuthority" class="input w-full" placeholder="authority" />
        <input v-model="ppParamsDenomsCsv" class="input w-full" placeholder="denoms (csv)" />
        <input v-model="ppParamsFrequency" class="input w-full" placeholder="frequency (uint64)" />
      </div>
      <button class="btn btn-primary" @click="ppUpdateParams">Update Params</button>
      <div v-if="ppParamsError" class="text-sm text-red-600">{{ ppParamsError }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import ProtocolCommunityPool from '@/orm/models/protocolpool/CommunityPool'
import ProtocolContinuousFund from '@/orm/models/protocolpool/ContinuousFund'
import ProtocolPoolParams from '@/orm/models/protocolpool/Params'
import { useWallet } from '@/composables/useWallet'

const wallet = useWallet()

const ppPoolRepo = useRepo(ProtocolCommunityPool)
const cfRepo = useRepo(ProtocolContinuousFund)
const ppParamsRepo = useRepo(ProtocolPoolParams)

const ppPool = computed(() => ppPoolRepo.all())
const cfList = computed(() => cfRepo.all())
const ppParams = computed(() => ppParamsRepo.first())

const ppPoolError = ref('')
const ppFundFrom = ref('')
const ppFundAmount = ref('')
const ppFundDenom = ref('udys')
const ppSpendAuthority = ref('')
const ppSpendRecipient = ref('')
const ppSpendCoins = ref('[{"denom":"udys","amount":"1"}]')
const cfRecipient = ref('')
const cfAuthority = ref('')
const cfPercentage = ref('0.010000000000000000')
const cfExpiry = ref('')
const cfError = ref('')
const ppParamsAuthority = ref('')
const ppParamsDenomsCsv = ref('udys')
const ppParamsFrequency = ref('100')
const ppParamsError = ref('')

async function ppLoadPool() {
  await useAxiosRepo(ProtocolCommunityPool).api().fetch()
}
async function ppFund() {
  ppPoolError.value = ''
  try {
    await useAxiosRepo(ProtocolCommunityPool)
      .api()
      .fund({
        fromAddress: ppFundFrom.value,
        amount: ppFundAmount.value,
        denom: ppFundDenom.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: undefined,
      })
  } catch (e: any) {
    console.error(e)
    ppPoolError.value = e?.message || String(e)
  }
}
async function ppSpend() {
  ppPoolError.value = ''
  try {
    const coins = JSON.parse(ppSpendCoins.value)
    await useAxiosRepo(ProtocolCommunityPool)
      .api()
      .spend({
        authority: ppSpendAuthority.value,
        recipient: ppSpendRecipient.value,
        coins,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: undefined,
      })
  } catch (e: any) {
    console.error(e)
    ppPoolError.value = e?.message || String(e)
  }
}
async function cfLoadAll() {
  await useAxiosRepo(ProtocolContinuousFund).api().fetchAll()
}
async function cfLoadOne() {
  if (!cfRecipient.value) return
  await useAxiosRepo(ProtocolContinuousFund).api().fetchOne(cfRecipient.value)
}
async function cfCreate() {
  cfError.value = ''
  try {
    await useAxiosRepo(ProtocolContinuousFund)
      .api()
      .create({
        authority: cfAuthority.value,
        recipient: cfRecipient.value,
        percentage: cfPercentage.value,
        expiry: cfExpiry.value || undefined,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: undefined,
      })
  } catch (e: any) {
    console.error(e)
    cfError.value = e?.message || String(e)
  }
}
async function cfCancel() {
  cfError.value = ''
  try {
    await useAxiosRepo(ProtocolContinuousFund)
      .api()
      .cancel({
        authority: cfAuthority.value,
        recipient: cfRecipient.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: undefined,
      })
  } catch (e: any) {
    console.error(e)
    cfError.value = e?.message || String(e)
  }
}
async function ppLoadParams() {
  await useAxiosRepo(ProtocolPoolParams).api().fetch()
}
async function ppUpdateParams() {
  ppParamsError.value = ''
  try {
    const denoms = ppParamsDenomsCsv.value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length)
    await useAxiosRepo(ProtocolPoolParams)
      .api()
      .update({
        authority: ppParamsAuthority.value,
        enabled_distribution_denoms: denoms,
        distribution_frequency: ppParamsFrequency.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: undefined,
      })
  } catch (e: any) {
    console.error(e)
    ppParamsError.value = e?.message || String(e)
  }
}
</script>
