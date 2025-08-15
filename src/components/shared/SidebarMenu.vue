<template>
  <!-- Inner sidebar content shared by mobile and desktop -->
  <div
    class="flex grow flex-col gap-y-5 overflow-y-auto bg-base-100 px-6 pb-4 overflow-scroll"
  >
    <!-- Header -->
    <div class="flex h-16 shrink-0 items-center">
      <router-link
        to="/"
        aria-label="Dyson Protocol"
        class="flex items-center gap-2"
      >
        <img :src="logoSrc" alt="Dyson Protocol" class="h-6 w-auto" />
        <span class="text-xl font-bold">Dyson Protocol</span>
      </router-link>
    </div>

    <!-- Main Navigation -->
    <nav class="flex flex-1 flex-col">
      <ul role="list" class="flex flex-1 flex-col gap-y-7">
        <li>
          <!-- Chain status above Dashboard -->
          <div
            class="-mx-2 mb-2 rounded-md px-2 py-1 text-xs text-base-content/60"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="truncate">Chain ID:</span>
              <span class="font-mono text-base-content/80">{{
                chainIdDisplay || chainId || "…"
              }}</span>
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="truncate">Height:</span>
              <span class="font-mono text-base-content/80">
                <span v-if="latestTimeIso" class="text-base-content/60">{{
                  relativeAgo
                }}</span>
                {{ latestHeight != null ? latestHeight : "…" }}
              </span>
            </div>
          </div>
          <div class="py-5">
            <WalletCards />
          </div>

          <!-- Main navigation (no Dashboard) -->
          <ul role="list" class="-mx-2 mt-1 space-y-1">
            <li v-for="item in navigation" :key="item.name">
              <router-link
                :to="item.href"
                :class="[
                  item.current
                    ? 'bg-base-200 text-primary'
                    : 'text-base-content hover:bg-base-200 hover:text-primary',
                  'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold',
                ]"
              >
                <component
                  :is="item.icon"
                  :class="[
                    item.current
                      ? 'text-primary'
                      : 'text-base-content/60 group-hover:text-primary',
                    'size-6 shrink-0',
                  ]"
                  aria-hidden="true"
                />
                {{ item.name }}
              </router-link>
            </li>
          </ul>
        </li>

        <!-- Chain Explorer -->
        <li>
          <div class="text-xs/6 font-semibold text-base-content/60">
            Chain Explorer
          </div>
          <ul role="list" class="-mx-2 mt-2 space-y-1">
            <li v-for="explorer in explorerItems" :key="explorer.name">
              <router-link
                :to="explorer.href"
                :class="[
                  explorer.current
                    ? 'bg-base-200 text-primary'
                    : 'text-base-content hover:bg-base-200 hover:text-primary',
                  'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold',
                ]"
              >
                <component
                  :is="explorer.icon"
                  :class="[
                    explorer.current
                      ? 'text-primary'
                      : 'text-base-content/60 group-hover:text-primary',
                    'size-6 shrink-0',
                  ]"
                  aria-hidden="true"
                />
                <span class="truncate">{{ explorer.name }}</span>
              </router-link>
            </li>
          </ul>
        </li>
      </ul>
    </nav>

    <!-- Footer actions -->
    <div class="mt-auto flex items-center gap-3 pt-2"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { useWallet } from "@/composables/useWallet";
import { useTheme } from "@/composables/useTheme";
import WalletCards from "@/components/shared/WalletCards.vue";
import {
  DocumentTextIcon,
  CodeBracketIcon,
  UserIcon,
  TagIcon,
  CubeIcon,
  FolderIcon,
  ClockIcon,
  UserGroupIcon,
} from "@heroicons/vue/24/outline";

import logoDark from "@/assets/images/dys.svg";
import logoLight from "@/assets/images/dys-inverted.svg";

const route = useRoute();

const { unlockedWallets, restUrl, chainId } = useWallet();
const { theme } = useTheme();

// Use colored logo on light theme, inverted on dark theme
const logoSrc = computed(() => (theme.value === "dark" ? logoLight : logoDark));

// Chain status (latest block)
const latestHeight = ref(null);
const latestTimeIso = ref("");
const chainIdDisplay = ref("");
const nowMs = ref(Date.now());

// Localized relative time string (e.g., "5 minutes ago")
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const relativeAgo = computed(() => {
  if (!latestTimeIso.value) return "";
  const t = Date.parse(latestTimeIso.value);
  if (Number.isNaN(t)) return "";
  const seconds = Math.floor((nowMs.value - t) / 1000);
  if (seconds <= 1) return "just now";
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [unit, size] of units) {
    if (seconds >= size || unit === "second") {
      const value = Math.round(seconds / size);
      return rtf.format(-value, unit);
    }
  }
  return "";
});

let tickTimer = null;
let pollTimer = null;

async function fetchLatestBlock() {
  const url = `${restUrl.value}/cosmos/base/tendermint/v1beta1/blocks/latest`;
  const resp = await fetch(url);
  const json = await resp.json();
  const header = json?.block?.header || json?.sdk_block?.header;
  if (!header) return;
  chainIdDisplay.value = String(header.chain_id || "");
  latestHeight.value = Number(header.height);
  latestTimeIso.value = String(header.time || "");
}

onMounted(() => {
  fetchLatestBlock();
  tickTimer = setInterval(() => (nowMs.value = Date.now()), 1000);
  pollTimer = setInterval(fetchLatestBlock, 300);
});

onBeforeUnmount(() => {
  if (tickTimer) clearInterval(tickTimer);
  if (pollTimer) clearInterval(pollTimer);
});

// Keplr UI/state handled inside WalletCards

// Import wallet form state moved to WalletCards.vue

const navigation = computed(() => [
  /*
  {
    name: "Documentation",
    href: "/docs",
    icon: DocumentTextIcon,
    current: route.path === "/docs",
  },
  {
    name: "API Explorer",
    href: "/api",
    icon: CodeBracketIcon,
    current: route.path === "/api",
  },
  */
]);

const explorerItems = computed(() => [
  {
    name: "Names",
    href: "/name",
    icon: TagIcon,
    current: route.path.startsWith("/name"),
  },
  {
    name: "Blocks",
    href: "/blocks",
    icon: CubeIcon,
    current: route.path.startsWith("/blocks"),
  },
  {
    name: "Transactions",
    href: "/txs",
    icon: FolderIcon,
    current: route.path.startsWith("/txs"),
  },
  {
    name: "Crontasks",
    href: "/tasks",
    icon: ClockIcon,
    current: route.path.startsWith("/tasks"),
  },
  {
    name: "Validators",
    href: "/validators",
    icon: UserGroupIcon,
    current: route.path.startsWith("/validators"),
  },
]);

function truncateAddress(addr) {
  if (!addr) return "";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}
</script>
