<template>
  <div class="space-y-4">
    <div class="tabs tabs-boxed">
      <router-link
        v-for="t in tabs"
        :key="t.name"
        :to="{ name: t.name as any, params: { address } }"
        class="tab"
        :class="{ 'tab-active': route.name === t.name }"
      >
        {{ t.label }}
      </router-link>
    </div>

    <router-view />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps<{ address: string }>()
const route = useRoute()
const address = computed(() => props.address)

const tabs = [
  { name: 'AddressSummary', label: 'Summary' },
  { name: 'AddressScript', label: 'Script' },
  { name: 'AddressNames', label: 'Names' },
  { name: 'AddressCoins', label: 'Coins' },
  { name: 'AddressStorage', label: 'Storage' },
  { name: 'AddressStaking', label: 'Staking' },
  { name: 'AddressNFTs', label: 'NFTs' },
  { name: 'AddressAuthz', label: 'Authz' },
]
</script>
