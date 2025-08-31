<template>
  <h2
    id="feegrant"
    class="text-xl font-semibold"
  >
    Feegrant
  </h2>
  <section class="grid gap-6 md:grid-cols-2">
    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Feegrant
      </h3>
      <div class="grid gap-2 md:grid-cols-2">
        <input
          v-model="fgGranter"
          class="input w-full"
          placeholder="granter"
        >
        <input
          v-model="fgGrantee"
          class="input w-full"
          placeholder="grantee"
        >
      </div>
      <div class="flex gap-2">
        <button
          class="btn btn-primary"
          @click="loadFeeAllowance"
        >
          Allowance
        </button>
        <button
          class="btn btn-primary"
          @click="loadFeeAllowancesForGrantee"
        >
          By Grantee
        </button>
        <button
          class="btn btn-primary"
          @click="loadFeeAllowancesByGranter"
        >
          By Granter
        </button>
      </div>
      <ul class="list-disc pl-6 text-sm max-h-40 overflow-auto">
        <li
          v-for="g in feegrants"
          :key="g.granter + ':' + g.grantee"
        >
          <span class="font-mono">{{ g.granter }}</span> →
          <span class="font-mono">{{ g.grantee }}</span>
          <div class="opacity-70">
            type: <code>{{ g.allowance_type_url }}</code>
          </div>
        </li>
      </ul>
      <form
        class="space-y-2"
        @submit.prevent="submitFeeGrant"
      >
        <fieldset class="space-y-2">
          <legend class="text-sm font-semibold opacity-70">
            /cosmos.feegrant.v1beta1.MsgGrantAllowance
          </legend>
          <textarea
            v-model="fgAllowanceJson"
            class="input w-full h-24"
            placeholder="allowance JSON (BasicAllowance, PeriodicAllowance, AllowedMsgAllowance)"
          />
          <div class="flex flex-wrap gap-2">
            <button
              class="btn btn-primary"
              type="button"
              @click="prefillFeegrantBasic"
            >
              Prefill BasicAllowance
            </button>
            <button
              class="btn btn-primary"
              type="button"
              @click="prefillFeegrantPeriodic"
            >
              Prefill PeriodicAllowance
            </button>
            <button
              class="btn btn-primary"
              type="button"
              @click="prefillFeegrantAllowedMsgs"
            >
              Prefill AllowedMsgAllowance
            </button>
          </div>
          <div class="flex gap-2">
            <button
              class="btn btn-primary"
              type="submit"
            >
              Grant
            </button>
            <button
              class="btn btn-primary"
              type="button"
              @click="submitFeeRevoke"
            >
              Revoke
            </button>
            <button
              class="btn btn-primary"
              type="button"
              @click="submitFeePrune"
            >
              Prune
            </button>
          </div>
          <div
            v-if="fgError"
            class="text-sm text-red-600"
          >
            {{ fgError }}
          </div>
        </fieldset>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import FeeGrant from '@/orm/models/feegrant/FeeGrant'
import { useWallet } from '@/composables/useWallet'

const wallet = useWallet()

const feeGrantRepo = useRepo(FeeGrant)
const feegrants = computed(() => feeGrantRepo.all())

const fgGranter = ref('')
const fgGrantee = ref('')
const fgAllowanceJson = ref('')
const fgError = ref('')

async function loadFeeAllowance() {
  fgError.value = ''
  try {
    if (!fgGranter.value || !fgGrantee.value) return
    await useAxiosRepo(FeeGrant).api().fetchAllowance(fgGranter.value, fgGrantee.value)
  } catch (e: any) {
    console.error(e)
    fgError.value = JSON.stringify(e?.response?.data || e, null, 2)
  }
}
async function loadFeeAllowancesForGrantee() {
  fgError.value = ''
  try {
    if (!fgGrantee.value) return
    await useAxiosRepo(FeeGrant).api().fetchAllowancesForGrantee(fgGrantee.value)
  } catch (e: any) {
    console.error(e)
    fgError.value = JSON.stringify(e?.response?.data || e, null, 2)
  }
}
async function loadFeeAllowancesByGranter() {
  fgError.value = ''
  try {
    if (!fgGranter.value) return
    await useAxiosRepo(FeeGrant).api().fetchAllowancesByGranter(fgGranter.value)
  } catch (e: any) {
    console.error(e)
    fgError.value = JSON.stringify(e?.response?.data || e, null, 2)
  }
}
async function submitFeeGrant() {
  fgError.value = ''
  if (!fgGranter.value || !fgGrantee.value || !fgAllowanceJson.value.trim()) {
    fgError.value = 'granter, grantee, and allowance JSON are required'
    return
  }
  try {
    const allowance = JSON.parse(fgAllowanceJson.value)
    await useAxiosRepo(FeeGrant)
      .api()
      .grantAllowance({
        granter: fgGranter.value,
        grantee: fgGrantee.value,
        allowance,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: undefined,
      })
  } catch (e: any) {
    console.error(e)
    fgError.value = JSON.stringify(e?.response?.data || e, null, 2)
  }
}
function prefillFeegrantBasic() {
  const obj = {
    '@type': '/cosmos.feegrant.v1beta1.BasicAllowance',
    spend_limit: [{ denom: 'udys', amount: '1000' }],
    expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }
  fgAllowanceJson.value = JSON.stringify(obj, null, 2)
}
function prefillFeegrantPeriodic() {
  const obj = {
    '@type': '/cosmos.feegrant.v1beta1.PeriodicAllowance',
    basic: {
      spend_limit: [{ denom: 'udys', amount: '1000' }],
      expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    period: '3600s',
    period_spend_limit: [{ denom: 'udys', amount: '100' }],
    period_can_spend: [{ denom: 'udys', amount: '100' }],
    period_reset: new Date(Date.now() + 3600 * 1000).toISOString(),
  }
  fgAllowanceJson.value = JSON.stringify(obj, null, 2)
}
function prefillFeegrantAllowedMsgs() {
  const obj = {
    '@type': '/cosmos.feegrant.v1beta1.AllowedMsgAllowance',
    allowance: {
      '@type': '/cosmos.feegrant.v1beta1.BasicAllowance',
      spend_limit: [{ denom: 'udys', amount: '500' }],
      expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    allowed_messages: ['/cosmos.bank.v1beta1.MsgSend', '/cosmos.staking.v1beta1.MsgDelegate'],
  }
  fgAllowanceJson.value = JSON.stringify(obj, null, 2)
}
async function submitFeeRevoke() {
  fgError.value = ''
  if (!fgGranter.value || !fgGrantee.value) {
    fgError.value = 'granter and grantee are required'
    return
  }
  try {
    await useAxiosRepo(FeeGrant)
      .api()
      .revokeAllowance({
        granter: fgGranter.value,
        grantee: fgGrantee.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: undefined,
      })
    fgAllowanceJson.value = ''
  } catch (e: any) {
    console.error(e)
    fgError.value = JSON.stringify(e?.response?.data || e, null, 2)
  }
}
async function submitFeePrune() {
  fgError.value = ''
  if (!fgGranter.value) {
    fgError.value = 'pruner (granter) is required'
    return
  }
  try {
    await useAxiosRepo(FeeGrant)
      .api()
      .pruneAllowances({
        pruner: fgGranter.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: undefined,
      })
  } catch (e: any) {
    console.error(e)
    fgError.value = JSON.stringify(e?.response?.data || e, null, 2)
  }
}
</script>
