<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-2">
      <router-link
        v-for="t in tabs"
        :key="t.name"
        :to="{ name: t.name as any, params: { address } }"
      >
        <Button :variant="route.name === t.name ? 'secondary' : 'outline'" class="gap-2">
          <component :is="t.icon" class="size-4" aria-hidden="true" />
          {{ t.label }}
        </Button>
      </router-link>
    </div>

    <router-view />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import {
  DocumentTextIcon,
  CodeBracketIcon,
  TagIcon,
  FolderIcon,
  CubeIcon,
  UserGroupIcon,
  KeyIcon,
  BanknotesIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{ address: string }>()
const route = useRoute()
const address = computed(() => props.address)

const tabs = [
  { name: 'AddressSummary', label: 'Summary', icon: DocumentTextIcon },
  { name: 'AddressScript', label: 'Script', icon: CodeBracketIcon },
  { name: 'AddressNames', label: 'Names', icon: TagIcon },
  { name: 'AddressCoins', label: 'Coins', icon: BanknotesIcon },
  { name: 'AddressStorage', label: 'Storage', icon: FolderIcon },
  { name: 'AddressStaking', label: 'Staking', icon: UserGroupIcon },
  { name: 'AddressNFTs', label: 'NFTs', icon: CubeIcon },
  { name: 'AddressAuthz', label: 'Authz', icon: KeyIcon },
]
</script>
