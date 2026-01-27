<template>
  <div class="size-full relative">
    <VoronoiBackground />
    <SidebarProvider class="relative z-10 !h-svh !min-h-0 max-h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset class="flex flex-col min-h-0 h-full overflow-hidden">
        <Topbar />
        <div id="layout-content" class="flex-1 overflow-auto px-2">
          <router-view :key="$route.path + JSON.stringify($route.query)" />
        </div>
      </SidebarInset>
    </SidebarProvider>
    <GlobalTransactionDialog />
    <Toaster />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import AppSidebar from './components/Sidebar.vue'
import Topbar from './components/Topbar.vue'
import VoronoiBackground from './components/VoronoiBackground.vue'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { useWallet } from './composables/useWallet'
import GlobalTransactionDialog from '@/components/shared/GlobalTransactionDialog.vue'
import { Toaster } from '@/components/ui/sonner'
import { useTxToasts } from '@/composables/useTxToasts'
import { startLatestBlockPoller, stopLatestBlockPoller } from '@/orm/pollers/latestBlock'

const { init, cleanup } = useWallet()

onMounted(() => {
  init()
  useTxToasts()
  startLatestBlockPoller()
})

onBeforeUnmount(() => {
  cleanup()
  stopLatestBlockPoller()
})
</script>
