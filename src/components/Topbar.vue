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
    <div class="flex min-h-16 items-center justify-between gap-3 ps-5 pe-4">
      <img :src="dysLogoInverted" alt="Dyson logo" class="h-6 w-auto block dark:hidden" />
      <img :src="dysLogo" alt="Dyson logo inverted" class="h-6 w-auto hidden dark:block" />
      <a href="/" class="font-semibold">Dyson Protocol 2</a>
    </div>
    <div class="inline-flex items-center gap-1">
      <Button variant="outline" size="icon" aria-label="Toggle theme" @click="cycleTheme">
        <span class="iconify size-4.5" :class="icon" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useColorMode } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import dysLogo from '@/assets/images/dys.svg'
import dysLogoInverted from '@/assets/images/dys-inverted.svg'

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
    syncDaisyTheme()
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

function setDaisyTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme
}

let stopSystemSync: (() => void) | null = null

function startSystemSync() {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const apply = () => setDaisyTheme(media.matches ? 'dark' : 'light')
  apply()
  media.addEventListener('change', apply)
  stopSystemSync = () => media.removeEventListener('change', apply)
}

function endSystemSync() {
  if (stopSystemSync) {
    stopSystemSync()
    stopSystemSync = null
  }
}

function syncDaisyTheme() {
  if (mode.value === 'auto') {
    startSystemSync()
    return
  }
  endSystemSync()
  setDaisyTheme(mode.value === 'dark' ? 'dark' : 'light')
}

onMounted(() => {
  syncDaisyTheme()
})

onBeforeUnmount(() => {
  endSystemSync()
})
</script>
