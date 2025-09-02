<template>
  <div
    id="layout-topbar"
    role="navigation"
    aria-label="Navbar"
    class="flex items-center justify-between px-3 bg-background text-foreground border-b border-border"
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
      <Button variant="outline" size="icon" aria-label="Toggle theme" @click="cycleTheme">
        <span class="iconify size-4.5" :class="icon" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useColorMode } from '@vueuse/core'
import { Button } from '@/components/ui/button'

defineOptions({ name: 'AppTopbar' })

const mode = useColorMode({
  attribute: 'class',
  selector: 'html',
  storageKey: 'vueuse-color-scheme',
  initialValue: 'auto',
  emitAuto: true,
})
const modes = ['light', 'dark', 'auto'] as const

onMounted(() => {
  console.log('[theme] init', {
    mode: mode.value,
    htmlHasDark: document.documentElement.classList.contains('dark'),
  })
})

watch(
  () => mode.value,
  (newVal, oldVal) => {
    console.log('[theme] mode changed', {
      oldVal,
      newVal,
      htmlClass: document.documentElement.className,
    })
  }
)

const icon = computed(() =>
  mode.value === 'light'
    ? 'lucide--sun'
    : mode.value === 'dark'
      ? 'lucide--moon'
      : 'lucide--sun-moon'
)

function cycleTheme() {
  const current = mode.value as (typeof modes)[number] | string
  const i = modes.indexOf(current as any)
  const next = modes[(i + 1) % modes.length]
  console.log('[theme] cycle click', { current, next })
  mode.value = next
}
</script>
