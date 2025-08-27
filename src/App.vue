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
      <input
        type="checkbox"
        id="layout-sidebar-hover-trigger"
        class="hidden"
        aria-label="Dense layout sidebar"
      />
      <div id="layout-sidebar-hover" class="bg-base-300 h-screen w-5"></div>
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
import { provide, onMounted, onBeforeUnmount } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Topbar from './components/Topbar.vue'
import { useWallet } from './composables/useWallet'

const resolveRestUrl = () => (typeof window !== 'undefined' ? window.location.origin : '')
const CHAIN_INFO = {
  restUrl: resolveRestUrl(),
  bech32Prefix: 'dys2',
}
provide('chainInfo', CHAIN_INFO)

if (typeof window !== 'undefined') {
  window.resolveRestUrl = resolveRestUrl
}

const { init, cleanup } = useWallet()

onMounted(() => {
  init()
})

onBeforeUnmount(() => {
  cleanup()
})
</script>
