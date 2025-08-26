<template>
  <h2 class="text-xl font-semibold" id="distribution">Distribution</h2>
  <section class="grid gap-6 md:grid-cols-3">
    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">Distribution: Delegator Rewards</h3>
      <div class="flex gap-2">
        <input v-model="delFrom" class="input w-full" placeholder="delegator address" />
        <button class="btn btn-primary" @click="loadDelegatorRewards">All</button>
      </div>
      <div class="flex gap-2">
        <input v-model="delValoper" class="input w-full" placeholder="validator valoper" />
        <button class="btn btn-primary" @click="loadDelegatorRewardByValidator">
          By Validator
        </button>
      </div>
      <ul class="list-disc pl-6 text-sm max-h-56 overflow-auto">
        <li
          v-for="r in delegatorRewards"
          :key="r.delegator_address + ':' + r.validator_address + ':' + r.denom"
        >
          <span class="font-mono">{{ r.validator_address }}</span> — <code>{{ r.amount }}</code>
          <span class="opacity-70">{{ r.denom }}</span>
        </li>
      </ul>
      <h4 class="font-semibold">Total</h4>
      <button class="btn btn-primary" @click="loadDelegatorTotal">Load Total</button>
      <ul class="list-disc pl-6 text-sm">
        <li v-for="t in delegatorTotals" :key="t.delegator_address + ':' + t.denom">
          <code>{{ t.amount }}</code> <span class="opacity-70">{{ t.denom }}</span>
        </li>
      </ul>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <form class="space-y-2" @submit.prevent="withdrawDelegatorReward">
        <fieldset class="space-y-2">
          <legend class="text-sm font-semibold opacity-70">
            /cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward
          </legend>
          <input v-model="wdDelegator" class="input w-full" placeholder="delegator address" />
          <input v-model="wdValoper" class="input w-full" placeholder="validator valoper" />
          <input v-model="withdrawMemo" class="input w-full" placeholder="memo (optional)" />
          <div class="flex gap-2">
            <button class="btn btn-primary" type="submit">Withdraw Reward</button>
          </div>
          <div v-if="withdrawRewardError" class="text-sm text-red-600">
            {{ withdrawRewardError }}
          </div>
        </fieldset>
      </form>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <form class="space-y-2" @submit.prevent="setWithdrawAddress">
        <fieldset class="space-y-2">
          <legend class="text-sm font-semibold opacity-70">
            /cosmos.distribution.v1beta1.MsgSetWithdrawAddress
          </legend>
          <input v-model="swaDelegator" class="input w-full" placeholder="delegator address" />
          <input v-model="withdrawAddr" class="input w-full" placeholder="new withdraw address" />
          <button class="btn btn-primary" type="submit">Set Withdraw Address</button>
          <div v-if="setWithdrawAddrError" class="text-sm text-red-600">
            {{ setWithdrawAddrError }}
          </div>
        </fieldset>
      </form>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">Distribution: Validator Commission & Community Pool</h3>
      <div class="flex gap-2">
        <input v-model="srcValoper" class="input w-full" placeholder="validator valoper" />
        <button class="btn btn-primary" @click="loadValidatorCommission">Load Commission</button>
      </div>
      <form class="space-y-2" @submit.prevent="withdrawCommission">
        <fieldset class="space-y-2">
          <legend class="text-sm font-semibold opacity-70">
            /cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission
          </legend>
          <div class="flex gap-2">
            <input v-model="commissionSigner" class="input w-full" placeholder="signer address" />
            <button class="btn btn-primary" type="submit">Withdraw Commission</button>
          </div>
          <div v-if="withdrawCommissionError" class="text-sm text-red-600">
            {{ withdrawCommissionError }}
          </div>
        </fieldset>
      </form>
      <ul class="list-disc pl-6 text-sm">
        <li v-for="c in validatorCommissions" :key="c.validator_address + ':' + c.denom">
          <code>{{ c.amount }}</code> <span class="opacity-70">{{ c.denom }}</span>
        </li>
      </ul>
      <h4 class="font-semibold">Community Pool</h4>
      <div class="flex gap-2 mt-2">
        <input v-model="poolFrom" class="input w-full" placeholder="from address" />
        <input v-model="poolAmount" class="input w-40" placeholder="amount" />
        <input v-model="poolDenom" class="input w-28" placeholder="denom" />
        <button class="btn btn-primary" @click="fundCommunityPool">Fund</button>
      </div>
      <div v-if="fundCommunityPoolError" class="text-sm text-red-600">
        {{ fundCommunityPoolError }}
      </div>
      <ul class="list-disc pl-6 text-sm">
        <li v-for="p in communityPool" :key="p.denom">
          <code>{{ p.amount }}</code> <span class="opacity-70">{{ p.denom }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import DelegatorReward from '@/orm/models/distribution/DelegatorReward'
import DelegatorTotalReward from '@/orm/models/distribution/DelegatorTotalReward'
import ValidatorCommission from '@/orm/models/distribution/ValidatorCommission'
import CommunityPool from '@/orm/models/distribution/CommunityPool'
import { useWallet } from '@/composables/useWallet'

const wallet = useWallet()

const deRewardRepo = useRepo(DelegatorReward)
const deTotalRepo = useRepo(DelegatorTotalReward)
const valCommissionRepo = useRepo(ValidatorCommission)
const communityPoolRepo = useRepo(CommunityPool)

const delegatorRewards = computed(() => deRewardRepo.all())
const delegatorTotals = computed(() => deTotalRepo.all())
const validatorCommissions = computed(() => valCommissionRepo.all())
const communityPool = computed(() => communityPoolRepo.all())

const delFrom = ref('')
const delValoper = ref('')
const srcValoper = ref('')
const wdDelegator = ref('')
const wdValoper = ref('')
async function loadDelegatorRewards() {
  if (!delFrom.value) return
  await useAxiosRepo(DelegatorReward).api().fetchAll(delFrom.value)
}
async function loadDelegatorRewardByValidator() {
  if (!delFrom.value || !delValoper.value) return
  await useAxiosRepo(DelegatorReward).api().fetchByValidator(delFrom.value, delValoper.value)
}
async function loadDelegatorTotal() {
  if (!delFrom.value) return
  await useAxiosRepo(DelegatorTotalReward).api().fetch(delFrom.value)
}
async function loadValidatorCommission() {
  if (!srcValoper.value) return
  await useAxiosRepo(ValidatorCommission).api().fetch(srcValoper.value)
}
const withdrawMemo = ref('')
const withdrawRewardError = ref('')
async function withdrawDelegatorReward() {
  const delegatorAddress = wdDelegator.value || delFrom.value
  const validatorAddress = wdValoper.value || delValoper.value
  if (!delegatorAddress || !validatorAddress) return
  withdrawRewardError.value = ''
  try {
    await useAxiosRepo(DelegatorReward)
      .api()
      .withdrawRewards({
        delegatorAddress,
        validatorAddress,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: withdrawMemo.value || undefined,
      })
  } catch (e: any) {
    console.error(e)
    withdrawRewardError.value = e?.message || String(e)
  }
}
const withdrawAddr = ref('')
const swaDelegator = ref('')
const setWithdrawAddrError = ref('')
async function setWithdrawAddress() {
  const delegatorAddress = swaDelegator.value || delFrom.value
  if (!delegatorAddress || !withdrawAddr.value) return
  setWithdrawAddrError.value = ''
  try {
    await useAxiosRepo(DelegatorReward)
      .api()
      .setWithdrawAddress({
        delegatorAddress,
        withdrawAddress: withdrawAddr.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: withdrawMemo.value || undefined,
      })
  } catch (e: any) {
    console.error(e)
    setWithdrawAddrError.value = e?.message || String(e)
  }
}
const commissionSigner = ref('')
const withdrawCommissionError = ref('')
async function withdrawCommission() {
  if (!srcValoper.value || !commissionSigner.value) return
  withdrawCommissionError.value = ''
  try {
    await useAxiosRepo(ValidatorCommission)
      .api()
      .withdrawCommission({
        validatorAddress: srcValoper.value,
        signerAddress: commissionSigner.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: undefined,
      })
    await loadValidatorCommission()
  } catch (e: any) {
    console.error(e)
    withdrawCommissionError.value = e?.message || String(e)
  }
}
const poolFrom = ref('')
const poolAmount = ref('')
const poolDenom = ref('udys')
const fundCommunityPoolError = ref('')
async function fundCommunityPool() {
  if (!poolFrom.value || !poolAmount.value || !poolDenom.value) {
    fundCommunityPoolError.value = 'from address, amount, and denom are required'
    return
  }
  fundCommunityPoolError.value = ''
  try {
    await useAxiosRepo(CommunityPool)
      .api()
      .fund({
        fromAddress: poolFrom.value,
        amount: poolAmount.value,
        denom: poolDenom.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: undefined,
      })
    await useAxiosRepo(CommunityPool).api().fetch()
  } catch (e: any) {
    console.error(e)
    fundCommunityPoolError.value = e?.message || String(e)
  }
}
</script>
