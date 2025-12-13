<template>
  <div
    id="layout-topbar"
    role="navigation"
    aria-label="Navbar"
    class="flex items-center p-3 justify-between bg-background text-foreground border-b border-border"
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

    <div class="flex items-center justify-between gap-3 ps-5 pe-4">
      <img :src="dysLogoInverted" alt="Dyson logo" class="h-6 w-auto block dark:hidden" />
      <img :src="dysLogo" alt="Dyson logo inverted" class="h-6 w-auto hidden dark:block" />
      <a href="/" class="font-semibold">Dyson Protocol 2</a>
    </div>

    <div class="inline-flex items-center gap-1">
      <!-- Search button -->
      <Dialog v-model:open="searchOpen">
        <DialogTrigger as-child>
          <button
            class="btn btn-ghost btn-sm gap-2 text-muted-foreground hover:text-foreground"
            aria-label="Search"
          >
            <span class="iconify lucide--search size-4" />
            <span class="hidden sm:inline text-sm">Search</span>
            <kbd class="hidden sm:inline rounded border bg-muted px-1.5 py-0.5 text-xs">⌘K</kbd>
          </button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-2xl p-0 gap-0">
          <DialogTitle class="sr-only">Search</DialogTitle>
          <DialogDescription class="sr-only">
            Search for addresses, transactions, names, blocks, or API endpoints
          </DialogDescription>
          <CommandPalette :on-select="() => (searchOpen = false)" />
        </DialogContent>
      </Dialog>

      <!-- Theme toggle -->
      <button
        class="btn btn-square btn-ghost btn-sm"
        size="icon"
        aria-label="Toggle theme"
        @click="cycleTheme"
      >
        <span class="iconify size-4.5" :class="icon" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useColorMode, useMagicKeys, whenever } from '@vueuse/core'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import CommandPalette from '@/components/CommandPalette.vue'
import dysLogo from '@/assets/images/dys.svg'
import dysLogoInverted from '@/assets/images/dys-inverted.svg'

defineOptions({ name: 'AppTopbar' })

// Search dialog state
const searchOpen = ref(false)

// ⌘K to open search
const { meta_k } = useMagicKeys()
whenever(meta_k, () => {
  searchOpen.value = true
})

// Theme management
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
