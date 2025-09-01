<template>
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    <div class="">
      <!-- top-level delegate -->
      <fieldset class="space-y-1 flex flex-col gap-2 border rounded border-base-content/10 p-2">
        <legend>Delegate</legend>
        <form class="flex flex-col gap-2" @submit.prevent="submitDelegateTop">
          <div class="form-control w-full">
            <label class="">Validator</label>
            <select v-model="topDelValoper" class="select select-bordered w-full">
              <option value="">Select validator</option>
              <option
                v-for="(opt, idx) in validatorOptions('')"
                :key="opt.operator_address || idx"
                :value="opt.operator_address"
              >
                {{ opt.description?.moniker || opt.moniker || opt.operator_address }} —
                {{ opt.status || 'unknown' }}
              </option>
            </select>
          </div>

          <div class="form-control w-full">
            <label class="">Amount</label>
            <div class="text-[11px] opacity-70 mb-1">
              Available:
              {{ spendableDisplayFor('udys').amount }} {{ spendableDisplayFor('udys').denom }}
            </div>
            <div class="join w-full">
              <input
                v-model="topDelAmount"
                class="input input-bordered w-full join-item"
                placeholder="amount"
              />
              <div class="join-item input bg-base-300" style="width: 3.5rem">dys</div>
            </div>
          </div>

          <button class="btn btn-primary w-full" type="submit" :disabled="!canDelegateTop">
            Delegate
          </button>
          <div v-if="topDelegateError" class="alert alert-error">
            <span>{{ topDelegateError }}</span>
          </div>
        </form>
      </fieldset>

      <!-- total all rewards -->
      <div class="space-y-4">
        <fieldset class="space-y-1 flex flex-col gap-2 border rounded border-base-content/10 p-2">
          <legend>Withdraw All</legend>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Total reward:</h3>
            <code class="font-mono">{{ totalRewardsDisplay }}</code>
          </div>

          <button class="btn btn-success w-full" :disabled="!canWithdrawAll" @click="withdrawAll">
            Withdraw All
          </button>
          <div v-if="withdrawAllError" class="alert alert-error">
            <span>{{ withdrawAllError }}</span>
          </div>
        </fieldset>
      </div>
      <!-- Withdraw Address -->

      <fieldset class="space-y-1 border rounded border-base-content/10 p-2">
        <legend>Set Withdraw Address</legend>
        <div class="flex items-center gap-2 justify-between">
          <span class="font-semibold">Current: </span>

          <AddressDisplay :address="currentWithdrawAddr" :truncate="100" />
        </div>

        <form class="flex flex-col gap-2" @submit.prevent="submitSetWithdrawAddress">
          <div class="form-control w-full">
            <label class="">New address</label>
            <ResolveNameOrAddresInput
              v-model="withdrawAddr"
              v-model:text="withdrawAddrText"
              class="w-full"
            />
          </div>
          <button class="btn btn-primary w-full" type="submit" :disabled="!canSetWithdraw">
            Set
          </button>
          <div v-if="setWithdrawError" class="w-full">
            <div class="alert alert-error text-sm">
              <span>{{ setWithdrawError }}</span>
            </div>
          </div>
        </form>
      </fieldset>
    </div>

    <div
      v-for="d in delegations"
      :key="d.validator_address"
      class="p-4 border rounded border-base-content/10 space-y-3 bg-base-200"
    >
      <div class="space-y-1">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">
            {{ monikerByVal(d.validator_address) || 'Validator' }}
          </h3>
          <span class="badge badge-sm">{{
            validatorByOp(d.validator_address)?.status || 'unknown'
          }}</span>
        </div>
        <div class="font-mono break-all">
          {{ d.validator_address }}
        </div>
        <div v-if="validatorByOp(d.validator_address)?.description?.website" class="opacity-80">
          <a
            :href="validatorByOp(d.validator_address)?.description?.website"
            target="_blank"
            class="link link-hover"
            >{{ validatorByOp(d.validator_address)?.description?.website }}</a
          >
        </div>
        <div v-if="validatorByOp(d.validator_address)?.description?.details" class="opacity-70">
          {{ validatorByOp(d.validator_address)?.description?.details }}
        </div>
      </div>

      <div class="text-sm">
        <div>
          Shares: <code>{{ d.shares }}</code>
        </div>
        <div>
          Rewards:
          <code>{{ rewardDisplayByVal(d.validator_address).amount }}</code>
          <span class="opacity-70">{{ rewardDisplayByVal(d.validator_address).denom }}</span>
          <button class="btn btn-xlg btn-success ml-2" @click="withdraw(d.validator_address)">
            Withdraw
          </button>
        </div>

        <form class="" @submit.prevent="submitDelegatePer(d.validator_address)">
          <fieldset
            class="space-y-1 grid grid-cols-3 gap-2 items-end border rounded border-base-content/10 p-2"
          >
            <legend>Delegate</legend>
            <div class="col-span-2">
              <label class="">Amount</label>
              <div class="text-[11px] opacity-70 mb-1">
                Available:
                {{ spendableDisplayFor('udys').amount }} {{ spendableDisplayFor('udys').denom }}
              </div>
              <div class="join w-full">
                <input
                  v-model="delAmount[d.validator_address]"
                  class="input input-bordered w-full join-item"
                  placeholder="amount"
                />
                <div class="join-item input bg-base-300" style="width: 3.5rem">dys</div>
              </div>
            </div>
            <button
              class="btn btn-primary"
              type="submit"
              :disabled="!canDelegatePer(d.validator_address)"
            >
              Delegate
            </button>
            <div v-if="delegateErrorByVal[d.validator_address]" class="text-red-600 col-span-3">
              {{ delegateErrorByVal[d.validator_address] }}
            </div>
          </fieldset>
        </form>

        <form class="" @submit.prevent="submitRedelegatePer(d.validator_address)">
          <fieldset
            class="space-y-1 grid grid-cols-3 gap-2 items-end border rounded border-base-content/10 p-2"
          >
            <legend>Redelegate</legend>
            <div class="col-span-2">
              <label class="">Redelegate To</label>
              <select v-model="redDst[d.validator_address]" class="select select-bordered w-full">
                <option value="">Select destination</option>
                <option
                  v-for="(opt, idx) in validatorOptions(d.validator_address)"
                  :key="opt.operator_address || idx"
                  :value="opt.operator_address"
                >
                  {{ opt.description?.moniker || opt.moniker || opt.operator_address }}
                </option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="">Amount</label>
              <div class="join w-full">
                <input
                  v-model="redAmountMap[d.validator_address]"
                  class="input input-bordered w-full join-item"
                  placeholder="amount"
                />
                <div class="join-item input bg-base-300" style="width: 3.5rem">dys</div>
              </div>
            </div>
            <button
              class="btn btn-primary col-span-4 md:col-span-1"
              type="submit"
              :disabled="!canRedelegatePer(d.validator_address)"
            >
              Redelegate
            </button>
            <div v-if="redelegateErrorByVal[d.validator_address]" class="text-red-600 col-span-4">
              {{ redelegateErrorByVal[d.validator_address] }}
            </div>
          </fieldset>
        </form>

        <form class="" @submit.prevent="submitUndelegatePer(d.validator_address)">
          <fieldset
            class="space-y-1 border rounded border-base-content/10 p-2 grid grid-cols-3 gap-2 items-end"
          >
            <legend>Undelegate</legend>
            <div class="col-span-2">
              <label class="">Undelegate Amount</label>
              <div class="join w-full">
                <input
                  v-model="undelegateAmount[d.validator_address]"
                  class="input input-bordered w-full join-item"
                  placeholder="amount"
                />
                <div class="join-item input bg-base-300" style="width: 3.5rem">dys</div>
              </div>
            </div>
            <button
              class="btn btn-warning"
              type="submit"
              :disabled="!canUndelegatePer(d.validator_address)"
            >
              Undelegate
            </button>
            <div v-if="undelegateErrorByVal[d.validator_address]" class="text-red-600 col-span-3">
              {{ undelegateErrorByVal[d.validator_address] }}
            </div>
          </fieldset>
        </form>
      </div>
    </div>
    <div v-if="delegations.length === 0" class="opacity-70">No delegations</div>
  </div>

  <div class="space-y-3">
    <div>
      <h3 class="font-semibold">Unbondings</h3>
      <div v-if="unbondings.length === 0" class="text-sm opacity-70">None</div>
      <div v-else class="overflow-x-auto">
        <table class="table table-xs w-full">
          <thead>
            <tr>
              <th class="text-left">Validator</th>
              <th class="text-left">Balance</th>
              <th class="text-left">Completes</th>
              <th class="text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in unbondings" :key="u.validator_address + ':' + u.creation_height">
              <td>
                <div class="font-mono">
                  {{ u.validator_address }}
                </div>
                <div class="opacity-70">
                  {{ monikerByVal(u.validator_address) }}
                </div>
              </td>
              <td>
                <code>{{ unbondBalanceDisplay(u).amount }}</code>
                <span class="opacity-70">{{ unbondBalanceDisplay(u).denom }}</span>
              </td>
              <td>
                <span class="font-mono">{{ u.completion_time }}</span>
              </td>
              <td>
                <form
                  class="inline-flex gap-2 align-middle"
                  @submit.prevent="submitCancelUnbonding(u)"
                >
                  <fieldset
                    class="space-y-1 border rounded border-base-content/10 p-2 inline-flex gap-2 align-middle"
                  >
                    <legend>Cancel</legend>
                    <div class="join">
                      <input
                        v-model="cancelAmount[u.validator_address + ':' + u.creation_height]"
                        class="input input-bordered input-xs w-28 join-item"
                        placeholder="amount"
                      />
                      <div class="join-item input input-xs bg-base-300" style="width: 3.5rem">
                        dys
                      </div>
                    </div>
                    <button class="btn btn-error btn-xs" type="submit">Cancel</button>
                  </fieldset>
                </form>
                <div
                  v-if="cancelErrorByKey[u.validator_address + ':' + u.creation_height]"
                  class="text-error mt-1"
                >
                  {{ cancelErrorByKey[u.validator_address + ':' + u.creation_height] }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div>
      <h3 class="font-semibold">Redelegations</h3>
      <div v-if="redelegations.length === 0" class="text-sm opacity-70">None</div>
      <div v-else class="overflow-x-auto">
        <table class="table table-xs w-full">
          <thead>
            <tr>
              <th class="text-left">Source</th>
              <th class="text-left">Destination</th>
              <th class="text-left">Balance</th>
              <th class="text-left">Completes</th>
            </tr>
          </thead>
          <tbody>
            <template
              v-for="r in redelegations"
              :key="r.src_validator_address + '>' + r.dst_validator_address"
            >
              <tr
                v-for="(e, idx) in r.entries || []"
                :key="r.src_validator_address + '>' + r.dst_validator_address + ':' + idx"
              >
                <td>
                  <div class="font-mono">
                    {{ r.src_validator_address }}
                  </div>
                  <div class="opacity-70">
                    {{ monikerByVal(r.src_validator_address) }}
                  </div>
                </td>
                <td>
                  <div class="font-mono">
                    {{ r.dst_validator_address }}
                  </div>
                  <div class="opacity-70">
                    {{ monikerByVal(r.dst_validator_address) }}
                  </div>
                </td>
                <td>
                  <code>{{ redelegBalanceDisplay(e).amount }}</code>
                  <span class="opacity-70">{{ redelegBalanceDisplay(e).denom }}</span>
                </td>
                <td>
                  <span class="font-mono">{{
                    String(((e && (e as any).redelegation_entry) || {}).completion_time || '')
                  }}</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed, ref, watchEffect } from 'vue'
import Decimal from 'decimal.js-light'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import Delegation from '@/orm/models/staking/Delegation'
import Validator from '@/orm/models/staking/Validator'
import DelegatorReward from '@/orm/models/distribution/DelegatorReward'
import { useWallet } from '@/composables/useWallet'
import { DenomMetadata } from '@/orm/models/bank/DenomMetadata'
import SpendableBalance from '@/orm/models/bank/SpendableBalance'
import Redelegation from '@/orm/models/staking/Redelegation'
import DelegatorUnbonding from '@/orm/models/staking/Unbonding'
import ResolveNameOrAddresInput from '@/components/ResolveNameOrAddresInput.vue'
import DelegatorWithdrawAddress from '@/orm/models/distribution/DelegatorWithdrawAddress'
import AddressDisplay from '@/components/AddressDisplay.vue'

const props = defineProps<{ address: string }>()

const delRepo = useRepo(Delegation)
const valRepo = useRepo(Validator)
const rewRepo = useRepo(DelegatorReward)
const spendableRepo = useRepo(SpendableBalance)
const redRepo = useRepo(Redelegation)
const unbondRepo = useRepo(DelegatorUnbonding)
const dwaRepo = useRepo(DelegatorWithdrawAddress)

const delegations = computed<any[]>(() =>
  props.address
    ? (delRepo.where('delegator_address', (v: string) => v === props.address).get() as any[])
    : []
)
const validators = computed<any[]>(() => valRepo.all() as any[])
const spendables = computed<any[]>(() =>
  props.address
    ? (spendableRepo.where('address', (v: string) => v === props.address).get() as any[])
    : []
)
const redelegations = computed<any[]>(() =>
  props.address
    ? (redRepo.where('delegator_address', (v: string) => v === props.address).get() as any[])
    : []
)
const unbondings = computed<any[]>(() =>
  props.address
    ? (unbondRepo.where('delegator_address', (v: string) => v === props.address).get() as any[])
    : []
)
const withdrawRow = computed<any | null>(() =>
  props.address ? (dwaRepo.find(props.address) as any | null) : null
)
// YAML helpers removed

function monikerByVal(val: string) {
  const v = (validators.value as any[]).find((x: any) => x.operator_address === val)
  return v?.description?.moniker || v?.moniker || ''
}

function validatorByOp(val: string) {
  return (validators.value as any[]).find((x: any) => x.operator_address === val) as any
}

function validatorOptions(exclude: string) {
  return (validators.value as any[]).filter(
    (x: any) => x && x.operator_address && x.operator_address !== exclude
  )
}

function rewardUdysByVal(val: string) {
  const rows = rewRepo
    .where('delegator_address', (d: string) => d === props.address)
    .where('validator_address', (v: string) => v === val)
    .get() as any[] as Array<{ denom: string; amount: string }>
  let total = new Decimal(0)
  for (const r of rows)
    if (r.denom === 'udys') total = total.plus(new Decimal(String(r.amount || '0')))
  return total.toFixed()
}

function rewardDisplayByVal(val: string) {
  const base = rewardUdysByVal(val)
  try {
    return DenomMetadata.normalize({ amount: base, denom: 'udys' }).display
  } catch {
    return { amount: base, denom: 'udys' }
  }
}

const rewardedValidators = computed<string[]>(() => {
  if (!props.address) return []
  const out: string[] = []
  for (const d of delegations.value as any[]) {
    const amt = new Decimal(String(rewardUdysByVal(d.validator_address) || '0'))
    if (amt.gt(0)) out.push(String(d.validator_address))
  }
  return Array.from(new Set(out))
})
const canWithdrawAll = computed(() => rewardedValidators.value.length > 0)
const totalRewardsDisplay = computed<string>(() => {
  let total = new Decimal(0)
  for (const v of rewardedValidators.value)
    total = total.plus(new Decimal(String(rewardUdysByVal(v) || '0')))
  try {
    const disp = DenomMetadata.normalize({ amount: total.toFixed(), denom: 'udys' }).display
    return `${disp.amount} ${disp.denom}`
  } catch {
    return `${total.toFixed()} udys`
  }
})

function spendableDisplayFor(denom: string): { amount: string; denom: string } {
  try {
    const amt = String(
      (spendables.value as any[]).find((c: any) => String(c.denom) === denom)?.amount || '0'
    )
    return DenomMetadata.normalize({ amount: amt, denom }).display
  } catch {
    return { amount: '0', denom }
  }
}
function unbondBalanceDisplay(u: any): { amount: string; denom: string } {
  try {
    return DenomMetadata.normalize({ amount: String(u?.balance || '0'), denom: 'udys' }).display
  } catch {
    return { amount: String(u?.balance || '0'), denom: 'udys' }
  }
}
function redelegBalanceDisplay(e: any): { amount: string; denom: string } {
  try {
    return DenomMetadata.normalize({ amount: String(e?.balance || '0'), denom: 'udys' }).display
  } catch {
    return { amount: String(e?.balance || '0'), denom: 'udys' }
  }
}

// removed manual decimal addition; using decimal.js-light

const wallet = useWallet()
const error = ref('')
const withdrawAllError = ref('')
const delAmount = ref<Record<string, string>>({})
const delegateErrorByVal = ref<Record<string, string>>({})
function isValidDisplayAmount(s: string) {
  const t = String(s || '').trim()
  if (!/^\d+(?:\.\d+)?$/.test(t)) return false
  return parseFloat(t) > 0
}
function displayToBaseCoin(displayAmount: string): { amount: string; denom: string } {
  try {
    const meta = DenomMetadata.normalize({ amount: '0', denom: 'udys' })
    const displayDenom = meta.display.denom
    const res = DenomMetadata.normalize({
      amount: String(displayAmount || '0'),
      denom: displayDenom,
    })
    return { amount: res.base.amount, denom: res.base.denom }
  } catch {
    return { amount: '', denom: 'udys' }
  }
}
function canDelegatePer(valoper: string) {
  const a = String(delAmount.value[valoper] || '').trim()
  return Boolean(props.address && valoper && isValidDisplayAmount(a))
}

// Set Withdraw Address form state
const withdrawAddr = ref('')
const withdrawAddrText = ref('')
const currentWithdrawAddr = ref('')
const setWithdrawError = ref('')
const canSetWithdraw = computed(() =>
  Boolean(props.address && /^dys2[0-9a-z]{10,}/i.test(withdrawAddr.value))
)

// Redelegate per-card state
const redDst = ref<Record<string, string>>({})
const redAmountMap = ref<Record<string, string>>({})
const redelegateErrorByVal = ref<Record<string, string>>({})
function canRedelegatePer(src: string) {
  const dst = String(redDst.value[src] || '').trim()
  const amt = String(redAmountMap.value[src] || '').trim()
  return Boolean(props.address && src && dst && src !== dst && isValidDisplayAmount(amt))
}

// Undelegate per-card state
const undelegateAmount = ref<Record<string, string>>({})
const undelegateErrorByVal = ref<Record<string, string>>({})
function canUndelegatePer(valoper: string) {
  const a = String(undelegateAmount.value[valoper] || '').trim()
  return Boolean(props.address && valoper && isValidDisplayAmount(a))
}

// Cancel unbonding per-entry state
const cancelAmount = ref<Record<string, string>>({})
const cancelErrorByKey = ref<Record<string, string>>({})

// Top-level delegate state
const topDelValoper = ref('')
const topDelAmount = ref('')
const topDelegateError = ref('')
const canDelegateTop = computed(() =>
  Boolean(
    props.address &&
      String(topDelValoper.value || '').trim() &&
      isValidDisplayAmount(String(topDelAmount.value || '').trim())
  )
)

async function refresh() {
  if (!props.address) return
  await Promise.all([
    useAxiosRepo(Delegation).api().fetchByDelegator(props.address),
    useAxiosRepo(Validator).api().fetchAll(),
    useAxiosRepo(DelegatorReward).api().fetchAll(props.address),
    useAxiosRepo(SpendableBalance).api().fetchAll(props.address),
    useAxiosRepo(Redelegation).api().fetchByDelegator(props.address),
    useAxiosRepo(DelegatorUnbonding).api().fetchAll(props.address),
    useAxiosRepo(DelegatorWithdrawAddress).api().fetch(props.address),
    useAxiosRepo(DenomMetadata).api().fetchAll(),
  ])
  currentWithdrawAddr.value = String(withdrawRow.value?.withdraw_address || '')
}

async function withdraw(validator: string) {
  error.value = ''
  if (!props.address || !validator) return
  try {
    await useAxiosRepo(DelegatorReward)
      .api()
      .withdrawRewards({
        delegatorAddress: props.address,
        validatorAddress: validator,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    await useAxiosRepo(DelegatorReward).api().fetchByValidator(props.address, validator)
  } catch (e: any) {
    console.error(e)
    error.value = e?.message || String(e)
  }
}

async function submitRedelegatePer(srcValoper: string) {
  redelegateErrorByVal.value[srcValoper] = ''
  if (!canRedelegatePer(srcValoper)) return
  try {
    const coin = displayToBaseCoin(redAmountMap.value[srcValoper])
    if (!coin.amount) throw new Error('Invalid amount')
    await useAxiosRepo(Validator)
      .api()
      .beginRedelegate({
        delegatorAddress: props.address,
        srcValidatorAddress: srcValoper,
        dstValidatorAddress: redDst.value[srcValoper],
        amount: coin.amount,
        denom: coin.denom,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    redAmountMap.value[srcValoper] = ''
    await refresh()
  } catch (e: any) {
    console.error(e)
    redelegateErrorByVal.value[srcValoper] = e?.message || String(e)
  }
}

async function submitUndelegatePer(valoper: string) {
  undelegateErrorByVal.value[valoper] = ''
  if (!canUndelegatePer(valoper)) return
  try {
    const coin = displayToBaseCoin(undelegateAmount.value[valoper])
    if (!coin.amount) throw new Error('Invalid amount')
    await useAxiosRepo(Delegation)
      .api()
      .undelegate({
        delegatorAddress: props.address,
        validatorAddress: valoper,
        amount: coin.amount,
        denom: coin.denom,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    undelegateAmount.value[valoper] = ''
    await refresh()
  } catch (e: any) {
    console.error(e)
    undelegateErrorByVal.value[valoper] = e?.message || String(e)
  }
}

async function submitSetWithdrawAddress() {
  setWithdrawError.value = ''
  if (!canSetWithdraw.value) return
  try {
    await useAxiosRepo(DelegatorReward)
      .api()
      .setWithdrawAddress({
        delegatorAddress: props.address,
        withdrawAddress: withdrawAddr.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    await useAxiosRepo(DelegatorWithdrawAddress).api().fetch(props.address)
    currentWithdrawAddr.value = String(withdrawRow.value?.withdraw_address || '')
  } catch (e: any) {
    console.error(e)
    setWithdrawError.value = e?.message || String(e)
  }
}

async function submitDelegatePer(valoper: string) {
  delegateErrorByVal.value[valoper] = ''
  if (!canDelegatePer(valoper)) return
  try {
    const coin = displayToBaseCoin(delAmount.value[valoper])
    if (!coin.amount) throw new Error('Invalid amount')
    await useAxiosRepo(Delegation)
      .api()
      .delegate({
        delegatorAddress: props.address,
        validatorAddress: valoper,
        amount: coin.amount,
        denom: coin.denom,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    delAmount.value[valoper] = ''
    await refresh()
  } catch (e: any) {
    console.error(e)
    delegateErrorByVal.value[valoper] = e?.message || String(e)
  }
}

async function submitDelegateTop() {
  topDelegateError.value = ''
  if (!canDelegateTop.value) return
  try {
    const coin = displayToBaseCoin(topDelAmount.value)
    if (!coin.amount) throw new Error('Invalid amount')
    await useAxiosRepo(Delegation)
      .api()
      .delegate({
        delegatorAddress: props.address,
        validatorAddress: String(topDelValoper.value || ''),
        amount: coin.amount,
        denom: coin.denom,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    topDelAmount.value = ''
    await refresh()
  } catch (e: any) {
    console.error(e)
    topDelegateError.value = e?.message || String(e)
  }
}

async function submitCancelUnbonding(u: any) {
  const key = `${u.validator_address}:${u.creation_height}`
  cancelErrorByKey.value[key] = ''
  try {
    const coin = displayToBaseCoin(cancelAmount.value[key] || u.balance || '0')
    if (!coin.amount) throw new Error('Invalid amount')
    await useAxiosRepo(Delegation)
      .api()
      .cancelUnbondingDelegation({
        delegatorAddress: props.address,
        validatorAddress: String(u.validator_address || ''),
        amount: coin.amount,
        denom: coin.denom,
        creationHeight: String(u.creation_height || '0'),
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    cancelAmount.value[key] = ''
    await refresh()
  } catch (e: any) {
    console.error(e)
    cancelErrorByKey.value[key] = e?.message || String(e)
  }
}

async function withdrawAll() {
  withdrawAllError.value = ''
  if (!props.address || rewardedValidators.value.length === 0) return
  try {
    await useAxiosRepo(DelegatorReward)
      .api()
      .withdrawAllRewards({
        delegatorAddress: props.address,
        validatorAddresses: rewardedValidators.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    await useAxiosRepo(DelegatorReward).api().fetchAll(props.address)
  } catch (e: any) {
    console.error(e)
    withdrawAllError.value = e?.message || String(e)
  }
}

watchEffect(() => {
  if (props.address) void refresh()
})

defineExpose({
  submitSetWithdrawAddress,
  withdrawAddr,
  canSetWithdraw,
  setWithdrawError,
  submitDelegatePer,
  canDelegatePer,
  submitRedelegatePer,
  canRedelegatePer,
  submitUndelegatePer,
  canUndelegatePer,
  submitCancelUnbonding,
})
</script>
