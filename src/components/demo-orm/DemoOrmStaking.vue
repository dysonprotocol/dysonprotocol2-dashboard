<template>
  <h2
    id="staking"
    class="text-xl font-semibold"
  >
    Staking
  </h2>
  <section class="grid gap-6 md:grid-cols-3">
    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Delegations
      </h3>
      <div class="grid gap-2 md:grid-cols-2">
        <input
          v-model="delegatorAddr"
          class="input w-full"
          placeholder="delegator address"
        >
        <button
          class="btn btn-primary"
          @click="loadDelegations"
        >
          Load Delegations
        </button>
      </div>
      <div
        v-if="delegationsError"
        class="text-sm text-red-600"
      >
        {{ delegationsError }}
      </div>
      <ul class="list-disc pl-6">
        <li
          v-for="d in delegations"
          :key="d.delegator_address + ':' + d.validator_address"
        >
          <span class="opacity-70">{{ d.validator_address }}</span> — shares:
          <code>{{ d.shares }}</code>
        </li>
      </ul>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Validators (first 20)
      </h3>
      <div class="flex gap-2">
        <button
          class="btn btn-primary"
          @click="loadValidators"
        >
          Load Validators
        </button>
      </div>
      <div
        v-if="validatorsError"
        class="text-sm text-red-600"
      >
        {{ validatorsError }}
      </div>
      <ul class="list-disc pl-6">
        <li
          v-for="v in validators.slice(0, 20)"
          :key="v.operator_address"
        >
          <span class="font-mono">{{ v.operator_address }}</span>
          <span class="opacity-70"> — {{ v.description?.moniker || v.moniker }}</span>
        </li>
      </ul>
    </div>

    <form
      class="space-y-2 p-4 border rounded"
      @submit.prevent="submitDelegate"
    >
      <fieldset class="space-y-2">
        <legend class="text-sm font-semibold opacity-70">
          /cosmos.staking.v1beta1.MsgDelegate
        </legend>
        <input
          v-model="delFrom"
          class="input w-full"
          placeholder="delegator address"
        >
        <input
          v-model="delValoper"
          class="input w-full"
          placeholder="validator valoper"
        >
        <div class="flex gap-2">
          <input
            v-model="delAmount"
            class="input w-full"
            placeholder="amount"
          >
          <input
            v-model="delDenom"
            class="input w-28"
            placeholder="denom"
          >
        </div>
        <input
          v-model="delMemo"
          class="input w-full"
          placeholder="memo (optional)"
        >
        <button
          class="btn btn-primary"
          type="submit"
        >
          Delegate
        </button>
        <div
          v-if="delegateError"
          class="text-sm text-red-600"
        >
          {{ delegateError }}
        </div>
      </fieldset>
    </form>

    <form
      class="space-y-2 p-4 border rounded"
      @submit.prevent="submitRedelegate"
    >
      <fieldset class="space-y-2">
        <legend class="text-sm font-semibold opacity-70">
          /cosmos.staking.v1beta1.MsgBeginRedelegate
        </legend>
        <input
          v-model="redFrom"
          class="input w-full"
          placeholder="delegator address"
        >
        <input
          v-model="srcValoper"
          class="input w-full"
          placeholder="src valoper"
        >
        <input
          v-model="dstValoper"
          class="input w-full"
          placeholder="dst valoper"
        >
        <div class="flex gap-2">
          <input
            v-model="redAmount"
            class="input w-full"
            placeholder="amount"
          >
          <input
            v-model="redDenom"
            class="input w-28"
            placeholder="denom"
          >
        </div>
        <input
          v-model="redMemo"
          class="input w-full"
          placeholder="memo (optional)"
        >
        <button
          class="btn btn-primary"
          type="submit"
        >
          Redelegate
        </button>
        <div
          v-if="redelegateError"
          class="text-sm text-red-600"
        >
          {{ redelegateError }}
        </div>
      </fieldset>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import Delegation from '@/orm/models/staking/Delegation'
import Validator from '@/orm/models/staking/Validator'
import { useWallet } from '@/composables/useWallet'

const delegatorAddr = ref('')
const wallet = useWallet()

const delegationRepo = useRepo(Delegation)
const validatorRepo = useRepo(Validator)

const delegations = computed(() =>
  delegatorAddr.value ? delegationRepo.where('delegator_address', delegatorAddr.value).get() : []
)
const validators = computed(() => validatorRepo.all())

const delegationsError = ref('')
async function loadDelegations() {
  delegationsError.value = ''
  if (!delegatorAddr.value) return
  try {
    await useAxiosRepo(Delegation).api().fetchByDelegator(delegatorAddr.value)
  } catch (e: any) {
    console.error(e)
    delegationsError.value = e?.message || String(e)
  }
}
const validatorsError = ref('')
async function loadValidators() {
  validatorsError.value = ''
  try {
    await useAxiosRepo(Validator).api().fetchAll()
  } catch (e: any) {
    console.error(e)
    validatorsError.value = e?.message || String(e)
  }
}

const delFrom = ref('')
const delValoper = ref('')
const delAmount = ref('')
const delDenom = ref('udys')
const delMemo = ref('')
const delegateError = ref('')

const redFrom = ref('')
const srcValoper = ref('')
const dstValoper = ref('')
const redAmount = ref('')
const redDenom = ref('udys')
const redMemo = ref('')
const redelegateError = ref('')

async function submitDelegate() {
  delegateError.value = ''
  try {
    await useAxiosRepo(Delegation)
      .api()
      .delegate({
        delegatorAddress: delFrom.value,
        validatorAddress: delValoper.value,
        amount: delAmount.value,
        denom: delDenom.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: delMemo.value || undefined,
      })
    await loadDelegations()
  } catch (e: any) {
    console.error(e)
    delegateError.value = e?.message || String(e)
  }
}

async function submitRedelegate() {
  redelegateError.value = ''
  try {
    await useAxiosRepo(Validator)
      .api()
      .beginRedelegate({
        delegatorAddress: redFrom.value,
        srcValidatorAddress: srcValoper.value,
        dstValidatorAddress: dstValoper.value,
        amount: redAmount.value,
        denom: redDenom.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: redMemo.value || undefined,
      })
    await loadDelegations()
  } catch (e: any) {
    console.error(e)
    redelegateError.value = e?.message || String(e)
  }
}
</script>
