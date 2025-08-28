<template>
  <div class="size-full">
    <div class="flex h-screen overflow-hidden">
      <!-- Hidden toggles replicate Nexus structure -->
      <input
        type="checkbox"
        id="layout-sidebar-toggle-trigger"
        class="hidden"
        aria-label="Toggle layout sidebar"
      />

      <Sidebar />
      <div class="flex min-w-0 grow flex-col min-h-0 overflow-auto">
        <Topbar />
        <div id="layout-content" class="p-4">
          <router-view />
        </div>
      </div>
      <label for="layout-sidebar-toggle-trigger" id="layout-sidebar-backdrop"></label>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Topbar from './components/Topbar.vue'
import { useWallet } from './composables/useWallet'

const { init, cleanup } = useWallet()

onMounted(() => {
  init()
})

onBeforeUnmount(() => {
  cleanup()
})
</script>
