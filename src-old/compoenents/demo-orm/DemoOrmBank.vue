<template>
  <h2 class="text-xl font-semibold" id="bank">Bank</h2>
  <section class="grid gap-6 md:grid-cols-3">
    <form class="space-y-2 p-4 border rounded" @submit.prevent="submitSend">
      <fieldset class="space-y-2">
        <legend class="text-sm font-semibold opacity-70">/cosmos.bank.v1beta1.MsgSend</legend>
        <input v-model="sendFrom" class="input w-full" placeholder="from address" />
        <input v-model="sendTo" class="input w-full" placeholder="to address" />
        <div class="flex gap-2">
          <input v-model="sendAmount" class="input w-full" placeholder="amount" />
          <input v-model="sendDenom" class="input w-28" placeholder="denom" />
        </div>
        <input v-model="sendMemo" class="input w-full" placeholder="memo (optional)" />
        <button class="btn btn-primary" type="submit">Send</button>
        <div v-if="sendError" class="text-sm text-red-600">{{ sendError }}</div>
      </fieldset>
    </form>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">Balance by Denom</h3>
      <input v-model="balanceAddr" class="input w-full" placeholder="address" />
      <input v-model="balanceDenom" class="input w-full" placeholder="denom" />
      <button class="btn btn-primary" @click="loadBalanceByDenom">Load</button>
      <div class="text-sm opacity-70">Balances for {{ balanceAddr || '—' }} shown above</div>
      <ul class="list-disc pl-6">
        <li v-for="b in balances" :key="b.address + ':' + b.denom">
          <code>{{ b.amount }}</code> <span class="opacity-70">{{ b.denom }}</span>
        </li>
      </ul>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">Spendable Balances</h3>
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="loadSpendableAll">All</button>
        <input v-model="spendableAddr" class="input w-full" placeholder="address" />
        <input v-model="spendableDenom" class="input w-full" placeholder="denom" />
        <button class="btn btn-primary" @click="loadSpendableByDenom">By Denom</button>
      </div>
      <ul class="list-disc pl-6 text-sm">
        <li v-for="s in spendables" :key="s.address + ':' + s.denom">
          <code>{{ s.amount }}</code> <span class="opacity-70">{{ s.denom }}</span>
        </li>
      </ul>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">Supply</h3>
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="loadSupplyAll">All</button>
        <input v-model="supplyDenom" class="input w-full" placeholder="denom" />
        <button class="btn btn-primary" @click="loadSupplyByDenom">By Denom</button>
      </div>
      <ul class="list-disc pl-6 text-sm max-h-40 overflow-auto">
        <li v-for="c in supplies" :key="c.denom">
          <code>{{ c.amount }}</code> <span class="opacity-70">{{ c.denom }}</span>
        </li>
      </ul>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">Denom Metadata</h3>
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="loadMetadataAll">All</button>
        <input v-model="metadataDenom" class="input w-full" placeholder="denom" />
        <button class="btn btn-primary" @click="loadMetadataOne">One</button>
      </div>
      <ul class="list-disc pl-6 text-sm max-h-40 overflow-auto">
        <li v-for="m in metadatas" :key="m.base">
          <span class="font-mono">{{ m.base }}</span>
          <span class="opacity-70"> — {{ m.name }} ({{ m.symbol }}) display={{ m.display }}</span>
        </li>
      </ul>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">Send Enabled</h3>
      <input
        v-model="sendEnabledDenoms"
        class="input w-full"
        placeholder="denoms (comma separated)"
      />
      <button class="btn btn-primary" @click="loadSendEnabled">Load</button>
      <ul class="list-disc pl-6 text-sm">
        <li v-for="e in sendEnabledList" :key="e.denom">
          <span class="font-mono">{{ e.denom }}</span> —
          <span :class="e.enabled ? 'text-emerald-600' : 'text-red-600'">{{
            e.enabled ? 'enabled' : 'disabled'
          }}</span>
        </li>
      </ul>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">Bank Params</h3>
      <button class="btn btn-primary" @click="loadBankParams">Load</button>
      <div class="text-sm">
        <div>
          default_send_enabled: <code>{{ bankParams?.default_send_enabled }}</code>
        </div>
        <div class="opacity-70">
          send_enabled entries: {{ bankParams?.send_enabled?.length || 0 }}
        </div>
      </div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">Denom Owners</h3>
      <div class="grid gap-2 md:grid-cols-4">
        <input v-model="ownersDenom" class="border rounded px-2 py-1 w-full" placeholder="denom" />
        <input
          v-model="ownersPageKey"
          class="border rounded px-2 py-1 w-full"
          placeholder="pagination.key (optional)"
        />
        <button class="btn btn-primary" @click="loadDenomOwners">By Path</button>
        <button class="btn btn-primary" @click="loadDenomOwnersByQuery">By Query</button>
      </div>
      <ul class="list-disc pl-6 text-sm max-h-56 overflow-auto">
        <li v-for="o in denomOwners" :key="o.denom + ':' + o.address">
          <span class="font-mono">{{ o.address }}</span> — <code>{{ o.amount }}</code>
          <span class="opacity-70">{{ o.denom }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import Balance from '@/orm/models/bank/Balance'
import SpendableBalance from '@/orm/models/bank/SpendableBalance'
import DenomMetadata from '@/orm/models/bank/DenomMetadata'
import SendEnabled from '@/orm/models/bank/SendEnabled'
import Supply from '@/orm/models/bank/Supply'
import BankParams from '@/orm/models/bank/BankParams'
import DenomOwner from '@/orm/models/bank/DenomOwner'
import { useWallet } from '@/composables/useWallet'

const balanceAddr = ref('')
const spendableAddr = ref('')
const wallet = useWallet()

const balanceRepo = useRepo(Balance)
const spendableRepo = useRepo(SpendableBalance)
const metadataRepo = useRepo(DenomMetadata)
const sendEnabledRepo = useRepo(SendEnabled)
const supplyRepo = useRepo(Supply)
const bankParamsRepo = useRepo(BankParams)
const denomOwnerRepo = useRepo(DenomOwner)

const balances = computed(() =>
  balanceAddr.value ? balanceRepo.where('address', balanceAddr.value).get() : []
)
const spendables = computed(() =>
  spendableAddr.value ? spendableRepo.where('address', spendableAddr.value).get() : []
)
const metadatas = computed(() => metadataRepo.all())
const supplies = computed(() => supplyRepo.all())
const sendEnabledList = computed(() => sendEnabledRepo.all())
const bankParams = computed(() => bankParamsRepo.first())
const denomOwners = computed(() => denomOwnerRepo.all())

const sendFrom = ref('')
const sendTo = ref('')
const sendAmount = ref('')
const sendDenom = ref('udys')
const sendMemo = ref('')
const sendError = ref('')

async function submitSend() {
  sendError.value = ''
  try {
    await useAxiosRepo(Balance)
      .api()
      .sendCoins({
        fromAddress: sendFrom.value,
        toAddress: sendTo.value,
        amount: sendAmount.value,
        denom: sendDenom.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: sendMemo.value || undefined,
      })
    if (balanceAddr.value) await useAxiosRepo(Balance).api().fetchByAddress(balanceAddr.value)
  } catch (e: any) {
    console.error(e)
    sendError.value = e?.message || String(e)
  }
}

const balanceDenom = ref('')
async function loadBalanceByDenom() {
  if (!balanceAddr.value || !balanceDenom.value) return
  await useAxiosRepo(Balance).api().fetchByDenom(balanceAddr.value, balanceDenom.value)
}

const spendableDenom = ref('')
async function loadSpendableAll() {
  if (!spendableAddr.value) return
  await useAxiosRepo(SpendableBalance).api().fetchAll(spendableAddr.value)
}
async function loadSpendableByDenom() {
  if (!spendableAddr.value || !spendableDenom.value) return
  await useAxiosRepo(SpendableBalance).api().fetchByDenom(spendableAddr.value, spendableDenom.value)
}

const metadataDenom = ref('')
async function loadMetadataAll() {
  await useAxiosRepo(DenomMetadata).api().fetchAll()
}
async function loadMetadataOne() {
  if (!metadataDenom.value) return
  await useAxiosRepo(DenomMetadata).api().fetchOne(metadataDenom.value)
}

const supplyDenom = ref('')
async function loadSupplyAll() {
  await useAxiosRepo(Supply).api().fetchAll()
}
async function loadSupplyByDenom() {
  if (!supplyDenom.value) return
  await useAxiosRepo(Supply).api().fetchByDenom(supplyDenom.value)
}

const sendEnabledDenoms = ref('')
async function loadSendEnabled() {
  const denoms = sendEnabledDenoms.value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length)
  await useAxiosRepo(SendEnabled).api().fetchAll(denoms)
}

async function loadBankParams() {
  await useAxiosRepo(BankParams).api().fetchParams()
}

const ownersDenom = ref('')
const ownersPageKey = ref('')
async function loadDenomOwners() {
  if (!ownersDenom.value) return
  await useAxiosRepo(DenomOwner)
    .api()
    .fetchOwners(ownersDenom.value, ownersPageKey.value || undefined)
}
async function loadDenomOwnersByQuery() {
  if (!ownersDenom.value) return
  await useAxiosRepo(DenomOwner)
    .api()
    .fetchOwnersByQuery(ownersDenom.value, ownersPageKey.value || undefined)
}
</script>
