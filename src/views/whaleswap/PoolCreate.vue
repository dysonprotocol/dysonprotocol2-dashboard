<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLocalStorage } from '@vueuse/core'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import WalletSelector from '@/components/shared/WalletSelector.vue'
import AmountDenomSelector from '@/components/AmountDenomSelector.vue'
import { toast } from 'vue-sonner'
import api from '@/orm/http'
import { useWallet } from '@/composables/useWallet'

type AmountDenomPair = { amount: string; denom: string }
type DisplayAmount = { amount: string; denom: string }
type WalletBalance = {
  baseDenom: string
  baseAmount: string
  displayDenom: string
  displayAmount: string
}

const {
  selectedExecutor,
  executorAddress,
  granteeAddress,
  isAuthz,
  balances,
  balancesLoading,
  balancesError,
  availableDisplayBalances,
  availableBaseDenoms,
  balancesMap,
  assetSections,
  config,
  slotKeys,
  slotLabel,
  getSlotDisplayDenom,
  simulationNote,
  normalizedConfig,
  canonicalCoins,
  interestScenarios,
  feeScenarios,
  validationErrors,
  createError,
  isSubmitting,
  canSubmit,
  msgTypeFilter,
  onExecutorUpdate,
  onGranteeUpdate,
  onAuthzUpdate,
  onDisplayUpdate,
  handleBaseUpdate,
  handleDisplayUpdate,
  handleCreatePool,
} = usePoolCreateForm()

function usePoolCreateForm() {
  const router = useRouter()
  const wallet = useWallet()

  const selectedExecutor = useLocalStorage('whaleswap:pools:create:executor', '')
  const executorAddress = ref(selectedExecutor.value || '')
  const granteeAddress = ref('')
  const isAuthz = ref(false)

  const balances = ref<WalletBalance[]>([])
  const balancesLoading = ref(false)
  const balancesError = ref('')

  const createError = ref('')
  const isSubmitting = ref(false)

  const assetOne = ref<AmountDenomPair>({ amount: '', denom: '' })
  const assetTwo = ref<AmountDenomPair>({ amount: '', denom: '' })
  const assetOneDisplay = ref<DisplayAmount>({ amount: '', denom: '' })
  const assetTwoDisplay = ref<DisplayAmount>({ amount: '', denom: '' })

  const slotKeys = ['first', 'second'] as const
  type SlotKey = (typeof slotKeys)[number]

  type AssetSection = {
    key: SlotKey
    label: string
    base: Ref<AmountDenomPair>
    display: Ref<DisplayAmount>
    defaultIndex: number
  }

  const assetSections: AssetSection[] = [
    { key: 'first', label: 'Asset A', base: assetOne, display: assetOneDisplay, defaultIndex: 0 },
    { key: 'second', label: 'Asset B', base: assetTwo, display: assetTwoDisplay, defaultIndex: 1 },
  ]

  const config = reactive({
    feeRate: createPerSlot('0.003'),
    interestRate: createPerSlot('0.000'),
    minCollateral: createPerSlot('1.50'),
    maxBorrowPercent: createPerSlot('0.80'),
    liquidationThreshold: createPerSlot('1.20'),
  })

  const currentWalletLabel = computed(() => {
    if (!executorAddress.value) return ''
    const list = wallet.unlockedWallets?.value as
      | Array<{ address: string; name?: string }>
      | undefined
    if (Array.isArray(list)) {
      const entry = list.find((item) => item.address === executorAddress.value)
      if (entry?.name) return `${entry.name} (${executorAddress.value})`
    }
    return executorAddress.value
  })

  onMounted(async () => {
    await wallet.loadDenomMetadata()
    if (selectedExecutor.value && !executorAddress.value)
      executorAddress.value = selectedExecutor.value
    if (executorAddress.value) await fetchBalances(executorAddress.value)
  })

  watch(executorAddress, async (addr) => {
    selectedExecutor.value = addr || ''
    balances.value = []
    createError.value = ''
    assetSections.forEach((section) => {
      if (!section?.base || !section.display) return
      section.base.value = { amount: '', denom: '' }
      section.display.value = { amount: '', denom: '' }
    })
    if (!addr) return
    await fetchBalances(addr)
  })

  watch(
    () => balances.value.map((b) => b.baseDenom).join(','),
    () => {
      const allowed = new Set(availableBaseDenoms.value)
      assetSections.forEach((section) => {
        const denom = section.base?.value?.denom
        if (section.base && denom && !allowed.has(denom)) {
          section.base.value = { amount: '', denom: '' }
        }
      })
    }
  )

  const balancesMap = computed(() => {
    const map = new Map<string, WalletBalance>()
    for (const balance of balances.value) map.set(balance.baseDenom, balance)
    return map
  })

  const availableBaseDenoms = computed(() => balances.value.map((b) => b.baseDenom))

  const availableDisplayBalances = computed(() =>
    balances.value.map((b) => ({
      label: `${b.displayAmount} ${b.displayDenom}`,
      denom: b.baseDenom,
    }))
  )

  const canonicalCoins = computed(() => {
    const coins: Array<{ denom: string; amount: string }> = []
    assetSections.forEach((section) => {
      const base = section.base?.value
      if (!base?.denom || !base.amount) return
      const { denom, amount } = base
      if (BigInt(amount) <= 0n) return
      coins.push({ denom, amount })
    })
    return coins.sort((a, b) => a.denom.localeCompare(b.denom))
  })

  const normalizedConfig = computed(() => ({
    feeRate: normalizePerSlot(config.feeRate),
    interestRate: normalizePerSlot(config.interestRate),
    minCollateral: normalizePerSlot(config.minCollateral),
    maxBorrowPercent: normalizePerSlot(config.maxBorrowPercent),
    liquidationThreshold: normalizePerSlot(config.liquidationThreshold),
  }))

  const validationErrors = computed(() => {
    const errors: string[] = []
    if (!executorAddress.value) errors.push('Select a wallet to fund the pool.')
    if (availableBaseDenoms.value.length < 2)
      errors.push('The selected wallet needs at least two non-zero balances.')

    const denomSet = new Set<string>()
    assetSections.forEach((section) => {
      const asset = section.base?.value
      if (!asset?.denom)
        errors.push(
          `${section.label}: select a denom owned by ${currentWalletLabel.value || 'the selected wallet'}.`
        )
      if (asset?.denom) {
        if (denomSet.has(asset.denom))
          errors.push('Pool assets must be unique (choose two different denoms).')
        denomSet.add(asset.denom)
        const balance = balancesMap.value.get(asset.denom)
        if (!balance) errors.push(`${section.label}: no on-chain balance for ${asset.denom}.`)
        if (!asset.amount || BigInt(asset.amount || '0') <= 0n)
          errors.push(`${section.label}: enter an initial deposit greater than zero.`)
        if (balance && asset.amount && BigInt(asset.amount) > BigInt(balance.baseAmount)) {
          errors.push(
            `${section.label}: deposit exceeds wallet balance (${balance.displayAmount} ${balance.displayDenom}).`
          )
        }
      }
    })

    if (denomSet.size < 2) return errors

    slotKeys.forEach((slot) => {
      const denom = slot === 'first' ? assetOne.value.denom : assetTwo.value.denom
      if (!denom) return

      const min = normalizedConfig.value.minCollateral[slot]
      if (!min) errors.push(`${slotLabel(slot)}: set a minimum collateral ratio (> 1).`)
      else if (Number(min) <= 1)
        errors.push(`${slotLabel(slot)}: minimum collateral ratio must be greater than 1.`)

      const liq = normalizedConfig.value.liquidationThreshold[slot]
      if (!liq) errors.push(`${slotLabel(slot)}: set a liquidation threshold (> 1).`)
      else if (Number(liq) <= 1)
        errors.push(`${slotLabel(slot)}: liquidation threshold must exceed 1.`)
      else if (min && Number(liq) >= Number(min))
        errors.push(
          `${slotLabel(slot)}: liquidation threshold should stay below the min collateral ratio.`
        )

      const fee = normalizedConfig.value.feeRate[slot]
      if (!fee) errors.push(`${slotLabel(slot)}: set a swap fee (0 to 1).`)
      else if (!isBetween(fee, 0, 1)) errors.push(`${slotLabel(slot)}: swap fee must be in [0, 1).`)

      const borrow = normalizedConfig.value.maxBorrowPercent[slot]
      if (!borrow) errors.push(`${slotLabel(slot)}: set a max borrow percentage (0 to 1).`)
      else if (!isBetween(borrow, 0, 1))
        errors.push(`${slotLabel(slot)}: max borrow percent must be within [0, 1).`)

      const interest = normalizedConfig.value.interestRate[slot]
      if (interest && Number(interest) < 0)
        errors.push(`${slotLabel(slot)}: interest rate cannot be negative.`)
    })

    if (canonicalCoins.value.length !== 2)
      errors.push('Provide two initial coin amounts to seed the pool.')

    return errors
  })

  const canSubmit = computed(() => validationErrors.value.length === 0 && !isSubmitting.value)

  const simulationNote = computed(
    () =>
      `Simulation runs automatically via wallet.sendMsg() before broadcast. Pool shares + gas are previewed by the wallet; no extra button required.`
  )

  const interestScenarios = computed(() => {
    const rows: Array<{ denom: string; display: string; ratePct: string; interest: string }> = []
    slotKeys.forEach((slot) => {
      const denom = getSlotDisplayDenom(slot)
      const rateStr = normalizedConfig.value.interestRate[slot]
      if (!denom || !rateStr) return
      const rate = Number(rateStr)
      if (Number.isNaN(rate)) return
      const interest = ((100 * rate * 7) / 365).toFixed(4)
      rows.push({ denom, display: denom, ratePct: (rate * 100).toFixed(2), interest })
    })
    return rows
  })

  const feeScenarios = computed(() => {
    const rows: Array<{ denom: string; display: string; ratePct: string; fee: string }> = []
    slotKeys.forEach((slot) => {
      const denom = getSlotDisplayDenom(slot)
      const rateStr = normalizedConfig.value.feeRate[slot]
      if (!denom || !rateStr) return
      const rate = Number(rateStr)
      if (Number.isNaN(rate)) return
      const fee = (250 * rate).toFixed(4)
      rows.push({ denom, display: denom, ratePct: (rate * 100).toFixed(3), fee })
    })
    return rows
  })

  async function fetchBalances(address: string) {
    balancesLoading.value = true
    balancesError.value = ''
    try {
      const entries: WalletBalance[] = []
      let nextKey: string | undefined
      do {
        const response = await api.get(`/cosmos/bank/v1beta1/balances/${address}`, {
          params: { 'pagination.limit': 200, 'pagination.key': nextKey },
        })
        const list = Array.isArray(response.data?.balances) ? response.data.balances : []
        for (const coin of list) {
          if (!coin?.denom || !coin?.amount) continue
          const amount = BigInt(coin.amount)
          if (amount <= 0n) continue
          try {
            const normalized = wallet.normalizeCoin({ denom: coin.denom, amount: coin.amount })
            entries.push({
              baseDenom: normalized.base.denom,
              baseAmount: normalized.base.amount,
              displayDenom: normalized.display.denom,
              displayAmount: normalized.display.amount,
            })
          } catch (error) {
            console.warn('[PoolCreate] Failed to normalize balance', coin, error)
          }
        }
        nextKey = response.data?.pagination?.next_key || undefined
      } while (nextKey)
      balances.value = mergeBalances(entries)
    } catch (error: any) {
      console.error('[PoolCreate] Failed to fetch balances:', error)
      balancesError.value = error?.message || String(error)
    } finally {
      balancesLoading.value = false
    }
  }

  function mergeBalances(items: WalletBalance[]): WalletBalance[] {
    const map = new Map<string, WalletBalance>()
    for (const item of items) {
      const current = map.get(item.baseDenom)
      if (!current) {
        map.set(item.baseDenom, item)
        continue
      }
      const sum = (BigInt(current.baseAmount) + BigInt(item.baseAmount)).toString()
      map.set(item.baseDenom, { ...current, baseAmount: sum })
    }
    return Array.from(map.values()).sort((a, b) => a.baseDenom.localeCompare(b.baseDenom))
  }

  function slotLabel(slot: SlotKey) {
    return slot === 'first' ? 'Asset A' : 'Asset B'
  }

  function getSlotDisplayDenom(slot: SlotKey) {
    const display = slot === 'first' ? assetOneDisplay.value.denom : assetTwoDisplay.value.denom
    return display || (slot === 'first' ? assetOne.value.denom : assetTwo.value.denom) || ''
  }

  function createPerSlot(initial: string) {
    return { first: initial, second: initial }
  }

  function normalizePerSlot(values: Record<SlotKey, string>) {
    return {
      first: normalizeDecimalInput(values.first),
      second: normalizeDecimalInput(values.second),
    }
  }

  function normalizeDecimalInput(raw: string) {
    if (!raw) return ''
    const trimmed = raw.trim()
    if (!trimmed) return ''
    const prepended = trimmed.startsWith('.') ? `0${trimmed}` : trimmed
    if (!/^[0-9]+(\.[0-9]+)?$/.test(prepended)) return ''
    const [whole, fracRaw = ''] = prepended.split('.')
    const normalizedWhole = whole.replace(/^0+(?=\d)/, '') || '0'
    if (!fracRaw) return normalizedWhole
    const frac = fracRaw.slice(0, 18).replace(/0+$/, '')
    return frac ? `${normalizedWhole}.${frac}` : normalizedWhole
  }

  function isBetween(value: string, min: number, max: number, allowOne?: boolean) {
    const num = Number(value)
    if (Number.isNaN(num)) return false
    if (allowOne) return num >= min && num <= max
    return num >= min && num < max
  }

  function buildDecCoins(values: Record<SlotKey, string>) {
    const map = new Map<string, string>()
    assetSections.forEach((section) => {
      const denom = section.base?.value?.denom
      if (!denom) return
      const normalized = values[section.key]
      if (!normalized) return
      map.set(denom, normalized)
    })
    return Array.from(map.entries())
      .map(([denom, amount]) => ({ denom, amount }))
      .sort((a, b) => a.denom.localeCompare(b.denom))
  }

  function buildMsg() {
    const coins = canonicalCoins.value
    return {
      '@type': '/dysonprotocol.whaleswap.v1.MsgCreatePool',
      creator: executorAddress.value,
      coins,
      min_initial_collateral_ratio: buildDecCoins(normalizedConfig.value.minCollateral),
      interest_rate: buildDecCoins(normalizedConfig.value.interestRate),
      max_borrow_percent: buildDecCoins(normalizedConfig.value.maxBorrowPercent),
      liquidation_threshold: buildDecCoins(normalizedConfig.value.liquidationThreshold),
      fee_rate: buildDecCoins(normalizedConfig.value.feeRate),
    }
  }

  function extractPoolId(raw: any) {
    const events = raw?.tx_response?.events
    if (!Array.isArray(events)) return null
    for (const event of events) {
      const attrs = event?.attributes
      if (!Array.isArray(attrs)) continue
      for (const attr of attrs) {
        if (attr.key !== 'pool_id') continue
        if (typeof attr.value !== 'string') continue
        return attr.value.replace(/"/g, '')
      }
    }
    return null
  }

  async function handleCreatePool() {
    if (!canSubmit.value) return
    isSubmitting.value = true
    createError.value = ''
    try {
      const msg = buildMsg()
      const result = await wallet.sendMsg({
        msg,
        executorAddress: executorAddress.value,
        grantee: isAuthz.value ? granteeAddress.value || undefined : undefined,
        gasLimit: 'auto',
      } as any)
      if (!result?.success) throw new Error(result?.rawLog || 'Pool creation failed')
      toast.success('Pool created successfully')
      const poolId = extractPoolId(result?.raw)
      if (poolId) router.push({ name: 'WhaleswapPool', params: { poolId } })
    } catch (error: any) {
      console.error('[PoolCreate] Failed to create pool:', error)
      createError.value = error?.message || String(error)
      toast.error(createError.value)
    } finally {
      isSubmitting.value = false
    }
  }

  function msgTypeFilter(grant: any) {
    const auth = grant?.authorization
    if (!auth || !auth['@type']) return { valid: false, notes: 'No authorization' }
    if (auth['@type'] === '/cosmos.authz.v1beta1.GenericAuthorization') {
      const ok = auth.msg === '/dysonprotocol.whaleswap.v1.MsgCreatePool'
      return { valid: ok, notes: ok ? 'GenericAuthorization for MsgCreatePool' : 'Wrong msg type' }
    }
    return { valid: false, notes: 'Unsupported authz type' }
  }

  function onDisplayUpdate(slot: SlotKey, payload: DisplayAmount) {
    if (slot === 'first') assetOneDisplay.value = payload
    else assetTwoDisplay.value = payload
  }

  function handleDisplayUpdate(slot: SlotKey) {
    return (value: DisplayAmount) => onDisplayUpdate(slot, value)
  }

  function handleBaseUpdate(slot: SlotKey) {
    const target = slot === 'first' ? assetOne : assetTwo
    return (value: AmountDenomPair) => {
      target.value = value
    }
  }

  function onExecutorUpdate(addr: string) {
    executorAddress.value = addr || ''
  }

  function onGranteeUpdate(addr: string | null) {
    granteeAddress.value = addr || ''
  }

  function onAuthzUpdate(v: boolean) {
    isAuthz.value = !!v
  }

  return {
    selectedExecutor,
    executorAddress,
    granteeAddress,
    isAuthz,
    balances,
    balancesLoading,
    balancesError,
    availableDisplayBalances,
    availableBaseDenoms,
    balancesMap,
    assetSections,
    config,
    slotKeys,
    slotLabel,
    getSlotDisplayDenom,
    simulationNote,
    normalizedConfig,
    canonicalCoins,
    interestScenarios,
    feeScenarios,
    validationErrors,
    createError,
    isSubmitting,
    canSubmit,
    msgTypeFilter,
    onExecutorUpdate,
    onGranteeUpdate,
    onAuthzUpdate,
    onDisplayUpdate,
    handleDisplayUpdate,
    handleBaseUpdate,
    handleCreatePool,
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 px-4 py-6 max-w-5xl mx-auto">
    <!-- template unchanged -->
    <Card>
      <CardHeader>
        <CardTitle>Create Whaleswap Pool</CardTitle>
        <CardDescription>
          Seed a two-sided AMM pool, configure leverage limits, and publish it to the chain.
          Requirements mirror the workflow documented in
          <span class="font-semibold">docs/whaleswap_guide.md</span>: register/mint tokens, then
          create the pool.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <Alert>
          <AlertTitle>Simulation handled automatically</AlertTitle>
          <AlertDescription>{{ simulationNote }}</AlertDescription>
        </Alert>
        <div class="space-y-2">
          <Label>Wallet</Label>
          <WalletSelector
            v-model="selectedExecutor"
            :button-class="''"
            :show-locked="false"
            :msg-type-filter="msgTypeFilter"
            @update:executor-address="onExecutorUpdate"
            @update:grantee-address="onGranteeUpdate"
            @update:is-authz="onAuthzUpdate"
          />
          <div class="text-xs text-muted-foreground">
            Only balances owned by the selected signer/authz grantee are available for deposits.
          </div>
        </div>
        <div class="space-y-2">
          <Label>Available balances</Label>
          <div class="min-h-10 rounded-md border border-dashed p-3">
            <div
              v-if="balancesLoading"
              class="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Spinner class="size-4" />
              <span>Loading balances…</span>
            </div>
            <div v-else-if="balancesError" class="text-sm text-destructive">
              {{ balancesError }}
            </div>
            <div
              v-else-if="availableDisplayBalances.length === 0"
              class="text-sm text-muted-foreground"
            >
              No spendable balances detected. Fund this wallet (nameservice coins, udys, etc.)
              before creating a pool.
            </div>
            <div v-else class="flex flex-wrap gap-2">
              <Badge
                v-for="entry in availableDisplayBalances"
                :key="entry.denom"
                variant="secondary"
              >
                {{ entry.label }}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Initial Liquidity</CardTitle>
        <CardDescription>
          Enter display amounts. Inputs automatically normalize to base denoms for the transaction
          payload while showing metadata-friendly labels.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-8">
        <div
          v-for="section in assetSections"
          :key="section.key"
          class="space-y-3 rounded-lg border p-4"
        >
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-semibold">{{ section.label }}</h4>
            </div>
          </div>
          <AmountDenomSelector
            :base="section.base.value"
            :base-denoms="availableBaseDenoms"
            :default-base-denom="
              availableBaseDenoms[section.defaultIndex] || availableBaseDenoms[0] || ''
            "
            :disabled="isSubmitting || balancesLoading || !executorAddress"
            @update:base="handleBaseUpdate(section.key)"
            @update:display="handleDisplayUpdate(section.key)"
          />
          <div class="text-xs text-muted-foreground">
            Available:
            {{
              balancesMap.get(section.base?.value?.denom || '')?.displayAmount ||
              (balancesLoading ? '— (loading)' : '0')
            }}
            {{ balancesMap.get(section.base?.value?.denom || '')?.displayDenom || '' }}
          </div>

          <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div class="space-y-1">
              <Label>Min collateral ratio (x)</Label>
              <Input
                v-model="config.minCollateral[section.key]"
                inputmode="decimal"
                placeholder="1.50"
                :disabled="isSubmitting"
              />
            </div>
            <div class="space-y-1">
              <Label>Liquidation threshold (x)</Label>
              <Input
                v-model="config.liquidationThreshold[section.key]"
                inputmode="decimal"
                placeholder="1.20"
                :disabled="isSubmitting"
              />
            </div>
            <div class="space-y-1">
              <Label>Max borrow percent (0-1)</Label>
              <Input
                v-model="config.maxBorrowPercent[section.key]"
                inputmode="decimal"
                placeholder="0.80"
                :disabled="isSubmitting"
              />
            </div>
            <div class="space-y-1">
              <Label>Interest rate (APR)</Label>
              <Input
                v-model="config.interestRate[section.key]"
                inputmode="decimal"
                placeholder="0.015"
                :disabled="isSubmitting"
              />
              <p class="text-[11px] text-muted-foreground">Annualized; used for borrow accrual.</p>
            </div>
            <div class="space-y-1">
              <Label>Swap fee (0-1)</Label>
              <Input
                v-model="config.feeRate[section.key]"
                inputmode="decimal"
                placeholder="0.003"
                :disabled="isSubmitting"
              />
              <p class="text-[11px] text-muted-foreground">
                Charged on the swap-out denom for this side.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>What this means</CardTitle>
        <CardDescription>Live examples driven by your inputs.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div>
          <p class="text-sm font-semibold mb-1">Interest preview</p>
          <div v-if="interestScenarios.length" class="space-y-1 text-sm">
            <p
              v-for="row in interestScenarios"
              :key="`interest-${row.denom}`"
              class="text-muted-foreground leading-relaxed"
            >
              Holding a 100 {{ row.display }} borrow for 7 days at {{ row.ratePct }}% APR accrues ≈
              {{ row.interest }} {{ row.display }} in interest.
            </p>
          </div>
          <p v-else class="text-sm text-muted-foreground">
            Fill in the interest fields to see the projected costs.
          </p>
        </div>
        <div class="rounded-md border border-dashed" />
        <div>
          <p class="text-sm font-semibold mb-1">Fee preview</p>
          <div v-if="feeScenarios.length" class="space-y-1 text-sm">
            <p
              v-for="row in feeScenarios"
              :key="`fee-${row.denom}`"
              class="text-muted-foreground leading-relaxed"
            >
              Swapping out 250 {{ row.display }} pays ≈ {{ row.fee }} {{ row.display }} in pool fees
              ({{ row.ratePct }}% applied to the swap-out denom). Updating the {{ row.display }} fee
              only affects swaps exiting into {{ row.display }}.
            </p>
          </div>
          <p v-else class="text-sm text-muted-foreground">
            Enter swap fees to preview how much exit liquidity will cost per side.
          </p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Summary</CardTitle>
        <CardDescription>Review the normalized payload before submitting.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label>Coins (base units)</Label>
          <div class="rounded-md border p-3 text-sm font-mono leading-relaxed">
            <template v-if="canonicalCoins.length">
              <div v-for="coin in canonicalCoins" :key="coin.denom">
                {{ coin.amount }} {{ coin.denom }}
              </div>
            </template>
            <div v-else class="text-muted-foreground">
              Select two assets with non-zero deposits.
            </div>
          </div>
        </div>
        <div class="space-y-2">
          <Label>Parameters</Label>
          <div class="rounded-md border p-3 text-sm font-mono grid gap-2 md:grid-cols-2">
            <div v-for="slot in slotKeys" :key="slot">
              <p class="font-semibold">
                {{ slotLabel(slot) }} · {{ getSlotDisplayDenom(slot) || '—' }}
              </p>
              <ul class="text-xs text-muted-foreground space-y-1">
                <li>Min CR: {{ normalizedConfig.minCollateral[slot] || '—' }}x</li>
                <li>Liq threshold: {{ normalizedConfig.liquidationThreshold[slot] || '—' }}x</li>
                <li>Max borrow: {{ normalizedConfig.maxBorrowPercent[slot] || '—' }}</li>
                <li>Interest: {{ normalizedConfig.interestRate[slot] || '—' }} APR</li>
                <li>Fee: {{ normalizedConfig.feeRate[slot] || '—' }}</li>
              </ul>
            </div>
          </div>
        </div>
        <div v-if="validationErrors.length" class="space-y-1 text-sm text-destructive">
          <p class="font-semibold">Fix before submitting:</p>
          <ul class="list-disc pl-5">
            <li v-for="err in validationErrors" :key="err">{{ err }}</li>
          </ul>
        </div>
        <div v-if="createError" class="text-sm text-destructive">
          {{ createError }}
        </div>
      </CardContent>
      <CardFooter>
        <Button class="w-full" :disabled="!canSubmit" @click="handleCreatePool">
          <span v-if="isSubmitting">Creating pool…</span>
          <span v-else>Create pool</span>
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>
