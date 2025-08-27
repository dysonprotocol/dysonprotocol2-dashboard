<template>
  <div class="collapse collapse-arrow">
    <input type="checkbox" />
    <div class="collapse-title font-medium">
      <div class="text-base">Keplr Wallet</div>
    </div>
    <div class="collapse-content text-sm">
      <div v-if="isKeplrConnected" class="mb-2">
        <p class="text-xs text-base-content/80">Connected</p>
        <AddressDisplay :address="address" :truncate="0" />
      </div>
      <div v-else-if="!isKeplrAvailable" class="text-xs text-base-content/80 mb-2">
        Keplr not available
      </div>
      <div v-else class="text-xs text-base-content/80 mb-2">Not connected</div>
      <div class="flex items-center gap-2">
        <button
          class="btn btn-outline btn-xs"
          @click="connectKeplr"
          :disabled="isBusy || isKeplrConnected || !isKeplrAvailable"
        >
          Connect
        </button>
        <button
          class="btn btn-outline btn-xs"
          @click="disconnect"
          :disabled="isBusy || !isKeplrConnected"
        >
          Disconnect
        </button>
        <div v-if="errorMessage" class="text-error text-xs">{{ errorMessage }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWallet } from '@/composables/useWallet'
import AddressDisplay from '@/components/AddressDisplay.vue'

const { unlockedWallets, connectExtension, lockWallet } = useWallet()

const keplrWallet = computed(() => unlockedWallets.value.find((w) => w.type === 'keplr') || null)
const address = computed(() => keplrWallet.value?.address || '')
const isKeplrConnected = computed(() => Boolean(keplrWallet.value))

const isBusy = ref(false)
const errorMessage = ref('')
const isKeplrAvailable = ref(false)

onMounted(() => {
  isKeplrAvailable.value = typeof window !== 'undefined' && !!window.keplr
})

const connectKeplr = async () => {
  errorMessage.value = ''
  isBusy.value = true
  try {
    await connectExtension('keplr')
  } catch (e) {
    errorMessage.value = e?.message || String(e)
  } finally {
    isBusy.value = false
  }
}

const disconnect = () => {
  errorMessage.value = ''
  const w = keplrWallet.value
  if (!w) return
  lockWallet(w.name)
}
</script>
