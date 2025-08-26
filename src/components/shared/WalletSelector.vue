<template>
  <div class="relative min-w-0 max-w-full overflow-hidden">
    <button
      type="button"
      :class="['btn', 'min-w-0', 'max-w-full', 'overflow-hidden', buttonClass]"
      @click="openModal"
    >
      <span class="ml-1 flex-1 min-w-0 truncate">{{ selectedLabel }}</span>
      <ChevronUpIcon v-if="isOpen" class="size-4 opacity-70" />
      <ChevronDownIcon v-else class="size-4 opacity-70" />
    </button>

    <dialog ref="dialogRef" class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold">Select wallet</h3>
        <div v-if="selectedAuthz && selectedAuthz.notes" class="mt-2 text-xs opacity-80 break-all">
          Note: {{ selectedAuthz.notes }}
        </div>
        <ul class="mt-4">
          <li v-if="groupedOptions.length === 0" class="px-4 py-2 text-sm opacity-70">
            No wallets available. Enable Keplr or add and unlock a JS wallet in the sidebar.
          </li>
          <li v-for="group in groupedOptions" :key="group.wallet.address" class="my-1">
            <div
              class="w-full text-left p-4 text-sm rounded-md border border-primary/10"
              :class="{
                'cursor-not-allowed': !group.wallet.isUnlocked || !group.directAllowed,
                'hover:cursor-pointer hover:border-primary/40 hover:bg-primary/10':
                  group.wallet.isUnlocked && group.directAllowed,
                'bg-primary/10': isDirectSelected(group.wallet.address),
              }"
              @click="
                group.wallet.isUnlocked && group.directAllowed && selectDirect(group.wallet.address)
              "
            >
              <div
                class="flex items-start justify-between"
                :class="{ 'opacity-50': !group.wallet.isUnlocked || !group.directAllowed }"
              >
                <p
                  :class="isDirectSelected(group.wallet.address) ? 'font-semibold' : 'font-normal'"
                >
                  {{ group.wallet.name }}
                  <span class="text-xs text-base-content/60">({{ group.wallet.type }})</span>
                </p>
                <span v-if="isDirectSelected(group.wallet.address)" class="text-primary">
                  <CheckIcon class="size-5" />
                </span>
              </div>
              <div class="mt-2 font-mono text-xs break-all">{{ group.wallet.address }}</div>

              <div v-if="group.wallet.isUnlocked && group.authzOptions.length > 0" class="mt-3">
                <div class="text-xs text-base-content/60 mb-1">Via Authz</div>
                <div class="space-y-1">
                  <button
                    v-for="(auth, idx) in group.authzOptions"
                    :key="auth.granterAddress + ':' + idx"
                    type="button"
                    class="w-full text-left p-2 rounded-md border border-base-300 hover:border-primary/60 hover:bg-primary/10 cursor-pointer"
                    :class="{
                      'bg-primary/10': isAuthzSelected(group.wallet.address, auth),
                      'bg-base-100': !isAuthzSelected(group.wallet.address, auth),
                    }"
                    @click.stop="selectAuthz(group.wallet, auth)"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <span class="font-medium">{{ short(auth.granterAddress) }}</span>
                        <span class="opacity-70"> via Authz</span>
                        <span class="opacity-70"> (signed by {{ group.wallet.name }})</span>
                      </div>
                      <span v-if="isAuthzSelected(group.wallet.address, auth)" class="text-primary">
                        <CheckIcon class="size-5" />
                      </span>
                    </div>
                    <div class="text-xs opacity-70 mt-1 flex items-center gap-2">
                      <span>{{ auth.notes }}</span>
                      <span v-if="auth.expiration" :title="auth.expiration"
                        >exp: {{ shortTs(auth.expiration) }}</span
                      >
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/20/solid'
import { useWallet } from '@/composables/useWallet'
import AddressDisplay from '@/components/AddressDisplay.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  allowedAddresses: { type: Array, default: null },
  showLocked: { type: Boolean, default: true },
  defaultAddress: { type: String, default: '' },
  buttonClass: { type: String, default: '' },
  msgTypeFilter: { type: Function, default: null },
})
const emit = defineEmits([
  'update:modelValue',
  'update:executorAddress',
  'update:granteeAddress',
  'update:isAuthz',
  'update:authzNotes',
  'update:selectedGrant',
])
const { unlockedWallets, localCosmJsWallets, loadDenomMetadata, restUrl, chainId } = useWallet()

onMounted(async () => {
  try {
    await loadDenomMetadata()
  } catch {
    // ignore load errors here; component still functions
  }
})

const dialogRef = ref(null)
const isOpen = ref(false)

const allowedSet = computed(() => (props.allowedAddresses ? new Set(props.allowedAddresses) : null))

function truncate(a) {
  if (!a) return ''
  return a.length <= 12 ? a : `${a.slice(0, 6)}...${a.slice(-6)}`
}

const all = computed(() => {
  const unlocked = unlockedWallets.value.map((w) => ({
    ...w,
    isUnlocked: true,
  }))
  const lockedBase = props.showLocked
    ? localCosmJsWallets.value.filter(
        (w) => !unlockedWallets.value.some((u) => u.address === w.address)
      )
    : []
  const locked = lockedBase.map((w) => ({
    ...w,
    isUnlocked: false,
    type: 'cosmjs',
  }))
  return [...unlocked, ...locked]
})

// AUTHZ fetching and filtering
function short(a) {
  if (!a) return ''
  return a.length <= 13 ? a : `${a.slice(0, 10)}...${a.slice(-5)}`
}

function shortTs(ts) {
  try {
    const d = new Date(ts)
    return isNaN(d.getTime()) ? ts : d.toISOString().slice(0, 19).replace('T', ' ')
  } catch {
    return ts
  }
}

function isExpired(expiration) {
  if (!expiration) return false
  return new Date(expiration).getTime() <= Date.now()
}

function applyFilter(grants, filter) {
  if (!grants || grants.length === 0) return []
  const fn = filter
  if (!fn) return []
  return grants
    .filter((g) => !isExpired(g.expiration))
    .map((g) => ({ g, res: fn(g) }))
    .filter((x) => x.res && x.res.valid)
    .map((x) => ({ grant: x.g, notes: x.res.notes || '' }))
}

async function fetchGranteeGrants(baseUrl, grantee) {
  let url = `${baseUrl}/cosmos/authz/v1beta1/grants/grantee/${grantee}`
  const all = []
  let nextKey = null
  try {
    do {
      const qs = new URLSearchParams()
      if (nextKey) qs.set('pagination.key', nextKey)
      const full = qs.toString() ? `${url}?${qs}` : url
      const resp = await fetch(full)
      if (!resp.ok) throw new Error(`fetch grants failed: ${resp.status} ${resp.statusText}`)
      const json = await resp.json()
      all.push(...(json.grants || []))
      nextKey = json.pagination?.next_key || null
    } while (nextKey)
  } catch (err) {
    console.warn(`[WalletSelector] Failed to fetch grants for ${grantee}:`, err)
    return []
  }
  return all
}

const filteredByGrantee = ref({})

async function refreshAuthz() {
  const base = restUrl.value
  const filter = props.msgTypeFilter
  const unlocked = unlockedWallets.value.map((w) => w.address)
  const entries = {}
  await Promise.all(
    unlocked.map(async (addr) => {
      const grants = await fetchGranteeGrants(base, addr)
      const filtered = applyFilter(grants, filter)
      entries[addr] = filtered.map((f) => ({
        isAuthz: true,
        granterAddress: f.grant.granter,
        granteeAddress: f.grant.grantee,
        notes: f.notes,
        expiration: f.grant.expiration || null,
        grant: f.grant,
      }))
    })
  )
  filteredByGrantee.value = entries
}

// Watch dependencies and refresh (no caching across sessions)
onMounted(() => {
  if (props.msgTypeFilter) refreshAuthz()
})

watch(
  () => [
    unlockedWallets.value.map((w) => w.address).join(','),
    restUrl.value,
    chainId.value,
    props.msgTypeFilter,
  ],
  () => {
    if (props.msgTypeFilter) refreshAuthz()
  }
)

const groupedOptions = computed(() => {
  const groups = all.value.map((w) => {
    const directAllowed = allowedSet.value ? allowedSet.value.has(w.address) : true
    const rawAuthz = filteredByGrantee.value[w.address] || []
    const authzOptions = rawAuthz.filter((a) =>
      allowedSet.value ? allowedSet.value.has(a.granterAddress) : true
    )
    return { wallet: w, directAllowed, authzOptions }
  })
  // Default selection behavior for direct address if requested
  if (!props.modelValue && props.defaultAddress) {
    const canDefault = groups.some(
      (g) => g.wallet.isUnlocked && g.wallet.address === props.defaultAddress
    )
    if (canDefault) emit('update:modelValue', props.defaultAddress)
  }
  return groups
})

// Track selected authz locally for label and checks
const selectedAuthz = ref(null)

const selectedLabel = computed(() => {
  if (selectedAuthz.value) {
    const signer = unlockedWallets.value.find((u) => u.address === selectedAuthz.value.grantee)
    const signerName = signer?.name || truncate(selectedAuthz.value.grantee)
    return `${short(selectedAuthz.value.granter)} via Authz (signed by ${signerName})`
  }
  const g = groupedOptions.value.find((x) => x.wallet.address === props.modelValue)
  if (g) return `${g.wallet.name}`
  return props.modelValue ? truncate(props.modelValue) : 'Select wallet'
})

function onUpdate(val) {
  emit('update:modelValue', val)
}

function openModal() {
  if (dialogRef.value) {
    dialogRef.value.showModal()
    isOpen.value = true
  }
}

function closeModal() {
  if (dialogRef.value) {
    dialogRef.value.close()
    isOpen.value = false
  }
}

function selectDirect(address) {
  emit('update:modelValue', address)
  emit('update:executorAddress', address)
  emit('update:granteeAddress', null)
  emit('update:isAuthz', false)
  emit('update:authzNotes', '')
  emit('update:selectedGrant', null)
  selectedAuthz.value = null
  closeModal()
}

function selectAuthz(wallet, auth) {
  emit('update:modelValue', auth.granterAddress)
  emit('update:executorAddress', auth.granterAddress)
  emit('update:granteeAddress', wallet.address)
  emit('update:isAuthz', true)
  emit('update:authzNotes', auth.notes || '')
  emit('update:selectedGrant', auth.grant || null)
  selectedAuthz.value = {
    granter: auth.granterAddress,
    grantee: wallet.address,
    notes: auth.notes || '',
  }
  closeModal()
}

function isDirectSelected(address) {
  return !selectedAuthz.value && props.modelValue === address
}

function isAuthzSelected(granteeAddress, auth) {
  return (
    !!selectedAuthz.value &&
    selectedAuthz.value.granter === auth.granterAddress &&
    selectedAuthz.value.grantee === granteeAddress
  )
}

// copy removed; AddressDisplay handles presentation

onMounted(() => {
  if (!dialogRef.value) return
  const onClose = () => (isOpen.value = false)
  dialogRef.value.addEventListener('close', onClose)
  // Store remover for onUnmounted
  dialogRef.value.__onClose = onClose
})

onUnmounted(() => {
  if (dialogRef.value && dialogRef.value.__onClose)
    dialogRef.value.removeEventListener('close', dialogRef.value.__onClose)
})
</script>
