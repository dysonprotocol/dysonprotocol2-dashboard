<template>
  <AccordionItem
    :value="value"
    :data-testid="dataTestId"
    :class="cn('border last:border-b rounded-md p-1 my-2', borderClass(), itemClass)"
  >
    <AccordionTrigger :data-testid="triggerTestId" :class="cn({ 'font-bold': isActive })">
      <span class="text-base">
        <template v-if="address">
          <RouterLink
            :to="{ name: 'AddressSummary', params: { address } }"
            class="hover:underline"
            @click.stop
          >
            {{ title }}
          </RouterLink>
        </template>
        <template v-else>
          {{ title }}
        </template>
      </span>
    </AccordionTrigger>
    <AccordionContent>
      <slot name="content-top" />

      <div v-if="address" class="mb-2 break-all">
        <AddressDisplay :address="address" :truncate="10" />
      </div>
      <div v-if="address" class="mt-2 grid grid-cols-3 gap-2">
        <RouterLink
          v-for="item in linkItems(address)"
          :key="item.text"
          :to="item.to"
          class="inline-flex items-center"
        >
          <component v-if="item.icon" :is="item.icon" class="size-3 mr-1" />
          <span v-else class="iconify size-3 mr-1" :class="item.iconClass" />
          {{ item.text }}
        </RouterLink>
      </div>

      <slot />
    </AccordionContent>
  </AccordionItem>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Component } from 'vue'
import AddressDisplay from '@/components/AddressDisplay.vue'
import { cn } from '@/lib/utils'
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { getAddressLinks } from '@/navigation/addressLinks'

interface LinkItem {
  text: string
  iconClass?: string
  icon?: Component
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
  triggerTestId?: string
}>()

function borderClass(): string {
  if (props.isActive) return props.unlockedActive ? 'border-success' : 'border-warning'
  return 'border-primary/20'
}

function linkItems(address?: string): LinkItem[] {
  if (!address) return []
  return getAddressLinks(address)
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
