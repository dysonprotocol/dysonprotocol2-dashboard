<template>
  <div class="max-w-xl mx-auto">
    <form class="" @submit.prevent="submitSend">
      <Card>
        <CardHeader>
          <CardTitle>Send Coins</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- Signer selection (direct or via authz) -->

          <div>
            Signer:

            <WalletSelector
              v-model="selectedExecutor"
              :show-locked="true"
              :allowed-addresses="[address]"
              :default-address="address"
              :default-grantee="selectedGranteeAddress"
              :button-class="''"
              :msg-type-filter="msgTypeFilter"
              @update:executor-address="onExecutorAddress"
              @update:grantee-address="onGranteeAddress"
              @update:is-authz="onIsAuthz"
              @update:authz-notes="onAuthzNotes"
              @update:selected-grant="onSelectedGrant"
            />
            <div v-if="isAuthz" class="mt-2 text-xs opacity-80 break-all">
              <div v-if="authzNotes">Note: {{ authzNotes }}</div>
              <div v-if="selectedGrant">
                <div>
                  Authz: <code>{{ selectedGrant.type_url }}</code>
                  <span v-if="selectedGrant.expiration" class="ml-2"
                    >exp: {{ selectedGrant.expiration }}</span
                  >
                </div>
                <div
                  v-if="
                    selectedGrant.authorization?.['@type'] ===
                    '/cosmos.bank.v1beta1.SendAuthorization'
                  "
                >
                  <div
                    v-if="
                      Array.isArray(selectedGrant.authorization?.spend_limit) &&
                      selectedGrant.authorization.spend_limit.length
                    "
                  >
                    Limit:
                    <span
                      v-for="c in selectedGrant.authorization.spend_limit"
                      :key="c.denom"
                      class="mr-2"
                      >{{ c.amount }} {{ c.denom }}</span
                    >
                  </div>
                  <div
                    v-if="
                      Array.isArray(selectedGrant.authorization?.allow_list) &&
                      selectedGrant.authorization.allow_list.length
                    "
                  >
                    Allowed recipients:
                    <span class="font-mono">
                      {{ selectedGrant.authorization.allow_list.join(', ') }}
                    </span>
                  </div>
                </div>
              </div>
              <ul v-if="authzWarnings.length" class="text-warning mt-1 list-disc pl-4">
                <li v-for="w in authzWarnings" :key="w">
                  {{ w }}
                </li>
              </ul>
            </div>
          </div>
          <label for="sendFrom"
            >From:
            <Input type="text" name="sendFrom" :value="address" class="w-full" readonly />
          </label>
          <label for="sendTo"
            >To:
            <ResolveNameOrAddresInput
              v-model="sendTo"
              v-model:text="sendToText"
              :disabled="!signerReady"
            />
          </label>
          <div>
            <!-- spendable display amount -->
            <a class="text-xs cursor-pointer hover:underline" @click="spendableClick">
              Spendable:
              {{
                DenomMetadata.normalize({
                  amount: spendables.find((c: any) => c.denom === sendDenom)?.amount || '0',
                  denom: sendDenom,
                }).display.amount
              }}
              {{ sendDenom }}
            </a>
            <!-- amount selector -->
            <AmountDenomSelector
              :base-denoms="allowedBases"
              :default-base-denom="defaultBaseDenom"
              :disabled="!signerReady"
              :base="{ amount: selectorBaseAmount, denom: selectorBaseDenom }"
              @update:base="onUpdateBase"
              @update:display="onUpdateDisplay"
            />
            <ul v-if="sendValidation.length" class="text-xs text-yellow-600 mt-2">
              <li v-for="m in sendValidation" :key="m">
                {{ m }}
              </li>
            </ul>
          </div>
          <div class="text-xs">
            <label for="confirm">
              <Checkbox
                id="confirm"
                v-model:checked="confirm"
                name="confirm"
                :disabled="!hasInputs"
              />
              Confirm Send
              <span class="font-mono">{{ sendAmount || '0' }} {{ sendDenom }}</span>
              to
              <span class="font-mono">{{ sendTo }}</span>
            </label>
          </div>
          <Button type="submit" :disabled="!canSend || !signerReady">Send</Button>
          <Alert v-if="sendError" variant="destructive" class="mt-2">
            <AlertDescription>{{ sendError }}</AlertDescription>
          </Alert>
          <div v-else-if="!signerReady" class="text-sm">
            Unlock this wallet or select an authorized signer to send.
          </div>
        </CardContent>
      </Card>
    </form>

    <Table class="mt-4 max-w-full">
      <template v-for="section in grouped" :key="section.group">
        <TableHeader>
          <TableRow>
            <TableHead colspan="3" class="text-left text-base font-semibold">
              {{ section.group }}
            </TableHead>
          </TableRow>
          <TableRow>
            <TableHead class="text-left">denom</TableHead>
            <TableHead class="text-left">spendable</TableHead>
            <TableHead class="text-left">total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="row in section.items" :key="row.key">
            <TableCell class="font-mono overflow-x-auto">
              {{ row.denom }}
              <div class="text-xs opacity-70 break-all">{{ row.description }}</div>
            </TableCell>

            <TableCell>
              <code>{{ row.spend }}</code>
            </TableCell>
            <TableCell>
              <code>{{ row.total }}</code>
              <span v-if="row.differs" class="ml-1 text-yellow-600">≠</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </template>
      <TableBody v-if="grouped.length === 0">
        <TableRow>
          <TableCell colspan="3" class="opacity-70">No balances</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect, onMounted, ref, watch } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useDebounceFn } from '@vueuse/core'
import Balance from '@/orm/models/bank/Balance'
import SpendableBalance from '@/orm/models/bank/SpendableBalance'
import { DenomMetadata } from '@/orm/models/bank/DenomMetadata'
import { useWallet } from '@/composables/useWallet'
import AmountDenomSelector from '@/components/AmountDenomSelector.vue'
import ResolveNameOrAddresInput from '@/components/ResolveNameOrAddresInput.vue'
import WalletSelector from '@/components/shared/WalletSelector.vue'
import { Grant } from '@/orm/models/authz/Grant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'

const props = defineProps<{ address: string }>()

const balanceRepo = useRepo(Balance)
const spendableRepo = useRepo(SpendableBalance)

const balances = computed<any[]>(() =>
  props.address
    ? (balanceRepo.where('address', (v: string) => v === props.address).get() as any[])
    : []
)
const spendables = computed<any[]>(() =>
  props.address
    ? (spendableRepo.where('address', (v: string) => v === props.address).get() as any[])
    : []
)

// Send coins form state
const wallet = useWallet()
const sendTo = ref('')
const sendToText = ref('')
const sendAmount = ref('')
const sendDenom = ref('udys')
const selectorBaseAmount = ref('')
const selectorBaseDenom = ref('')
const confirm = ref(false)

const sendError = ref('')
const sendValidation = ref<string[]>([])
const isUnlocked = computed(() =>
  wallet.unlockedWallets.value.some((w: any) => w.address === props.address)
)
// Authz selection state via WalletSelector
const selectedExecutor = ref('')
const selectedGranteeAddress = ref('')
const isAuthz = ref(false)
const authzNotes = ref('')
const selectedGrant = ref<any>(null)

// Ready to sign if direct wallet unlocked or an authz signer is selected
const signerReady = computed(() => Boolean(isUnlocked.value || isAuthz.value))
const hasInputs = computed(() =>
  Boolean(
    String(sendTo.value || '').trim() &&
      String(sendAmount.value || '').trim() &&
      String(sendDenom.value || '').trim()
  )
)
const canSend = computed(() => Boolean(props.address && hasInputs.value && confirm.value))

// Bank MsgSend authz filter scoped to this address as granter
function msgTypeFilter(grant: any) {
  const auth = grant?.authorization
  if (!auth?.['@type']) return { valid: false, notes: 'No authorization' }
  if (grant?.granter !== props.address) return { valid: false, notes: 'Different granter' }

  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/cosmos.bank.v1beta1.MsgSend'
    return { valid: ok, notes: ok ? 'Generic Bank MsgSend' : 'Wrong msg' }
  }
  if (auth['@type'] === '/cosmos.bank.v1beta1.SendAuthorization') {
    return { valid: true, notes: 'Bank SendAuthorization' }
  }
  return { valid: false, notes: 'Unsupported authz type' }
}

function onExecutorAddress(addr: string) {
  // For direct selection, executor will equal props.address; for authz, executor is granter
  selectedExecutor.value = addr || ''
}
function onGranteeAddress(addr: string | null) {
  selectedGranteeAddress.value = addr || ''
}
function onIsAuthz(v: boolean) {
  isAuthz.value = !!v
}
function onAuthzNotes(n: string) {
  authzNotes.value = n || ''
}
function onSelectedGrant(g: any) {
  selectedGrant.value = g || null
}

// Compute warnings for SendAuthorization constraints
const authzWarnings = computed(() => {
  const warnings: string[] = []
  if (!isAuthz.value || !selectedGrant.value) return warnings
  const auth = (selectedGrant.value as any)?.authorization || {}
  const type = auth?.['@type'] || ''
  if (type !== '/cosmos.bank.v1beta1.SendAuthorization') return warnings

  // Allow list check
  const allowList: string[] = Array.isArray(auth.allow_list) ? auth.allow_list : []
  if (allowList.length > 0 && sendTo.value && !allowList.includes(sendTo.value))
    warnings.push('Recipient is not in allow_list')

  // Spend limit check per denom
  const limits: Array<{ denom: string; amount: string }> = Array.isArray(auth.spend_limit)
    ? auth.spend_limit
    : []
  const amtStr = String(sendAmount.value || '').trim()
  const denStr = String(sendDenom.value || '').trim()
  if (amtStr && denStr && /^\d+$/.test(amtStr)) {
    const limitEntry = limits.find((c) => String(c.denom) === denStr)
    if (limitEntry) {
      try {
        const limit = BigInt(String(limitEntry.amount || '0'))
        const need = BigInt(amtStr)
        if (need > limit)
          warnings.push('SendAuthorization spend_limit insufficient for this amount')
      } catch {}
    }
  }
  return warnings
})

function spendableClick() {
  const denom = sendDenom.value || defaultBaseDenom.value
  const amount = String(
    (spendables.value as any[]).find((c: any) => String(c.denom) === denom)?.amount || '0'
  )
  selectorBaseDenom.value = sendDenom.value = denom
  selectorBaseAmount.value = sendAmount.value = amount
  runValidation()
}

// Allowed bases limited to denoms with positive spendable balance for this address
const allowedBases = computed(() => {
  const bases = new Set<string>()
  try {
    for (const c of spendables.value as any[]) {
      const amt = BigInt(String(c?.amount || '0'))
      if (amt <= 0n) continue
      const norm = DenomMetadata.normalize({ amount: '0', denom: String(c?.denom || '') })
      const base = norm.base.denom
      if (base) bases.add(base)
    }
    return Array.from(bases)
  } catch (e) {
    console.error('Failed to derive allowed base denoms from spendables', e)
    return [] as string[]
  }
})
const defaultBaseDenom = computed(() => 'udys')

function onUpdateBase(payload: { amount: string; denom: string }) {
  sendAmount.value = payload.amount || ''
  sendDenom.value = payload.denom || ''
  // Keep selector's v-model in sync to avoid resets
  selectorBaseAmount.value = payload.amount || ''
  selectorBaseDenom.value = payload.denom || ''
}
function onUpdateDisplay(_: { amount: string; denom: string }) {
  // no-op for now; could show preview
}

// Debounced, non-blocking validation
function runValidation() {
  const msgs: string[] = []
  const toStr = String(sendTo.value || '').trim()
  const amtStr = String(sendAmount.value || '').trim()
  const denStr = String(sendDenom.value || '').trim()
  if (toStr && !toStr.startsWith('dys2')) msgs.push('Recipient may be invalid')
  if (amtStr) {
    if (!/^\d+$/.test(amtStr)) msgs.push('Amount must be integer base units')
    else if (BigInt(amtStr) <= 0n) msgs.push('Amount must be > 0')
  }
  if (amtStr && denStr) {
    try {
      const bal = balances.value.find((c: any) => String(c.denom) === denStr)
      const balBase = BigInt(String(bal?.amount || '0'))
      const sendBase = BigInt(amtStr)
      if (sendBase > balBase) msgs.push('Insufficient balance')
    } catch {}
  }
  sendValidation.value = msgs
}
const debouncedValidate = useDebounceFn(runValidation, 300)
watch([sendTo, sendAmount, sendDenom, balances], () => {
  if (sendError.value) sendError.value = ''
  if (confirm.value) confirm.value = false
  debouncedValidate()
})

async function submitSend() {
  sendError.value = ''
  if (!signerReady.value) return
  if (!props.address || !sendTo.value || !sendAmount.value || !sendDenom.value) return
  try {
    if (isAuthz.value && selectedGranteeAddress.value) {
      // Wrap MsgSend in MsgExec executed by grantee
      const msg = {
        '@type': '/cosmos.bank.v1beta1.MsgSend',
        from_address: props.address,
        to_address: sendTo.value,
        amount: [{ denom: sendDenom.value, amount: sendAmount.value }],
      }
      await useAxiosRepo(Grant)
        .api()
        .exec({
          grantee: selectedGranteeAddress.value,
          msgs: [msg],
          wallet: { sendMsg: wallet.sendMsg },
          gasLimit: 'auto',
          memo: undefined,
          granterForRefresh: props.address,
        })
    } else {
      await useAxiosRepo(Balance)
        .api()
        .sendCoins({
          fromAddress: props.address,
          toAddress: sendTo.value,
          amount: sendAmount.value,
          denom: sendDenom.value,
          wallet: { sendMsg: wallet.sendMsg },
          gasLimit: 'auto',
        })
    }
    await refresh()
    sendTo.value = ''
    sendAmount.value = ''
    confirm.value = false
    runValidation()
  } catch (e: any) {
    sendError.value = e?.message || String(e)
  }
}

// Load denom metadata once for display conversions
onMounted(async () => {
  await refresh()
})

// Build unified rows keyed by base denom, aggregating spendable and total, rendered in display units
const rows = computed(() => {
  const byBase = new Map<
    string,
    {
      baseDenom: string
      displayDenom: string
      description: string
      spendBase: bigint
      totalBase: bigint
    }
  >()

  function add(list: Array<{ amount: string; denom: string }>, field: 'spendBase' | 'totalBase') {
    for (const c of list || []) {
      try {
        const res = DenomMetadata.normalize({ amount: c.amount, denom: c.denom })
        const baseDenom = res.base.denom
        const baseAmt = BigInt(res.base.amount)
        const displayDenom = res.display.denom
        const description = (res.metadata as any)?.description || ''
        const prev = byBase.get(baseDenom)
        if (!prev)
          byBase.set(baseDenom, {
            baseDenom,
            displayDenom,
            description,
            spendBase: 0n,
            totalBase: 0n,
          })
        const entry = byBase.get(baseDenom)!
        entry[field] = entry[field] + baseAmt
      } catch {
        // ignore malformed rows
      }
    }
  }

  add(spendables.value as any, 'spendBase')
  add(balances.value as any, 'totalBase')

  const out: Array<{
    key: string
    denom: string
    description: string
    spend: string
    total: string
    differs: boolean
  }> = []
  for (const [baseDenom, v] of byBase.entries()) {
    try {
      const spendDisp = DenomMetadata.normalize({
        amount: v.spendBase.toString(),
        denom: baseDenom,
      }).display
      const totalDisp = DenomMetadata.normalize({
        amount: v.totalBase.toString(),
        denom: baseDenom,
      }).display
      out.push({
        key: baseDenom,
        denom: totalDisp.denom,
        description: v.description,
        spend: spendDisp.amount,
        total: totalDisp.amount,
        differs: spendDisp.amount !== totalDisp.amount,
      })
    } catch {
      out.push({
        key: baseDenom,
        denom: v.displayDenom,
        description: v.description,
        spend: '0',
        total: '0',
        differs: false,
      })
    }
  }
  out.sort((a, b) => (a.denom > b.denom ? 1 : a.denom < b.denom ? -1 : 0))
  return out
})

// Group by root (substring before first '/')
const grouped = computed(() => {
  const map = new Map<string, typeof rows.value>()
  for (const r of rows.value) {
    const root = String(r.denom || '').includes('/')
      ? String(r.denom).split('/')[0]
      : String(r.denom || '')
    if (!map.has(root)) map.set(root, [])
    map.get(root)!.push(r)
  }
  // Sort groups by key and items by denom
  const sections: Array<{ group: string; items: typeof rows.value }> = []
  for (const [group, items] of Array.from(map.entries()).sort((a, b) =>
    a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0
  )) {
    sections.push({
      group,
      items: items.sort((a, b) => (a.denom > b.denom ? 1 : a.denom < b.denom ? -1 : 0)),
    })
  }
  return sections
})

async function refresh() {
  if (!props.address) return
  await Promise.allSettled([
    useAxiosRepo(DenomMetadata).api().fetchAll(),
    useAxiosRepo(Balance).api().fetchByAddress(props.address),
    useAxiosRepo(SpendableBalance).api().fetchAll(props.address),
  ])
}

watchEffect(() => {
  if (props.address) void refresh()
})
</script>
