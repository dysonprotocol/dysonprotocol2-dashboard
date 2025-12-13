<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-2">
      <router-link
        v-for="link in links"
        :key="link.text"
        :to="link.to"
        custom
        v-slot="{ href, navigate, isExactActive }"
      >
        <a :href="href" @click="navigate" :class="tabButtonClass(isExactActive)">
          {{ link.text }}
        </a>
      </router-link>
    </div>

    <router-view :key="$route.path + JSON.stringify($route.query)" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getAddressLinks } from '@/navigation/addressLinks'
import { Button } from '@/components/ui/button'

const props = defineProps<{ address: string }>()
const address = computed(() => props.address)

const links = computed(() => getAddressLinks(address.value))

function tabButtonClass(isActive: boolean): string {
  const base = 'inline-flex items-center gap-2  px-3 py-1.5 h-8 text-sm transition-colors '
  return isActive ? base + 'text-primary ' : base
}
</script>
