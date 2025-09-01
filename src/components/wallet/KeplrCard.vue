<template>
  <div class="collapse collapse-arrow border border-primary/20">
    <input type="checkbox" />
    <div class="collapse-title" :class="{ 'font-bold': isCurrentAddress }">
      <div class="text-base">
        {{ titleText }}
      </div>
    </div>
    <div class="collapse-content">
      <div v-if="isKeplrConnected" class="mb-2">
        <p class="">Connected</p>
        <AddressDisplay :address="address" :truncate="10" />
      </div>
      <div v-else-if="!isKeplrAvailable" class="mb-2">Keplr not available</div>
      <div v-else class="mb-2">Not connected</div>
      <div class="flex items-center gap-2">
        <button
          class="btn btn-outline btn-xs"
          :disabled="isBusy || isKeplrConnected || !isKeplrAvailable"
          @click="connectKeplr"
        >
          Connect
        </button>
        <button
          class="btn btn-outline btn-xs"
          :disabled="isBusy || !isKeplrConnected"
          @click="disconnect"
        >
          Disconnect
        </button>
        <div v-if="errorMessage" class="text-error">
          {{ errorMessage }}
        </div>
      </div>
      <div v-if="isKeplrConnected && links.length" class="mt-2 grid grid-cols-3 gap-2 text-xs">
        <RouterLink
          v-for="item in links"
          :key="item.text"
          v-slot="{ href, navigate, isExactActive }"
          :to="item.to"
        >
          <a
            :href="href"
            class="link link-hover"
            :class="{ 'font-bold': isExactActive }"
            @click="navigate"
          >
            <span class="iconify size-3 mr-1" :class="item.iconClass" />
            {{ item.text }}
          </a>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWallet } from '@/composables/useWallet'
import AddressDisplay from '@/components/AddressDisplay.vue'
import { RouterLink, useRoute } from 'vue-router'

const { unlockedWallets, connectExtension, lockWallet } = useWallet()

const route = useRoute()

const keplrWallet = computed(() => unlockedWallets.value.find((w) => w.type === 'keplr') || null)
const address = computed(() => keplrWallet.value?.address || '')
const isKeplrConnected = computed(() => Boolean(keplrWallet.value) && isKeplrAvailable.value)

const isCurrentAddress = computed(() => route.params.address === address.value)

const titleText = computed(() => keplrWallet.value?.name || 'Keplr Wallet')

const isBusy = ref(false)
const errorMessage = ref('')
const isKeplrAvailable = ref(false)

const links = computed(() => {
  const addr = address.value
  if (!addr) return []
  return [
    {
      text: 'Summary',
      iconClass: 'lucide--scroll-text',
      to: { name: 'AddressSummary', params: { address: addr } },
    },
    {
      text: 'Coins',
      iconClass: 'lucide--coins',
      to: { name: 'AddressCoins', params: { address: addr } },
    },
    {
      text: 'NFTs',
      iconClass: 'lucide--file-badge-2',
      to: { name: 'AddressNFTs', params: { address: addr } },
    },
    {
      text: 'Staking',
      iconClass: 'lucide--landmark',
      to: { name: 'AddressStaking', params: { address: addr } },
    },
    {
      text: 'Names',
      iconClass: 'lucide--shield-check',
      to: { name: 'AddressNames', params: { address: addr } },
    },
    {
      text: 'Script',
      iconClass: 'lucide--file-json',
      to: { name: 'AddressScript', params: { address: addr } },
    },
    {
      text: 'Storage',
      iconClass: 'lucide--table',
      to: { name: 'AddressStorage', params: { address: addr } },
    },
    {
      text: 'Tasks',
      iconClass: 'lucide--clock',
      to: { name: 'AddressTasks', params: { address: addr } },
    },
    {
      text: 'Authz',
      iconClass: 'lucide--key-round',
      to: { name: 'AddressAuthz', params: { address: addr } },
    },
  ]
})

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
