<template>
  <!-- Sidebar -->
  <div
    id="layout-sidebar"
    class="sidebar-menu sidebar-menu-activation transition-[margin,top,max-height,border-radius] duration-300 ease-in-out motion-reduce:transition-none bg-base-100/95"
  >
    <div class="flex min-h-16 items-center justify-between gap-3 ps-5 pe-4">
      <a href="/" class="font-semibold">Dyson Protocol 2</a>
    </div>
    <div class="relative min-h-0 grow">
      <div data-simplebar class="size-full overflow-y-auto">
        <div class="mt-4 px-2.5 pb-4 space-y-2">
          <KeplrCard />
          <CosmjsWallets />
          <div class="divider"></div>
          <nav>
            <router-link to="/names" class="btn btn-ghost w-full justify-start">Names</router-link>
          </nav>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import KeplrCard from '@/components/wallet/KeplrCard.vue'
import CosmjsWallets from '@/components/wallet/CosmjsWallets.vue'
</script>
