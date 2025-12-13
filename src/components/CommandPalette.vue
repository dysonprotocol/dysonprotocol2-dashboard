<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useSwaggerDocsGlobal } from '@/composables/useSwaggerDocs'
import { getAddressLinks } from '@/navigation/addressLinks'

const props = defineProps<{
  onSelect?: () => void
}>()

// Close on Escape
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') props.onSelect?.()
}
onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))

const router = useRouter()
const searchQuery = ref('')

// API endpoints search
const { endpoints } = useSwaggerDocsGlobal()

// Multi-term search: "bank send" matches endpoints containing both "bank" AND "send"
const apiResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q || q.length < 2) return []

  const tokens = q.split(/\s+/).filter((t) => t.length > 0)
  if (tokens.length === 0) return []

  const scored = endpoints.value
    .map((ep) => {
      const searchable = `${ep.operationId} ${ep.summary} ${ep.path}`.toLowerCase()
      const matchCount = tokens.filter((t) => searchable.includes(t)).length
      return { ep, matchCount }
    })
    .filter(({ matchCount }) => matchCount === tokens.length)
    .sort((a, b) => b.matchCount - a.matchCount)

  return scored.slice(0, 10).map(({ ep }) => ep)
})

// Detection patterns
const ADDRESS_PATTERN = /^dys2[a-z0-9]{38,}$/i
const TX_HASH_PATTERN = /^[A-Fa-f0-9]{64}$/
const BLOCK_HEIGHT_PATTERN = /^\d+$/
const NAME_PATTERN = /^[a-z][a-z0-9_-]*\.dys$/i
const NAME_PARTIAL_PATTERN = /^[a-z][a-z0-9_-]*(\.d?y?)?$/i

const detectedType = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return null
  if (ADDRESS_PATTERN.test(q)) return 'address'
  if (TX_HASH_PATTERN.test(q)) return 'tx'
  if (BLOCK_HEIGHT_PATTERN.test(q) && parseInt(q) > 0) return 'block'
  if (NAME_PATTERN.test(q)) return 'name'
  if (q.startsWith('dys2')) return 'address-partial'
  if (/^[A-Fa-f0-9]+$/.test(q) && q.length < 64) return 'tx-partial'
  if (NAME_PARTIAL_PATTERN.test(q)) return 'name-partial'
  return 'unknown'
})

const cleanedQuery = computed(() => searchQuery.value.trim())
const baseName = computed(() => cleanedQuery.value.replace(/\.d?y?s?$/, ''))

// Address page links when address is detected
const addressLinks = computed(() =>
  detectedType.value === 'address' ? getAddressLinks(cleanedQuery.value) : []
)

const onSearchChange = (value: string) => {
  searchQuery.value = value
}

// Navigation with optional callback
const navigate = (to: Parameters<typeof router.push>[0]) => {
  router.push(to)
  props.onSelect?.()
}

const goToAddress = () => {
  if (cleanedQuery.value)
    navigate({ name: 'AddressSummary', params: { address: cleanedQuery.value } })
}

const goToTx = () => {
  if (cleanedQuery.value)
    navigate({ name: 'TransactionDetails', params: { hash: cleanedQuery.value.toUpperCase() } })
}

const goToBlock = () => {
  if (cleanedQuery.value) navigate({ name: 'BlockDetail', params: { height: cleanedQuery.value } })
}

const goToName = (name?: string) => {
  const n = name ?? cleanedQuery.value
  if (n) navigate({ name: 'NameDetails', params: { name: n } })
}

const goToApiEndpoint = (operationId: string) => {
  navigate({ name: 'ApiIndex', query: { type: operationId } })
}

const quickLinks = [
  { label: 'Names', route: 'NameList' },
  { label: 'Blocks', route: 'BlocksList' },
  { label: 'Transactions', route: 'TxsList' },
  { label: 'Validators', route: 'ValidatorsList' },
  { label: 'API Explorer', route: 'ApiIndex' },
]
</script>

<template>
  <Command class="rounded-lg border shadow-md" :ignore-filter="true">
    <CommandInput
      placeholder="Search address, tx, name, block, or API..."
      @input="(e: Event) => onSearchChange((e.target as HTMLInputElement).value)"
    />
    <CommandList class="max-h-[60vh] overflow-y-scroll">
      <CommandEmpty>
        <div class="py-2 text-muted-foreground">
          <p>Enter a search term to find:</p>
          <ul class="mt-2 space-y-1 text-sm">
            <li><code class="rounded bg-muted px-1">dys2...</code> — Address</li>
            <li><code class="rounded bg-muted px-1">ABC123...</code> — Tx hash (64 hex)</li>
            <li><code class="rounded bg-muted px-1">alice.dys</code> — Dyson name</li>
            <li><code class="rounded bg-muted px-1">12345</code> — Block height</li>
            <li><code class="rounded bg-muted px-1">bank send</code> — API search</li>
          </ul>
        </div>
      </CommandEmpty>

      <!-- Address -->
      <CommandGroup v-if="detectedType === 'address'" heading="Address Found">
        <CommandItem
          v-for="link in addressLinks"
          :key="link.text"
          :value="'addr-' + link.text"
          @select="navigate(link.to)"
        >
          {{ cleanedQuery }} - {{ link.text }}
        </CommandItem>
      </CommandGroup>

      <CommandGroup v-if="detectedType === 'address-partial'" heading="Looks like an address">
        <CommandItem :value="cleanedQuery" @select="goToAddress">
          <span>Go to address: {{ cleanedQuery }}</span>
        </CommandItem>
      </CommandGroup>

      <!-- Transaction -->
      <CommandGroup v-if="detectedType === 'tx'" heading="Transaction Hash Found">
        <CommandItem :value="cleanedQuery" @select="goToTx">
          <span class="truncate">{{ cleanedQuery.toUpperCase() }}</span>
        </CommandItem>
      </CommandGroup>

      <CommandGroup v-if="detectedType === 'tx-partial'" heading="Looks like a tx hash">
        <CommandItem :value="cleanedQuery" @select="goToTx">
          <span>Search tx: {{ cleanedQuery }} ({{ cleanedQuery.length }}/64 chars)</span>
        </CommandItem>
      </CommandGroup>

      <!-- Block -->
      <CommandGroup v-if="detectedType === 'block'" heading="Block Height">
        <CommandItem :value="cleanedQuery" @select="goToBlock">
          <span>Block #{{ cleanedQuery }}</span>
        </CommandItem>
      </CommandGroup>

      <!-- Name -->
      <CommandGroup v-if="detectedType === 'name'" heading="Dyson Name">
        <CommandItem :value="cleanedQuery" @select="() => goToName()">
          <span>{{ cleanedQuery }}</span>
        </CommandItem>
      </CommandGroup>

      <CommandGroup v-if="detectedType === 'name-partial'" heading="Dyson Name">
        <CommandItem :value="baseName + '.dys'" @select="() => goToName(baseName + '.dys')">
          <span>{{ baseName }}.dys</span>
        </CommandItem>
      </CommandGroup>

      <!-- Unknown fallback (only if no spaces - names/addresses/txs can't have spaces) -->
      <CommandGroup
        v-if="detectedType === 'unknown' && cleanedQuery && !/\s/.test(cleanedQuery)"
        heading="Search as..."
      >
        <CommandItem value="search-name" @select="() => goToName(baseName + '.dys')">
          <span>Name: {{ baseName }}.dys</span>
        </CommandItem>
        <CommandItem value="search-address" @select="goToAddress">
          <span>Address: {{ cleanedQuery }}</span>
        </CommandItem>
        <CommandItem value="search-tx" @select="goToTx">
          <span>Transaction: {{ cleanedQuery }}</span>
        </CommandItem>
      </CommandGroup>

      <!-- API Endpoints -->
      <CommandGroup v-if="apiResults.length > 0" heading="API Endpoints">
        <CommandItem
          v-for="ep in apiResults"
          :key="ep.operationId"
          :value="'api-' + ep.operationId"
          @select="() => goToApiEndpoint(ep.operationId)"
        >
          <div class="flex flex-col">
            <span class="font-mono text-xs">{{ ep.operationId }}</span>
            <span class="text-xs text-muted-foreground">{{ ep.summary }}</span>
          </div>
        </CommandItem>
      </CommandGroup>

      <CommandSeparator v-if="searchQuery.trim() || apiResults.length > 0" />

      <!-- Quick navigation -->
      <CommandGroup heading="Quick Navigation">
        <CommandItem
          v-for="link in quickLinks"
          :key="link.route"
          :value="link.label"
          @select="navigate({ name: link.route })"
        >
          {{ link.label }}
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </Command>
</template>
