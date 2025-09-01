<template>
  <div
    id="layout-topbar"
    role="navigation"
    aria-label="Navbar"
    class="flex items-center justify-between px-3"
  >
    <div class="inline-flex items-center gap-3">
      <label
        for="layout-sidebar-toggle-trigger"
        class="btn btn-square btn-ghost btn-sm"
        aria-label="Menu"
      >
        <span class="iconify lucide--panel-left size-5" />
      </label>
    </div>
    <div class="inline-flex items-center gap-1">
      <button aria-label="Toggle Theme" class="btn btn-sm btn-circle btn-ghost" @click="cycleTheme">
        <span class="iconify size-4.5" :class="icon" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useColorMode } from '@vueuse/core'

defineOptions({ name: 'AppTopbar' })

const mode = useColorMode()
const modes = ['light', 'dark', 'auto'] as const

const icon = computed(() =>
  mode.value === 'light'
    ? 'lucide--sun'
    : mode.value === 'dark'
      ? 'lucide--moon'
      : 'lucide--sun-moon'
)

function cycleTheme() {
  const i = modes.indexOf(mode.value as any)
  mode.value = modes[(i + 1) % modes.length]
}
</script>
