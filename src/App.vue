<template>
  <div class="size-full">
    <div class="flex h-screen overflow-hidden">
      <!-- Hidden toggles replicate Nexus structure -->
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
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Topbar from './components/Topbar.vue'
import { useWallet } from './composables/useWallet'
import GlobalTransactionDialog from '@/components/shared/GlobalTransactionDialog.vue'

const { init, cleanup } = useWallet()

onMounted(() => {
  init()
})

onBeforeUnmount(() => {
  cleanup()
})
</script>
