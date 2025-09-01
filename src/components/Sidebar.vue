<template>
  <!-- Sidebar -->
  <div
    id="layout-sidebar"
    class="sidebar-menu sidebar-menu-activation transition-[margin,top,max-height,border-radius] duration-300 ease-in-out motion-reduce:transition-none"
  >
    <div class="flex min-h-16 items-center justify-between gap-3 ps-5 pe-4">
      <a href="/" class="font-semibold">Dyson Protocol 2</a>
    </div>
    <div class="relative min-h-0 grow">
      <div data-simplebar class="size-full overflow-y-auto">
        <div class="mt-4 px-2.5 pb-4 space-y-2">
          <KeplrCard />
          <CosmjsWallets />
          <div class="divider" />
          <nav class="space-y-2 flex flex-col">
            <router-link to="/names" class="w-full justify-start"> Names </router-link>
            <router-link to="/blocks" class="w-full justify-start"> Blocks </router-link>
            <router-link to="/txs" class="w-full justify-start"> Transactions </router-link>
            <router-link to="/validators" class="w-full justify-start"> Validators </router-link>
            <router-link to="/gov" class="w-full justify-start"> Governance </router-link>
            <router-link to="/tasks" class="w-full justify-start"> Tasks </router-link>
          </nav>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: 'AppSidebar' })
import KeplrCard from '@/components/wallet/KeplrCard.vue'
import CosmjsWallets from '@/components/wallet/CosmjsWallets.vue'
</script>
