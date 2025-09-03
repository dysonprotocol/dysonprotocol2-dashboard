<template>
  <Accordion type="single" collapsible v-model="openValue" class="">
    <WalletAccordian
      value="keplr"
      :title="titleText"
      :is-active="isCurrentAddress"
      :unlocked-active="isKeplrConnected"
      :address="address"
    >
      <template #default>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="isBusy || isKeplrConnected || !isKeplrAvailable"
            @click="connectKeplr"
          >
            Connect
          </Button>
          <Button
            variant="outline"
            size="sm"
            :disabled="isBusy || !isKeplrConnected"
            @click="disconnect"
          >
            Disconnect
          </Button>
          <div v-if="errorMessage" class="text-destructive">
            {{ errorMessage }}
          </div>
        </div>
      </template>
    </WalletAccordian>
  </Accordion>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStorage } from '@vueuse/core'
import { useWallet } from '@/composables/useWallet'
import { useRoute } from 'vue-router'
import { Accordion } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import WalletAccordian from '@/components/wallet/WalletAccordian.vue'

const { unlockedWallets, connectExtension, lockWallet } = useWallet()

const route = useRoute()

// Persist single open state across reloads
const openValue = useStorage('accordion:keplr-open', '')

const keplrWallet = computed(() => unlockedWallets.value.find((w) => w.type === 'keplr') || null)
const address = computed(() => keplrWallet.value?.address || '')
const isKeplrConnected = computed(() => Boolean(keplrWallet.value) && isKeplrAvailable.value)

const isCurrentAddress = computed(() => route.params.address === address.value)

const titleText = computed(() => keplrWallet.value?.name || 'Keplr Wallet')

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
