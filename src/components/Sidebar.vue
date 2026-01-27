<template>
  <Sidebar collapsible="icon">
    <SidebarHeader class="!p-0">
      <!-- Logo Header (V6 design) -->
      <router-link
        to="/"
        :class="[
          'border-b border-sidebar-border/50 flex flex-col items-center justify-center transition-[height,padding] duration-100 ease-out motion-reduce:transition-none',
          isCollapsed ? 'h-14 px-2' : 'h-24 px-4 py-3'
        ]"
      >
        <div class="relative">
          <div class="flex items-center justify-center size-10">
            <img
              :src="dysLogo"
              alt="Dyson"
              class="size-10"
            />
          </div>
        </div>
        <!-- Logo text with opacity transition -->
        <div
          :class="[
            'grid transition-[opacity,grid-template-rows] duration-75 ease-out motion-reduce:transition-none',
            isCollapsed ? 'opacity-0 grid-rows-[0fr]' : 'opacity-100 grid-rows-[1fr] delay-50'
          ]"
        >
          <div class="overflow-hidden flex flex-col items-center whitespace-nowrap">
            <span class="font-bold text-sm">Dyson Protocol</span>
            <span class="text-[10px] text-muted-foreground">Blockchain Explorer</span>
          </div>
        </div>
      </router-link>

      <!-- Chain Status Bar (block height + chain badge) -->
      <div
        :class="[
          'border-b flex items-center justify-between text-[10px] text-muted-foreground transition-[opacity,height,padding,border] duration-75 ease-out motion-reduce:transition-none whitespace-nowrap overflow-hidden',
          isCollapsed ? 'opacity-0 h-0 p-0 border-transparent' : 'opacity-100 h-7 px-2 py-1.5 border-sidebar-border/50 delay-50'
        ]"
      >
        <div class="flex items-center gap-1.5">
          <span :class="['size-1.5 rounded-full animate-pulse flex-shrink-0', statusIndicatorClass]" />
          <span class="font-mono">{{ latestHeight || '...' }}</span>
        </div>
        <span
          :class="[
            'font-mono font-medium px-1.5 py-0.5 rounded cursor-help text-[9px]',
            isNonMainnet
              ? 'bg-amber-500/10 text-amber-600'
              : 'bg-emerald-500/10 text-emerald-600'
          ]"
          :title="chainIdDisplay"
        >
          {{ isNonMainnet ? 'testnet' : 'mainnet' }}
        </span>
      </div>
    </SidebarHeader>

    <SidebarContent>
      <!-- Migration CTA -->
      <SidebarGroup v-if="showMigration">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as-child class="bg-emerald-500 text-white hover:bg-emerald-600">
                <router-link to="/migrate">Convert old DYS to DYS2</router-link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <!-- Main Navigation -->
      <SidebarGroup>
        <SidebarGroupLabel>Explorer</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in mainNavItems" :key="item.path">
              <SidebarMenuButton as-child :is-active="isActive(item.path)">
                <router-link :to="item.path">
                  <span :class="['iconify', item.icon, 'size-4']" />
                  <span>{{ item.label }}</span>
                </router-link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <!-- Docs Navigation (top-level link with collapsible submenus) -->
      <SidebarGroup>
        <SidebarGroupLabel>Resources</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <Collapsible v-model:open="docsExpanded" as-child class="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger as-child>
                  <SidebarMenuButton :is-active="isOnDocsRoute" @click="handleDocsClick">
                    <span class="iconify lucide--book-open size-4" />
                    <span>Documentation</span>
                    <ChevronRight
                      v-if="docsSubItems.length > 0"
                      class="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90"
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem v-for="item in docsSubItems" :key="item.path">
                      <SidebarMenuSubButton as-child :is-active="isActive(item.path)">
                        <router-link :to="item.path">
                          {{ item.title }}
                        </router-link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <!-- Wallets -->
      <SidebarGroup class="mt-auto">
        <SidebarGroupContent>
          <WalletList />
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <!-- Version info footer -->
    <SidebarFooter class="!p-0">
      <div
        :class="[
          'border-t text-[9px] text-muted-foreground/70 transition-[opacity,height,padding,border] duration-75 ease-out motion-reduce:transition-none whitespace-nowrap overflow-hidden',
          isCollapsed ? 'opacity-0 h-0 p-0 border-transparent' : 'opacity-100 px-2 py-1.5 border-sidebar-border/50 delay-50'
        ]"
      >
        <div v-if="nodeVersion" class="flex items-center justify-between">
          <span>Node</span>
          <span class="font-mono">
            <a :href="nodeBranchUrl" target="_blank" rel="noreferrer" class="hover:text-foreground">{{ nodeVersion }}</a>
          </span>
        </div>
        <div class="flex items-center justify-between mt-0.5">
          <span>UI</span>
          <span class="font-mono">
            <a :href="dashBranchUrl" target="_blank" rel="noreferrer" class="hover:text-foreground">{{ dashBranch }}</a>
            <span class="mx-0.5">·</span>
            <a :href="dashCommitUrl" target="_blank" rel="noreferrer" class="hover:text-foreground">{{ dashCommit }}</a>
          </span>
        </div>
      </div>
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import { ChevronRight } from 'lucide-vue-next'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import WalletList from '@/components/wallet/WalletList.vue'
import { LatestBlock, NodeInfo } from '@/orm/models/base/TendermintService'
import { chainStatus } from '@/orm/pollers/latestBlock'
import { useAppColorMode } from '@/composables/useAppColorMode'
import dysLogoLight from '@/assets/images/dys.svg'
import dysLogoDark from '@/assets/images/dys-inverted.svg'

defineOptions({ name: 'AppSidebar' })

const route = useRoute()
const router = useRouter()
const { state, isMobile, openMobile } = useSidebar()
const { isDark } = useAppColorMode()

// Sidebar content state - on mobile, always show expanded when sheet is open
const isCollapsed = computed(() => {
  if (isMobile.value) return !openMobile.value
  return state.value === 'collapsed'
})

// Theme-aware logo
const dysLogo = computed(() => isDark.value ? dysLogoLight : dysLogoDark)

// Chain data
const latestBlockRepo = useRepo(LatestBlock)
const nodeInfoRepo = useRepo(NodeInfo)
const latest = computed(() => latestBlockRepo.find('default') || {})
const node = computed(() => nodeInfoRepo.find('default') || {})
const chainIdDisplay = computed(() => String(node.value.network || latest.value.chain_id || ''))
const latestHeight = computed(() => (latest.value.height ? String(latest.value.height) : ''))
const showMigration = computed(() => chainIdDisplay.value === 'dys2-mainnet-1')
const isNonMainnet = computed(() => chainIdDisplay.value !== 'dys2-mainnet-1')
const nodeVersion = computed(() => String(node.value.version || ''))
const nodeRepoUrl = 'https://github.com/dysonprotocol/dysonprotocol2'
const nodeBranchUrl = computed(() => nodeVersion.value ? `${nodeRepoUrl}/tree/${nodeVersion.value}` : '#')

// Chain status indicator classes
const statusIndicatorClass = computed(() => {
  switch (chainStatus.value) {
    case 'connected': return 'bg-emerald-500'
    case 'connecting': return 'bg-amber-500'
    case 'error': return 'bg-red-500'
    default: return 'bg-amber-500'
  }
})

// Dashboard version info (from build-time env or git)
const dashRepoUrl = 'https://github.com/dysonprotocol/dysonprotocol2-dashboard'
const dashBranch = import.meta.env.VITE_GIT_BRANCH || 'main'
const dashCommit = import.meta.env.VITE_GIT_COMMIT?.slice(0, 7) || 'dev'
const dashBranchUrl = `${dashRepoUrl}/tree/${dashBranch}`
const dashCommitUrl = import.meta.env.VITE_GIT_COMMIT ? `${dashRepoUrl}/commit/${import.meta.env.VITE_GIT_COMMIT}` : '#'

// Fetch node info on mount
useAxiosRepo(NodeInfo).api().fetch()

// Navigation items
const mainNavItems = [
  { path: '/names', label: 'Names', icon: 'lucide--at-sign' },
  { path: '/tasks', label: 'Crontasks', icon: 'lucide--clock' },
  { path: '/blocks', label: 'Blocks', icon: 'lucide--box' },
  { path: '/txs', label: 'Transactions', icon: 'lucide--arrow-right-left' },
  { path: '/validators', label: 'Validators', icon: 'lucide--shield-check' },
  { path: '/gov', label: 'Governance', icon: 'lucide--vote' },
  { path: '/whaleswap', label: 'Whaleswap', icon: 'lucide--waves' },
  { path: '/ibc', label: 'IBC', icon: 'lucide--globe' },
]

// Docs navigation (dynamically loaded from markdown files)
const docModules = import.meta.glob<{ frontmatter?: { title?: string; order?: number } }>(
  '@/docs/**/*.md',
  { eager: true }
)

const docsNavItems = computed(() => {
  const items: { path: string; title: string; order: number }[] = []
  for (const [filePath, mod] of Object.entries(docModules)) {
    const relativePath = filePath.replace(/^.*\/src\/docs\//, '').replace(/\.md$/, '')
    const parts = relativePath.split('/')
    const fileName = parts.pop() || 'index'
    const title = mod.frontmatter?.title || formatFileName(fileName)
    const order = mod.frontmatter?.order ?? 999
    const routePath = fileName === 'index' && parts.length === 0
      ? '/docs'
      : `/docs/${relativePath}`
    items.push({ path: routePath, title, order })
  }
  return items.sort((a, b) => a.order - b.order)
})

// Sub-items exclude the docs index (shown as top-level link)
const docsSubItems = computed(() => docsNavItems.value.filter(item => item.path !== '/docs'))

function formatFileName(name: string): string {
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Route-aware docs expansion
const docsExpanded = ref(false)
const isOnDocsRoute = computed(() => route.path.startsWith('/docs'))

watch(isOnDocsRoute, (onDocs) => {
  if (onDocs) docsExpanded.value = true
}, { immediate: true })

function isActive(path: string): boolean {
  if (path === '/docs') return route.path === '/docs'
  return route.path === path || route.path.startsWith(path + '/')
}

function handleDocsClick() {
  router.push('/docs')
}
</script>
