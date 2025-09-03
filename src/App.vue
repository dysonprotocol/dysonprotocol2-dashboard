<template>
  <div class="size-full">
    <div class="flex h-screen overflow-hidden">
      <input
        id="layout-sidebar-toggle-trigger"
        type="checkbox"
        class="hidden"
        aria-label="Toggle layout sidebar"
      />

      <Sidebar />
      <div class="flex min-w-0 grow flex-col min-h-0 overflow-auto">
        <Topbar />
        <div id="layout-content" class="pl-2">
          <router-view />
        </div>
      </div>
      <label id="layout-sidebar-backdrop" for="layout-sidebar-toggle-trigger" />
    </div>
    <GlobalTransactionDialog />
    <Toaster />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Topbar from './components/Topbar.vue'
import { useWallet } from './composables/useWallet'
import GlobalTransactionDialog from '@/components/shared/GlobalTransactionDialog.vue'
import { Toaster } from '@/components/ui/sonner'
import { useTxToasts } from '@/composables/useTxToasts'
import { startLatestBlockPoller, stopLatestBlockPoller } from '@/orm/pollers/latestBlock'

const { init, cleanup } = useWallet()

onMounted(() => {
  init()
  // Activate txHistory → toast bridge once at app root
  useTxToasts()
  startLatestBlockPoller()
})

onBeforeUnmount(() => {
  cleanup()
  stopLatestBlockPoller()
})
</script>
