<template>
  <div class="size-full relative">
    <VoronoiBackground />
    <div class="flex h-screen overflow-hidden relative z-10">
      <input
        ref="sidebarToggle"
        id="layout-sidebar-toggle-trigger"
        type="checkbox"
        class="hidden"
        aria-label="Toggle layout sidebar"
      />

      <Sidebar />
      <div class="flex min-w-0 grow flex-col min-h-0 overflow-auto">
        <Topbar />
        <div id="layout-content" class="pl-2 pr-2">
          <router-view :key="$route.path + JSON.stringify($route.query)" />
        </div>
      </div>
      <label id="layout-sidebar-backdrop" for="layout-sidebar-toggle-trigger" />
    </div>
    <GlobalTransactionDialog />
    <Toaster />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Topbar from './components/Topbar.vue'
import VoronoiBackground from './components/VoronoiBackground.vue'
import { useWallet } from './composables/useWallet'
import GlobalTransactionDialog from '@/components/shared/GlobalTransactionDialog.vue'
import { Toaster } from '@/components/ui/sonner'
import { useTxToasts } from '@/composables/useTxToasts'
import { startLatestBlockPoller, stopLatestBlockPoller } from '@/orm/pollers/latestBlock'

const { init, cleanup } = useWallet()
const sidebarToggle = ref(null)
const STORAGE_KEY = 'sidebar-expanded'

onMounted(() => {
  init()
  // Activate txHistory → toast bridge once at app root
  useTxToasts()
  startLatestBlockPoller()

  // Restore sidebar state from localStorage (default: collapsed)
  const savedState = localStorage.getItem(STORAGE_KEY)
  if (sidebarToggle.value) {
    sidebarToggle.value.checked = savedState === 'true'

    // Enable sidebar transitions after initial state is rendered
    // Double rAF ensures the browser has painted the initial state
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.setAttribute('data-sidebar-ready', '')
      })
    })

    // Listen for changes (including label clicks)
    sidebarToggle.value.addEventListener('change', () => {
      localStorage.setItem(STORAGE_KEY, String(sidebarToggle.value.checked))
    })
  }
})

onBeforeUnmount(() => {
  cleanup()
  stopLatestBlockPoller()
})
</script>
