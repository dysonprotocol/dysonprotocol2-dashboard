<template>
  <header
    id="layout-topbar"
    role="navigation"
    aria-label="Navbar"
    class="h-14 flex items-center justify-between px-4 border-b border-border bg-background"
  >
    <!-- Left: Sidebar trigger + Breadcrumbs -->
    <div class="flex items-center gap-3 min-w-0">
      <SidebarTrigger class="p-1.5 rounded-md hover:bg-muted flex-shrink-0" />

      <!-- Breadcrumbs -->
      <nav v-if="breadcrumbs.length > 0" class="flex items-center gap-1.5 text-sm min-w-0">
        <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
          <router-link
            v-if="!crumb.isLast"
            :to="crumb.path"
            class="text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            {{ crumb.label }}
          </router-link>
          <span
            v-else
            class="font-medium truncate"
          >
            {{ crumb.label }}
          </span>
          <span
            v-if="index < breadcrumbs.length - 1"
            class="iconify lucide--chevron-right size-3 text-muted-foreground flex-shrink-0"
          />
        </template>
      </nav>
    </div>

    <!-- Right: Search + Theme toggle -->
    <div class="flex items-center gap-2 flex-shrink-0">
      <!-- Search button -->
      <Dialog v-model:open="searchOpen">
        <DialogTrigger as-child>
          <button
            class="flex items-center gap-2 px-3 py-1.5 rounded-md border border-input text-sm text-muted-foreground hover:bg-muted"
            aria-label="Search"
          >
            <span class="iconify lucide--search size-4" />
            <span class="hidden md:inline">Search...</span>
            <kbd class="hidden lg:inline rounded border bg-muted px-1.5 py-0.5 text-xs">⌘K</kbd>
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
        class="p-1.5 rounded-md hover:bg-muted"
        aria-label="Toggle theme"
        @click="cycleTheme"
      >
        <span class="iconify size-4" :class="icon" />
      </button>
    </div>
  </header>
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
import { SidebarTrigger } from '@/components/ui/sidebar'
import CommandPalette from '@/components/CommandPalette.vue'
import { useBreadcrumbs } from '@/composables/useBreadcrumbs'

defineOptions({ name: 'AppTopbar' })

// Breadcrumbs
const { breadcrumbs } = useBreadcrumbs()

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
