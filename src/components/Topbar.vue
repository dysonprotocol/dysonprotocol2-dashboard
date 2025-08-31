<template>
  <div
    id="layout-topbar"
    role="navigation"
    aria-label="Navbar"
    class="flex items-center justify-between px-3 bg-base-100/95"
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
      <button
        aria-label="Toggle Theme"
        class="btn btn-sm btn-circle btn-ghost"
        @click="cycleTheme"
      >
        <span
          class="iconify size-4.5"
          :class="icon"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

const { themeMode, setTheme, modes } = useTheme()

const icon = computed(() =>
  themeMode.value === 'light'
    ? 'lucide--sun'
    : themeMode.value === 'dark'
      ? 'lucide--moon'
      : 'lucide--sun-moon'
)

function cycleTheme() {
  const i = modes.indexOf(themeMode.value)
  setTheme(modes[(i + 1) % modes.length])
}
</script>
