<template>
  <div class="space-y-4 w-full mx-auto md:w-3/4">
    <h1 class="text-2xl font-semibold">Name: {{ routeName }}</h1>
    <div>
      <div v-if="hasLoadedName && !nft" class="space-y-3">
        <div class="alert alert-info">This name is available</div>
        <RegisterName :initial-name="routeName" @registered="onRegistered" />
      </div>
      <div v-else class="flex flex-wrap">
        <div class="rounded-box p-4 w-full">
          <div v-if="!hasLoadedName" class="opacity-70">Loading…</div>
          <div v-else-if="errorName" class="text-error">
            {{ errorName }}
          </div>
          <table v-else class="table table-sm">
            <tbody>
              <tr>
                <th>Owner</th>
                <td>
                  <AddressDisplay :address="ownerAddress" :truncate="0" />
                </td>
              </tr>
              <tr>
                <th>Class ID</th>
                <td class="font-mono">
                  {{ nft?.class_id }}
                </td>
              </tr>
              <tr>
                <th>ID</th>
                <td class="font-mono">
                  {{ nft?.id }}
                </td>
              </tr>
              <tr>
                <th>Destination</th>
                <td class="space-y-2">
                  <div class="font-mono break-all">
                    {{ nft?.uri || '—' }}
                  </div>
                  <input
                    v-model.trim="destination"
                    class="input input-bordered w-full font-mono"
                    placeholder="bech32 or name"
                    :disabled="isSettingDest || !hasLoadedName"
                  />
                  <div v-if="setDestError" class="text-error text-sm">
                    {{ setDestError }}
                  </div>
                  <div class="mt-2 grid grid-cols-2 gap-2">
                    <WalletSelector
                      v-model="selectedExecutor"
                      :allowed-addresses="allowedOwnerAddresses"
                      :default-address="ownerAddress"
                      :button-class="'btn-sm w-full'"
                      :msg-type-filter="msgTypeFilter"
                      :show-locked="false"
                      @update:executor-address="onExecutorAddress"
                      @update:grantee-address="onGranteeAddress"
                      @update:is-authz="onIsAuthz"
                    />
                    <button
                      class="btn btn-primary btn-sm"
                      :disabled="isSettingDest || !canSetDestination || !hasLoadedName"
                      @click="setDestination"
                    >
                      Save Destination
                    </button>
                  </div>
                </td>
              </tr>
              <tr>
                <th>Resolved</th>
                <td>
                  <AddressDisplay :address="resolvedAddress" :truncate="0" />
                </td>
              </tr>
              <tr>
                <th>Valuation</th>
                <td>
                  <span v-if="valuationDisplay.label"
                    >{{ valuationDisplay.amount }} {{ valuationDisplay.label }}</span
                  >
                  <span v-else>—</span>
                </td>
              </tr>
              <tr>
                <th>Valuation Expiry</th>
                <td>{{ formatIso(nft?.data?.valuation_expiry) }}</td>
              </tr>
              <tr>
                <th>Current Bidder</th>
                <td class="font-mono break-all">
                  {{ nft?.data?.current_bidder || '' }}
                </td>
              </tr>
              <tr>
                <th>Current Bid</th>
                <td>
                  <span v-if="bidDisplay.label"
                    >{{ bidDisplay.amount }} {{ bidDisplay.label }}</span
                  >
                  <span v-else>—</span>
                </td>
              </tr>
              <tr>
                <th>Bid Timestamp</th>
                <td>{{ formatIso(nft?.data?.bid_timestamp) }}</td>
              </tr>
              <tr>
                <th>Metadata</th>
                <td class="space-y-2">
                  <div class="break-words whitespace-pre-wrap">
                    {{ nft?.data?.metadata || '' }}
                  </div>
                  <textarea
                    v-model.trim="metadataValue"
                    class="textarea textarea-bordered w-full"
                    rows="3"
                    placeholder="metadata"
                    :disabled="isSettingMetadata || !hasLoadedName"
                  />
                  <div v-if="setMetadataError" class="text-error text-sm">
                    {{ setMetadataError }}
                  </div>
                  <div class="mt-2 grid grid-cols-2 gap-2">
                    <WalletSelector
                      v-model="selectedExecutorMeta"
                      :allowed-addresses="allowedOwnerAddresses"
                      :default-address="ownerAddress"
                      :button-class="'btn-sm w-full'"
                      :msg-type-filter="msgTypeFilterNameMetadata"
                      :show-locked="false"
                      @update:executor-address="onExecutorAddressMeta"
                      @update:grantee-address="onGranteeAddressMeta"
                      @update:is-authz="onIsAuthzMeta"
                    />
                    <button
                      class="btn btn-primary btn-sm"
                      :disabled="isSettingMetadata || !ownerAddress || !hasLoadedName"
                      @click="setNameMetadata"
                    >
                      Save Metadata
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="p-4 w-full lg:w-1/2">
          <div class="font-medium mb-2">Denoms</div>
          <Card class="border rounded p-3">
            <CardHeader class="p-0 mb-2">
              <CardTitle class="font-medium">Mint coin(s)</CardTitle>
            </CardHeader>
            <CardContent class="p-0">
              <div class="text-xs opacity-70 mb-2">
                Destination: <span class="font-mono">{{ resolvedAddress }}</span>
              </div>
              <form class="grid grid-cols-1" @submit.prevent="mintCoins">
                <div class="space-y-2">
                  <div class="w-full space-y-1">
                    <Label for="mintDisplayAmount">Display Amount</Label>
                    <Input
                      id="mintDisplayAmount"
                      :value="mintAmountDisplay"
                      placeholder="amount (display)"
                      type="text"
                      inputmode="decimal"
                      step="0.000001"
                      :disabled="denomBusy === 'mint'"
                      @focus="isEditingDisplay = true"
                      @blur="onDisplayBlur"
                      @input="onDisplayInput"
                    />
                  </div>
                  <div v-if="mintAmountDisplayError" class="text-error text-sm">
                    {{ mintAmountDisplayError }}
                  </div>
                  <div class="w-full space-y-1">
                    <Label for="mintDisplayDenom">Display Denom</Label>
                    <Input id="mintDisplayDenom" :value="mintDisplayLabel" readonly />
                  </div>
                  <ul class="list-disc list-inside text-xs opacity-70 space-y-1">
                    <li>
                      Display Denom: <span class="font-mono">{{ mintDisplayLabel }}</span>
                    </li>
                    <li>
                      Display amount:
                      <span class="font-mono">{{ mintAmountDisplayNormalized }}</span>
                    </li>
                    <li>
                      Decimal places:
                      <span v-if="mintDenom === routeName" class="font-mono">6</span>
                      <span v-else class="font-mono">0</span>
                    </li>
                    <li>
                      Base Denom: <span class="font-mono">{{ mintDenom }}</span>
                    </li>
                    <li>
                      Base amount: <span class="font-mono">{{ mintAmount }}</span>
                    </li>
                    <li v-if="hasEstimatedFee">
                      Fee: <span class="font-mono">{{ estimatedFeeDisplay.amount }}</span>
                      {{ estimatedFeeDisplay.label }}
                      <span class="opacity-70">({{ estimatedFeeUdys }} udys)</span>
                    </li>
                  </ul>
                  <div
                    v-if="denomBusy === 'mint' || !canMint || !confirmMintChecked"
                    class="text-xs text-error/80 space-y-1"
                  >
                    <div class="font-medium">Cannot mint because:</div>
                    <ul class="list-disc list-inside space-y-0.5">
                      <li v-for="r in mintDisabledReasons" :key="r">{{ r }}</li>
                    </ul>
                  </div>
                  <div class="flex items-center gap-2 my-2">
                    <Checkbox id="confirmMintChecked" v-model="confirmMintChecked" />
                    <Label class="cursor-pointer" for="confirmMintChecked">
                      I understand the cost is non-refundable.
                    </Label>
                  </div>
                  <CardFooter class="p-0 mt-2 grid grid-cols-2 gap-2">
                    <WalletSelector
                      v-model="selectedExecutorMint"
                      :allowed-addresses="allowedDestAddresses"
                      :default-address="resolvedAddress"
                      :button-class="'btn-sm w-full'"
                      :msg-type-filter="msgTypeFilterMintCoins"
                      :show-locked="false"
                      @update:executor-address="onExecutorAddressMint"
                      @update:grantee-address="onGranteeAddressMint"
                      @update:is-authz="onIsAuthzMint"
                    />
                    <Button
                      type="submit"
                      :disabled="denomBusy === 'mint' || !canMint || !confirmMintChecked"
                      class="btn-primary btn-sm"
                    >
                      mint
                    </Button>
                  </CardFooter>
                  <div v-if="denomErrMint" class="alert alert-error alert-soft mt-2">
                    {{ denomErrMint }}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
          <BurnCoinsForm />
          <div class="mt-3">
            <div v-if="isLoadingDenoms" class="opacity-70">Loading…</div>
            <div v-else-if="denomsError" class="text-error">
              {{ denomsError }}
            </div>
            <div v-else>
              <div class="flex items-center justify-between mb-2">
                <div v-if="denoms.length === 0" class="opacity-70">No denoms.</div>
                <RouterLink
                  v-else
                  :to="{ name: 'NameDenoms', params: { name: routeName } }"
                  class="link link-primary text-sm"
                >
                  View all
                </RouterLink>
              </div>
              <div v-if="denoms.length > 0" class="overflow-x-auto">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Denom</th>
                      <th class="text-right">Supply</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in denomRows" :key="r.denom">
                      <td class="font-mono">
                        <RouterLink
                          :to="{
                            name: 'NameDenomDetail',
                            params: { name: routeName, denom: r.denom },
                          }"
                          class="link link-primary"
                        >
                          {{ r.denom }}
                        </RouterLink>
                      </td>
                      <td class="text-right font-mono">{{ r.supply }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="p-4 w-full lg:w-1/2">
          <div class="font-medium mb-2">NFT Classes</div>
          <div class="border rounded p-3 bg-base-100">
            <div class="font-medium mb-2">Create NFT Class</div>
            <div class="text-xs opacity-70 mb-2">
              {{ routeName }} managed by: <span class="font-mono">{{ resolvedAddress }}</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                v-model.trim="classForm.classId"
                class="input input-bordered w-full"
                :placeholder="`class id (e.g. ${routeName}/foo)`"
                :disabled="isSavingClass"
              />
              <input
                v-model.trim="classForm.name"
                class="input input-bordered w-full"
                placeholder="name (optional)"
                :disabled="isSavingClass"
              />
              <input
                v-model.trim="classForm.symbol"
                class="input input-bordered w-full"
                placeholder="symbol (optional)"
                :disabled="isSavingClass"
              />
              <input
                v-model.trim="classForm.uri"
                class="input input-bordered w-full"
                placeholder="uri (optional)"
                :disabled="isSavingClass"
              />
            </div>
            <textarea
              v-model.trim="classForm.description"
              class="textarea textarea-bordered w-full mt-2"
              placeholder="description (optional)"
              :disabled="isSavingClass"
            />
            <div v-if="classSaveError" class="text-error text-sm mt-1">
              {{ classSaveError }}
            </div>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <WalletSelector
                v-model="selectedExecutorClass"
                :allowed-addresses="allowedDestAddresses"
                :default-address="resolvedAddress"
                :button-class="'btn-sm w-full'"
                :msg-type-filter="msgTypeFilterSaveClass"
                :show-locked="false"
                @update:executor-address="onExecutorAddressClass"
                @update:grantee-address="onGranteeAddressClass"
                @update:is-authz="onIsAuthzClass"
              />
              <button
                class="btn btn-primary btn-sm"
                :disabled="!canSaveClass || isSavingClass"
                @click="saveClass"
              >
                Create
              </button>
            </div>
          </div>
          <div class="mt-3">
            <div v-if="isLoadingClasses" class="opacity-70">Loading…</div>
            <div v-else-if="classesError" class="text-error">
              {{ classesError }}
            </div>
            <div v-if="classIds.length === 0" class="opacity-70">No classes.</div>
            <div v-else class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>Class ID</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="cid in classIds" :key="cid">
                    <td class="font-mono">
                      <RouterLink
                        :to="{
                          name: 'NameNftClassDetail',
                          params: { name: routeName, classid: cid },
                        }"
                        class="link link-primary"
                      >
                        {{ cid }}
                      </RouterLink>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRoute } from 'vue-router'
import RegisterName from '@/components/names/RegisterName.vue'
import { useWallet } from '@/composables/useWallet'
import WalletSelector from '@/components/shared/WalletSelector.vue'
import AddressDisplay from '@/components/AddressDisplay.vue'
import NameResolution from '@/orm/models/nameservice/NameResolution'
import NftItem from '@/orm/models/nft/NftItem'
import DenomsByName from '@/orm/models/nameservice/DenomsByName'
import ClassesByName from '@/orm/models/nameservice/ClassesByName'
import NameserviceParams from '@/orm/models/nameservice/NameserviceParams'
import NameserviceActions from '@/orm/models/nameservice/Actions'
import BurnCoinsForm from '@/components/names/BurnCoinsForm.vue'
import Supply from '@/orm/models/bank/Supply'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import CardFooter from '@/components/ui/card/CardFooter.vue'
import Label from '@/components/ui/label/Label.vue'
import Input from '@/components/ui/input/Input.vue'
import Checkbox from '@/components/ui/checkbox/Checkbox.vue'
import Button from '@/components/ui/button/Button.vue'

const route = useRoute()
const routeName = computed(() => String(route.params.name || ''))

const isLoading = ref(false)
const hasLoadedName = ref(false)
const errorName = ref('')
const resolvedAddress = ref('')
const nft = ref<{ class_id: string; id: string; uri: string; data?: any } | null>(null)
const ownerAddress = ref('')
const destination = ref('')
const isSettingDest = ref(false)
const setDestError = ref('')
const canSetDestination = computed(() => Boolean(destination.value))
const wallet = useWallet()

// Wallet selection (direct or via Authz)
const selectedExecutor = ref('')
const selectedExecutorAddress = ref('')
const selectedGranteeAddress = ref('')
const isAuthz = ref(false)
const allowedOwnerAddresses = computed(() => (ownerAddress.value ? [ownerAddress.value] : []))
const allowedDestAddresses = computed(() => (resolvedAddress.value ? [resolvedAddress.value] : []))

function msgTypeFilter(grant: any) {
  const auth = grant?.authorization
  if (!auth || !auth['@type']) return { valid: false, notes: 'No authorization' }
  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/dysonprotocol.nameservice.v1.MsgSetDestination'
    return { valid: ok, notes: ok ? 'GenericAuthorization for MsgSetDestination' : 'Wrong msg' }
  }
  return { valid: false, notes: 'Unsupported authz type' }
}

// Wallet selection for metadata
const selectedExecutorMeta = ref('')
const selectedExecutorAddressMeta = ref('')
const selectedGranteeAddressMeta = ref('')
const isAuthzMeta = ref(false)
function msgTypeFilterNameMetadata(grant: any) {
  const auth = grant?.authorization
  if (!auth || !auth['@type']) return { valid: false, notes: 'No authorization' }
  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/dysonprotocol.nameservice.v1.MsgSetNameMetadata'
    return { valid: ok, notes: ok ? 'GenericAuthorization for MsgSetNameMetadata' : 'Wrong msg' }
  }
  return { valid: false, notes: 'Unsupported authz type' }
}
function onExecutorAddressMeta(addr: string) {
  selectedExecutorAddressMeta.value = addr || ''
}
function onGranteeAddressMeta(addr: string) {
  selectedGranteeAddressMeta.value = addr || ''
}
function onIsAuthzMeta(v: boolean) {
  isAuthzMeta.value = !!v
}

// Wallet selection for mint coins
const selectedExecutorMint = ref('')
const selectedExecutorAddressMint = ref('')
const selectedGranteeAddressMint = ref('')
const isAuthzMint = ref(false)
function msgTypeFilterMintCoins(grant: any) {
  const auth = grant?.authorization
  if (!auth || !auth['@type']) return { valid: false, notes: 'No authorization' }
  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/dysonprotocol.nameservice.v1.MsgMintCoins'
    return { valid: ok, notes: ok ? 'GenericAuthorization for MsgMintCoins' : 'Wrong msg' }
  }
  return { valid: false, notes: 'Unsupported authz type' }
}
function onExecutorAddressMint(addr: string) {
  selectedExecutorAddressMint.value = addr || ''
}
function onGranteeAddressMint(addr: string) {
  selectedGranteeAddressMint.value = addr || ''
}
function onIsAuthzMint(v: boolean) {
  isAuthzMint.value = !!v
}

// Wallet selection for save class
const selectedExecutorClass = ref('')
const selectedExecutorAddressClass = ref('')
const selectedGranteeAddressClass = ref('')
const isAuthzClass = ref(false)
function msgTypeFilterSaveClass(grant: any) {
  const auth = grant?.authorization
  if (!auth || !auth['@type']) return { valid: false, notes: 'No authorization' }
  if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
    const ok = auth.msg === '/dysonprotocol.nameservice.v1.MsgSaveClass'
    return { valid: ok, notes: ok ? 'GenericAuthorization for MsgSaveClass' : 'Wrong msg' }
  }
  return { valid: false, notes: 'Unsupported authz type' }
}
function onExecutorAddressClass(addr: string) {
  selectedExecutorAddressClass.value = addr || ''
}
function onGranteeAddressClass(addr: string) {
  selectedGranteeAddressClass.value = addr || ''
}
function onIsAuthzClass(v: boolean) {
  isAuthzClass.value = !!v
}

function onExecutorAddress(addr: string) {
  selectedExecutorAddress.value = addr || ''
}
function onGranteeAddress(addr: string) {
  selectedGranteeAddress.value = addr || ''
}
function onIsAuthz(v: boolean) {
  isAuthz.value = !!v
}

function getDisplayInfoForBase(baseDenom: string) {
  if (String(baseDenom || '') === 'udys') return { display: 'dys2', exponent: 6 }
  return { display: String(baseDenom || ''), exponent: 0 }
}
function baseToDisplayFor(amountBase: string, baseDenom: string) {
  const { exponent } = getDisplayInfoForBase(baseDenom)
  const s = String(amountBase || '0')
  const exp = Number(exponent || 0)
  if (exp <= 0) return s
  if (s.length <= exp) {
    const pad = '0'.repeat(exp - s.length)
    return `0.${pad}${s}`.replace(/\.0+$/, '')
  }
  const i = s.length - exp
  return `${s.slice(0, i)}.${s.slice(i)}`.replace(/\.0+$/, '')
}
const valuationDisplay = computed(() => {
  const coin = nft.value?.data?.valuation || { amount: '0', denom: '' }
  const denom = String(coin?.denom || '')
  if (!denom) return { amount: '0', label: '' }
  return {
    amount: baseToDisplayFor(coin.amount, denom),
    label: getDisplayInfoForBase(denom).display,
  }
})
const bidDisplay = computed(() => {
  const coin = nft.value?.data?.current_bid || { amount: '0', denom: '' }
  const denom = String(coin?.denom || '')
  if (!denom) return { amount: '0', label: '' }
  return {
    amount: baseToDisplayFor(coin.amount, denom),
    label: getDisplayInfoForBase(denom).display,
  }
})

function formatIso(s: string) {
  const v = String(s || '')
  if (!v || v === '0001-01-01T00:00:00Z') return '—'
  try {
    return new Date(v).toISOString().replace('.000Z', 'Z')
  } catch {
    return v
  }
}

// ---- Name metadata ----
const metadataValue = ref('')
const isSettingMetadata = ref(false)
const setMetadataError = ref('')
async function setNameMetadata() {
  if (!ownerAddress.value) return
  isSettingMetadata.value = true
  setMetadataError.value = ''
  try {
    const executor = selectedExecutorAddressMeta.value || ownerAddress.value
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNameMetadata({
        owner: String(ownerAddress.value || ''),
        name: String(routeName.value || ''),
        metadata: String(metadataValue.value || ''),
        wallet,
        executorAddress: executor,
        gasLimit: 'auto',
      })
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`)
    await reload()
  } catch (e: any) {
    setMetadataError.value = e?.message || 'Failed to set metadata'
  } finally {
    isSettingMetadata.value = false
  }
}

async function fetchResolveName(name: string) {
  if (!name) return
  isLoading.value = true
  hasLoadedName.value = false
  errorName.value = ''
  resolvedAddress.value = ''
  nft.value = null
  ownerAddress.value = ''
  try {
    // Resolve and fetch NFT+Owner together
    const nftId = name.endsWith('.dys') ? name : `${name}.dys`
    await Promise.all([
      useAxiosRepo(NameResolution).api().resolve(name),
      useAxiosRepo(NftItem).api().fetchNftWithOwner('nameservice.dys', nftId),
    ])
    const resRepo = useRepo(NameResolution)
    resolvedAddress.value = (resRepo.find(name) as any)?.address || ''
    const itemRepo = useRepo(NftItem)
    const item = (itemRepo
      .query()
      .where('class_id', (v: string) => v === 'nameservice.dys')
      .where('id', (v: string) => v === nftId)
      .first() || null) as any
    nft.value = item
      ? { class_id: item.class_id, id: item.id, uri: item.uri, data: item.data }
      : null
    ownerAddress.value = item?.owner || ''
    destination.value = item?.uri || ''
    metadataValue.value = item?.data?.metadata || ''
  } catch (e: any) {
    errorName.value = e?.message || 'Failed to resolve name'
  } finally {
    isLoading.value = false
    hasLoadedName.value = true
  }
}

// ---- Denoms by name ----
const denoms = ref<string[]>([])
const isLoadingDenoms = ref(false)
const denomsError = ref('')
const denomRows = computed(() => {
  const repo = useRepo(Supply)
  return denoms.value.map((d) => {
    const rec = (repo.find(d) as any) || null
    return { denom: d, supply: String(rec?.amount || '0') }
  })
})
const mintDenom = ref('')
const mintAmount = ref('')
const mintAmountDisplay = ref('')
const mintDisplayLabel = computed(() => String(routeName.value).replace(/\.dys$/, ''))
const mintAmountDisplayError = computed(() => {
  const raw = String(mintAmountDisplay.value || '').trim()
  if (!raw) return ''
  if (!/^\d+(\.\d{0,6})?$/.test(raw)) return 'Invalid amount. Use digits with up to 6 decimals.'
  if (!(parseFloat(raw) > 0)) return 'Amount must be greater than 0.'
  return ''
})
const isDisplayValid = computed(() => !mintAmountDisplayError.value)
const mintAmountDisplayNormalized = computed(() => {
  if (!isDisplayValid.value || !mintAmount.value) return ''
  return baseToDisplayAssuming6(mintAmount.value)
})
const denomBusy = ref('')
const denomErrMint = ref('')
const confirmMintChecked = ref(false)
const canMint = computed(() => Boolean(mintDenom.value) && Boolean(mintAmount.value))
const isEditingDisplay = ref(false)
const mintDisabledReasons = computed(() => {
  const reasons: string[] = []
  if (denomBusy.value === 'mint') reasons.push('Transaction in progress')
  if (!mintDenom.value) reasons.push('Base denom is not set')
  const raw = String(mintAmountDisplay.value || '').trim()
  if (!raw) reasons.push('Enter a valid amount')
  if (mintAmountDisplayError.value) reasons.push(String(mintAmountDisplayError.value))
  if (!confirmMintChecked.value) reasons.push('Please confirm cost is non-refundable')
  return Array.from(new Set(reasons))
})

function baseToDisplayAssuming6(amountBase: string) {
  const s = String(amountBase || '0')
  const exp = 6
  if (s.length <= exp) {
    const pad = '0'.repeat(exp - s.length)
    return `0.${pad}${s}`
  }
  const i = s.length - exp
  return `${s.slice(0, i)}.${s.slice(i)}`.replace(/\.0+$/, '')
}
function displayToBaseAssuming6(amountDisplay: string) {
  const s = String(amountDisplay || '').replace(/[^\d.]/g, '')
  if (!s) return '0'
  const [intRaw, decRaw = ''] = s.split('.')
  const intPart = String(intRaw || '0').replace(/^0+/, '') || '0'
  const exp = 6
  if (exp <= 0) return (intPart || '0').replace(/^0+/, '') || '0'
  const decPart = String(decRaw).slice(0, exp)
  const padded = decPart + '0'.repeat(Math.max(0, exp - decPart.length))
  const base = (intPart || '0') + padded
  return base.replace(/^0+/, '') || '0'
}
watchEffect(() => {
  if (!isDisplayValid.value) {
    mintAmount.value = ''
    return
  }
  mintAmount.value = displayToBaseAssuming6(mintAmountDisplay.value)
})
function onDisplayInput(e: any) {
  const v = String(e?.target?.value ?? '')
  mintAmountDisplay.value = v
  confirmMintChecked.value = false
}
function onDisplayBlur() {
  isEditingDisplay.value = false
}

// Nameservice params (mint fee per base unit)
const mintFeePerUnitUdys = ref('-')
async function loadParams() {
  try {
    await useAxiosRepo(NameserviceParams).api().fetch()
    const repo = useRepo(NameserviceParams)
    const p = (repo.find('default') as any) || {}
    mintFeePerUnitUdys.value = String(p?.mint_fee_per_coin || '-')
  } catch (e) {
    console.error(e)
  }
}
const estimatedFeeUdys = computed(() => {
  const per = Number(mintFeePerUnitUdys.value || 0)
  const amt = Number(mintAmount.value || 0)
  if (!(per > 0 && amt > 0)) return '0'
  return String(per * amt)
})
const hasEstimatedFee = computed(() => Number(estimatedFeeUdys.value || 0) > 0)
const estimatedFeeDisplay = computed(() => {
  const base = String(estimatedFeeUdys.value || '0')
  const s = base.replace(/\D/g, '')
  const exp = 6
  if (s.length <= exp) {
    const pad = '0'.repeat(exp - s.length)
    return { amount: `0.${pad}${s}`.replace(/\.0+$/, ''), label: 'dys2' }
  }
  const i = s.length - exp
  return { amount: `${s.slice(0, i)}.${s.slice(i)}`.replace(/\.0+$/, ''), label: 'dys2' }
})

async function loadDenoms() {
  isLoadingDenoms.value = true
  denomsError.value = ''
  denoms.value = []
  try {
    await useAxiosRepo(DenomsByName).api().fetchInit({ name: routeName.value })
    const repo = useRepo(DenomsByName)
    denoms.value = (repo.all() as unknown as Array<{ name: string; denom: string }>)
      .filter((r) => r.name === routeName.value)
      .map((r) => r.denom)
    // Prime supply from API for initial render; rows will react via repo
    await Promise.all(denoms.value.map((d) => useAxiosRepo(Supply).api().fetchByDenom(d)))
  } catch (e: any) {
    denomsError.value = e?.message || 'Failed to load denoms'
  } finally {
    isLoadingDenoms.value = false
  }
}

async function mintCoins() {
  denomBusy.value = 'mint'
  denomErrMint.value = ''
  try {
    const executor = selectedExecutorAddressMint.value || resolvedAddress.value
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .mintCoins({
        name_destination: String(resolvedAddress.value || ''),
        amount: [{ denom: String(mintDenom.value || ''), amount: String(mintAmount.value || '0') }],
        mint_fee: { denom: 'udys', amount: String(estimatedFeeUdys.value || '0') },
        wallet,
        executorAddress: executor,
        gasLimit: 'auto',
      })
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`)
    await loadDenoms()
  } catch (e: any) {
    denomErrMint.value = e?.message || 'Failed to mint'
  } finally {
    denomBusy.value = ''
  }
}

// ---- NFT classes by name ----
const isLoadingClasses = ref(false)
const classesError = ref('')
const classIds = ref<string[]>([])
async function loadClasses() {
  isLoadingClasses.value = true
  classesError.value = ''
  classIds.value = []
  try {
    await useAxiosRepo(ClassesByName).api().fetchInit({ name: routeName.value })
    const repo = useRepo(ClassesByName)
    classIds.value = (repo.all() as unknown as Array<{ name: string; class_id: string }>)
      .filter((r) => r.name === routeName.value)
      .map((r) => r.class_id)
  } catch (e: any) {
    classesError.value = e?.message || 'Failed to load classes'
  } finally {
    isLoadingClasses.value = false
  }
}

const isSavingClass = ref(false)
const classSaveError = ref('')
const classForm = ref({ classId: '', name: '', symbol: '', description: '', uri: '', uriHash: '' })
watchEffect(() => {
  classForm.value.classId = routeName.value || ''
})
const canSaveClass = computed(() => {
  const id = String(classForm.value.classId || '')
  const root = String(routeName.value || '')
  if (!id || !root) return false
  return id === root || id.startsWith(`${root}/`)
})
async function saveClass() {
  if (!canSaveClass.value) return
  isSavingClass.value = true
  classSaveError.value = ''
  try {
    const executor = selectedExecutorAddressClass.value || resolvedAddress.value
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .saveClass({
        name_destination: String(resolvedAddress.value || ''),
        class_id: String(classForm.value.classId || ''),
        name: String(classForm.value.name || ''),
        symbol: String(classForm.value.symbol || ''),
        description: String(classForm.value.description || ''),
        uri: String(classForm.value.uri || ''),
        uri_hash: String(classForm.value.uriHash || ''),
        wallet,
        executorAddress: executor,
        gasLimit: 'auto',
      })
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`)
    classForm.value = {
      classId: routeName.value || '',
      name: '',
      symbol: '',
      description: '',
      uri: '',
      uriHash: '',
    }
    await loadClasses()
  } catch (e: any) {
    classSaveError.value = e?.message || 'Failed to create class'
  } finally {
    isSavingClass.value = false
  }
}

async function reload() {
  await fetchResolveName(routeName.value)
  await Promise.all([loadClasses(), loadDenoms(), loadParams()])
  if (!mintDenom.value) mintDenom.value = routeName.value
}
watchEffect(() => {
  const name = routeName.value
  if (!name) return
  void reload()
})
watchEffect(() => {
  if (ownerAddress.value && !selectedExecutorAddress.value) {
    selectedExecutorAddress.value = ownerAddress.value
  }
  if (ownerAddress.value && !selectedExecutorAddressMeta.value) {
    selectedExecutorAddressMeta.value = ownerAddress.value
  }
  if (ownerAddress.value && !selectedExecutorAddressMint.value) {
    selectedExecutorAddressMint.value = ownerAddress.value
  }
  if (ownerAddress.value && !selectedExecutorAddressClass.value) {
    selectedExecutorAddressClass.value = ownerAddress.value
  }
})

function onRegistered() {
  reload()
}

async function setDestination() {
  if (!canSetDestination.value) return
  isSettingDest.value = true
  setDestError.value = ''
  try {
    const executor = selectedExecutorAddress.value || ownerAddress.value
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setDestination({
        owner: String(ownerAddress.value || ''),
        name: String(routeName.value || ''),
        destination: String(destination.value || ''),
        wallet,
        executorAddress: executor,
        gasLimit: 'auto',
      })
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`)
    await reload()
  } catch (e: any) {
    setDestError.value = e?.message || 'Failed to set destination'
  } finally {
    isSettingDest.value = false
  }
}
</script>
