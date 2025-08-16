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
              <span
                :class="[
                  'font-mono',
                  isNonMainnet ? 'text-error' : 'text-base-content/80',
                ]"
                >{{ chainIdDisplay || chainId || "…" }}</span
              >
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
            <div
              class="flex items-center justify-between gap-2"
              v-if="nodeVersion || nodeCommit"
            >
              <span class="truncate">Node:</span>
              <span class="font-mono text-base-content/80">
                <span v-if="nodeVersion">
                  <a
                    :href="nodeBranchUrl"
                    target="_blank"
                    rel="noreferrer"
                    class="hover:text-primary"
                  >
                    {{ nodeVersion }}
                  </a>
                </span>
                <span v-if="nodeCommit">
                  -
                  <a
                    :href="nodeCommitUrl"
                    target="_blank"
                    rel="noreferrer"
                    class="hover:text-primary"
                  >
                    {{ nodeCommit }}
                  </a>
                </span>
              </span>
            </div>
            <div
              class="flex items-center justify-between gap-2"
              v-if="gitShortCommit || gitBranch"
            >
              <span class="truncate">Dashboard:</span>
              <span class="font-mono text-base-content/80">
                <span v-if="gitBranch">
                  <a
                    :href="dashboardBranchUrl"
                    target="_blank"
                    rel="noreferrer"
                    class="hover:text-primary"
                  >
                    {{ gitBranch }}
                  </a>
                </span>
                <span v-if="gitShortCommit">
                  -
                  <a
                    :href="dashboardCommitUrl"
                    target="_blank"
                    rel="noreferrer"
                    class="hover:text-primary"
                  >
                    {{ gitShortCommit }}
                  </a>
                </span>
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
            <li>
              <a
                href="/swagger/"
                class="text-base-content hover:bg-base-200 hover:text-primary group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold"
              >
                <DocumentTextIcon
                  class="text-base-content/60 group-hover:text-primary size-6 shrink-0"
                  aria-hidden="true"
                />
                <span class="truncate">Swagger</span>
              </a>
            </li>
            <li>
              <a
                href="/proto-json-schema/"
                class="text-base-content hover:bg-base-200 hover:text-primary group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold"
              >
                <CodeBracketIcon
                  class="text-base-content/60 group-hover:text-primary size-6 shrink-0"
                  aria-hidden="true"
                />
                <span class="truncate">Proto JSON Schema</span>
              </a>
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

// Node info
const nodeVersion = ref("");
const nodeCommit = ref("");

const isNonMainnet = computed(() => {
  const id = String(
    chainIdDisplay.value || (chainId && chainId.value) || ""
  ).toLowerCase();
  if (!id) return false;
  return !id.includes("mainnet");
});

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
const pollDelayMs = ref(1000);

async function fetchLatestBlock() {
  const url = `${restUrl.value}/cosmos/base/tendermint/v1beta1/blocks/latest`;
  const resp = await fetch(url);
  const json = await resp.json();
  const header = json?.block?.header || json?.sdk_block?.header;
  if (!header) return;
  const newHeight = Number(header.height);
  const prevHeight = latestHeight.value;
  chainIdDisplay.value = String(header.chain_id || "");
  latestHeight.value = newHeight;
  latestTimeIso.value = String(header.time || "");

  if (prevHeight == null) return;

  const delta = newHeight - prevHeight;
  if (delta <= 0) {
    pollDelayMs.value = Math.round(pollDelayMs.value * 1.05);
  } else {
    pollDelayMs.value = Math.round(pollDelayMs.value * 0.95);
  }
}

function scheduleNextPoll() {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    await fetchLatestBlock();
    scheduleNextPoll();
  }, pollDelayMs.value);
}

async function fetchNodeInfo() {
  const url = `${restUrl.value}/cosmos/base/tendermint/v1beta1/node_info`;
  const resp = await fetch(url);
  const json = await resp.json();
  const app = json?.application_version;
  nodeVersion.value = String(
    app?.version || json?.default_node_info?.version || ""
  );
  nodeCommit.value = String(app?.git_commit || "");
}

onMounted(() => {
  fetchLatestBlock();
  fetchNodeInfo();
  tickTimer = setInterval(() => (nowMs.value = Date.now()), 1000);
  scheduleNextPoll();
});

onBeforeUnmount(() => {
  if (tickTimer) clearInterval(tickTimer);
  if (pollTimer) clearTimeout(pollTimer);
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

// Build metadata
const gitShortCommit =
  typeof __GIT_COMMIT__ !== "undefined" && __GIT_COMMIT__ ? __GIT_COMMIT__ : "";
const gitBranch =
  typeof __GIT_BRANCH__ !== "undefined" && __GIT_BRANCH__ ? __GIT_BRANCH__ : "";

// Repo URLs
const dashboardRepo =
  "https://github.com/dysonprotocol/dysonprotocol2-dashboard";
const nodeRepo = "https://github.com/dysonprotocol/dysonprotocol2";
const dashboardCommitUrl = computed(() =>
  gitShortCommit ? `${dashboardRepo}/commit/${gitShortCommit}` : "#"
);
const dashboardBranchUrl = computed(() =>
  gitBranch ? `${dashboardRepo}/tree/${gitBranch}` : "#"
);
const nodeCommitUrl = computed(() =>
  nodeCommit.value ? `${nodeRepo}/commit/${nodeCommit.value}` : "#"
);
const nodeBranchUrl = computed(() =>
  nodeVersion.value ? `${nodeRepo}/tree/${nodeVersion.value}` : "#"
);
</script>
