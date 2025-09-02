<template>
  <AccordionItem
    :value="value"
    :data-testid="dataTestId"
    :class="cn('border last:border-b rounded-md p-1 my-2', borderClass(), itemClass)"
  >
    <AccordionTrigger :class="cn({ 'font-bold': isActive })">
      <span class="text-base">{{ title }}</span>
    </AccordionTrigger>
    <AccordionContent>
      <slot name="content-top" />

      <div v-if="address" class="mb-2 break-all">
        <AddressDisplay :address="address" :truncate="10" />
      </div>
      <div v-if="address" class="mt-2 grid grid-cols-3 gap-2 text-xs">
        <RouterLink v-for="item in linkItems(address)" :key="item.text" :to="item.to">
          <span class="iconify size-3 mr-1" :class="item.iconClass" />
          {{ item.text }}
        </RouterLink>
      </div>

      <slot />
    </AccordionContent>
  </AccordionItem>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AddressDisplay from '@/components/AddressDisplay.vue'
import { cn } from '@/lib/utils'
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'

interface LinkItem {
  text: string
  iconClass: string
  to: any
}

const props = defineProps<{
  value: string
  title: string
  isActive?: boolean
  unlockedActive?: boolean
  address?: string
  itemClass?: string
  dataTestId?: string
}>()

function borderClass(): string {
  if (props.isActive) return props.unlockedActive ? 'border-success' : 'border-warning'
  return 'border-primary/20'
}

function linkItems(address?: string): LinkItem[] {
  if (!address) return []
  return [
    {
      text: 'Summary',
      iconClass: 'lucide--scroll-text',
      to: { name: 'AddressSummary', params: { address } },
    },
    {
      text: 'Coins',
      iconClass: 'lucide--coins',
      to: { name: 'AddressCoins', params: { address } },
    },
    {
      text: 'NFTs',
      iconClass: 'lucide--file-badge-2',
      to: { name: 'AddressNFTs', params: { address } },
    },
    {
      text: 'Staking',
      iconClass: 'lucide--landmark',
      to: { name: 'AddressStaking', params: { address } },
    },
    {
      text: 'Names',
      iconClass: 'lucide--shield-check',
      to: { name: 'AddressNames', params: { address } },
    },
    {
      text: 'Script',
      iconClass: 'lucide--file-json',
      to: { name: 'AddressScript', params: { address } },
    },
    {
      text: 'Storage',
      iconClass: 'lucide--table',
      to: { name: 'AddressStorage', params: { address } },
    },
    {
      text: 'Tasks',
      iconClass: 'lucide--clock',
      to: { name: 'AddressTasks', params: { address } },
    },
    {
      text: 'Authz',
      iconClass: 'lucide--key-round',
      to: { name: 'AddressAuthz', params: { address } },
    },
  ]
}
</script>

<style scoped>
@import '@/style.css';

.border-success .router-link-exact-active {
  @apply text-success;
}

.border-warning .router-link-exact-active {
  @apply text-warning;
}
</style>
