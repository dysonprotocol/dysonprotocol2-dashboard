<template>
  <!-- Sidebar -->
  <div id="layout-sidebar" class="sidebar-menu sidebar-menu-activation">
    <div class="flex min-h-16 items-center justify-between gap-3 ps-5 pe-4">
      <a href="/" class="font-semibold">Dyson Dashboard</a>
    </div>
    <div class="relative min-h-0 grow">
      <div data-simplebar class="size-full overflow-y-scroll">
        <div class="mt-4 px-2.5 pb-4 space-y-2">
          <label
            for="layout-sidebar-hover-trigger"
            class="btn btn-ghost btn-sm w-full justify-start"
          >
            <span class="iconify lucide--panel-left-dashed size-4"></span>
            <span>Sidebar hover</span>
          </label>
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
