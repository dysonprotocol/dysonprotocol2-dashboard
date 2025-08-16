<template>
  <div>
    <TransitionRoot as="template" :show="sidebarOpen">
      <Dialog class="relative z-50 lg:hidden" @close="sidebarOpen = false">
        <TransitionChild
          as="template"
          enter="transition-opacity ease-linear duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-base-content/80" />
        </TransitionChild>

        <div class="fixed inset-0 flex">
          <TransitionChild
            as="template"
            enter="transition ease-in-out duration-300 transform"
            enter-from="-translate-x-full"
            enter-to="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leave-from="translate-x-0"
            leave-to="-translate-x-full"
          >
            <DialogPanel class="relative mr-16 flex w-full max-w-xs flex-1">
              <TransitionChild
                as="template"
                enter="ease-in-out duration-300"
                enter-from="opacity-0"
                enter-to="opacity-100"
                leave="ease-in-out duration-300"
                leave-from="opacity-100"
                leave-to="opacity-0"
              >
                <div
                  class="absolute top-0 left-full flex w-16 justify-center pt-5"
                >
                  <button
                    type="button"
                    class="-m-2.5 p-2.5"
                    @click="sidebarOpen = false"
                  >
                    <span class="sr-only">Close sidebar</span>
                    <XMarkIcon class="size-6 text-white" aria-hidden="true" />
                  </button>
                </div>
              </TransitionChild>

              <SidebarMenu />
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Static sidebar for desktop -->
    <div
      class="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col"
    >
      <SidebarMenu />
    </div>

    <div class="lg:pl-72">
      <div
        class="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-base-300 bg-base-100 px-4 sm:gap-x-6 sm:px-6 lg:px-8"
      >
        <button
          type="button"
          class="-m-2.5 p-2.5 text-base-content lg:hidden"
          @click="sidebarOpen = true"
        >
          <span class="sr-only">Open sidebar</span>
          <Bars3Icon class="size-6" aria-hidden="true" />
        </button>

        <!-- Separator -->
        <div class="h-6 w-px bg-base-300 lg:hidden" aria-hidden="true" />
        <router-link
          to="/"
          aria-label="Dyson Protocol"
          class="text-base-content lg:hidden flex items-center gap-2"
        >
          <img :src="logoSrc" alt="Dyson Protocol" class="h-6 w-auto" />
          <span>DysonProtocol</span>
        </router-link>
        <!-- Separator -->
        <div class="h-6 w-px bg-base-300 lg:hidden" aria-hidden="true" />

        <div class="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          <form class="grid flex-1 grid-cols-1" @submit.prevent>
            <input
              type="search"
              name="search"
              aria-label="Search"
              class="col-start-1 row-start-1 block size-full bg-base-100 pl-8 text-base text-base-content outline-hidden placeholder:text-base-content/60 sm:text-sm/6"
              placeholder="Search addresses, tx hashes… (⌘/Ctrl+K)"
              readonly
              @focus="openCommandPalette"
              @click="openCommandPalette"
            />
            <MagnifyingGlassIcon
              class="col-start-1 row-start-1 size-5 self-center text-base-content/60 cursor-pointer"
              aria-hidden="true"
              @click="openCommandPalette"
            />
          </form>
          <div class="flex items-center gap-x-4 lg:gap-x-6">
            <ThemeSwitcher />
          </div>
        </div>
      </div>

      <main class="">
        <router-view />
      </main>
    </div>

    <!-- Command Palette Modal -->
    <TransitionRoot as="template" :show="isCmdOpen">
      <Dialog class="relative z-[60]" @close="isCmdOpen = false">
        <TransitionChild
          as="template"
          enter="transition-opacity ease-linear duration-150"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="transition-opacity ease-linear duration-150"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-base-content/60" />
        </TransitionChild>

        <div
          class="fixed inset-0 z-[61] p-4 sm:p-6 lg:p-8 flex items-start justify-center"
        >
          <TransitionChild
            as="template"
            enter="transition ease-out duration-150 transform"
            enter-from="opacity-0 translate-y-2"
            enter-to="opacity-100 translate-y-0"
            leave="transition ease-in duration-100 transform"
            leave-from="opacity-100 translate-y-0"
            leave-to="opacity-0 translate-y-2"
          >
            <DialogPanel
              class="w-full max-w-2xl rounded-xl border border-base-300 bg-base-100 shadow-xl"
            >
              <el-command-palette ref="commandEl">
                <input
                  autofocus
                  :value="commandQuery"
                  @input="commandQuery = $event.target.value"
                  placeholder="Search addresses or tx hashes…"
                  class="w-full rounded-t-xl bg-transparent px-4 py-3 text-base focus:outline-none"
                />

                <el-command-list>
                  <!-- Transaction hash exact match -->
                  <template v-if="isTxHash(commandQuery)">
                    <a
                      :href="`/txs/${commandQuery}`"
                      @click="isCmdOpen = false"
                      class="block px-4 py-2"
                    >
                      Go to transaction
                      <TxHashDisplay :hash="commandQuery" :truncate="8" />
                    </a>
                  </template>

                  <!-- Address deep links -->
                  <template v-else-if="isDysAddress(commandQuery)">
                    <el-command-group aria-labelledby="address-links">
                      <div
                        id="address-links"
                        class="px-4 pt-2 pb-1 text-xs uppercase opacity-70"
                      >
                        Address
                      </div>
                      <a
                        :href="`/address/${commandQuery}/script`"
                        @click="isCmdOpen = false"
                        class="block px-4 py-2"
                        >Script</a
                      >
                      <a
                        :href="`/address/${commandQuery}/names`"
                        @click="isCmdOpen = false"
                        class="block px-4 py-2"
                        >Names</a
                      >
                      <a
                        :href="`/address/${commandQuery}/coins`"
                        @click="isCmdOpen = false"
                        class="block px-4 py-2"
                        >Coins</a
                      >
                      <a
                        :href="`/address/${commandQuery}/nfts`"
                        @click="isCmdOpen = false"
                        class="block px-4 py-2"
                        >NFTs</a
                      >
                      <a
                        :href="`/address/${commandQuery}/storage`"
                        @click="isCmdOpen = false"
                        class="block px-4 py-2"
                        >Storage</a
                      >
                      <a
                        :href="`/address/${commandQuery}/tasks`"
                        @click="isCmdOpen = false"
                        class="block px-4 py-2"
                        >Tasks</a
                      >
                      <a
                        :href="`/address/${commandQuery}/staking`"
                        @click="isCmdOpen = false"
                        class="block px-4 py-2"
                        >Staking</a
                      >
                    </el-command-group>

                    <el-command-group aria-labelledby="tx-links">
                      <div
                        id="tx-links"
                        class="px-4 pt-3 pb-1 text-xs uppercase opacity-70"
                      >
                        Transaction queries
                      </div>
                      <a
                        :href="`/txs?query=${encodeURIComponent(
                          `message.sender='${commandQuery}'`
                        )}&page=1`"
                        @click="isCmdOpen = false"
                        class="block px-4 py-2"
                        >All Transactions</a
                      >
                      <a
                        :href="`/txs?query=${encodeURIComponent(
                          `message.action='/cosmos.bank.v1beta1.MsgSend' AND coin_received.spender='${commandQuery}'`
                        )}&page=1`"
                        @click="isCmdOpen = false"
                        class="block px-4 py-2"
                        >Coins sent</a
                      >
                      <a
                        :href="`/txs?query=${encodeURIComponent(
                          `message.action='/cosmos.bank.v1beta1.MsgSend' AND coin_received.receiver='${commandQuery}'`
                        )}&page=1`"
                        @click="isCmdOpen = false"
                        class="block px-4 py-2"
                        >Coins recieved</a
                      >
                      <a
                        :href="`/txs?query=${encodeURIComponent(
                          `message.action='/dysonprotocol.script.v1.MsgExec' AND message.sender='${commandQuery}'`
                        )}&page=1`"
                        @click="isCmdOpen = false"
                        class="block px-4 py-2"
                        >Function calls to other scripts (MsgExec)</a
                      >
                    </el-command-group>
                  </template>

                  <!-- Name / Class / Denom / NFT quick links -->
                  <template v-else-if="isNameLike(commandQuery)">
                    <el-command-group
                      v-if="nameFound"
                      aria-labelledby="name-links"
                    >
                      <div
                        id="name-links"
                        class="px-4 pt-2 pb-1 text-xs uppercase opacity-70"
                      >
                        Name
                      </div>
                      <a
                        :href="`/names/${encodeURIComponent(parsedName.root)}`"
                        @click="isCmdOpen = false"
                        class="block px-4 py-2"
                      >
                        Go to name: {{ parsedName.root }}
                      </a>
                    </el-command-group>

                    <el-command-group aria-labelledby="class-links">
                      <div
                        id="class-links"
                        class="px-4 pt-3 pb-1 text-xs uppercase opacity-70"
                      >
                        NFT Classes
                      </div>

                      <a
                        v-if="classFound"
                        :href="`/names/${encodeURIComponent(
                          parsedName.root
                        )}/nfts/${encodeURIComponent(parsedName.main)}`"
                        @click="isCmdOpen = false"
                        class="block px-4 py-2"
                      >
                        Go to NFTClass: {{ parsedName.main }}
                      </a>
                    </el-command-group>

                    <el-command-group
                      v-if="denomFound"
                      aria-labelledby="denom-links"
                    >
                      <div
                        id="denom-links"
                        class="px-4 pt-3 pb-1 text-xs uppercase opacity-70"
                      >
                        Denoms
                      </div>
                      <a
                        :href="`/names/${encodeURIComponent(
                          parsedName.root
                        )}/denoms/${encodeURIComponent(parsedName.main)}`"
                        @click="isCmdOpen = false"
                        class="block px-4 py-2"
                      >
                        Go to denom: {{ parsedName.main }}
                      </a>
                    </el-command-group>

                    <el-command-group
                      v-if="nftFound"
                      aria-labelledby="nft-links"
                    >
                      <div
                        id="nft-links"
                        class="px-4 pt-3 pb-1 text-xs uppercase opacity-70"
                      >
                        NFTs
                      </div>
                      <a
                        :href="`/names/${encodeURIComponent(
                          parsedName.root
                        )}/nfts/${encodeURIComponent(
                          nftFound.classId
                        )}/${encodeURIComponent(nftFound.id)}`"
                        @click="isCmdOpen = false"
                        class="block px-4 py-2"
                      >
                        Go to NFTClass: {{ nftFound.classId }} NFT:
                        {{ nftFound.id }}
                      </a>
                    </el-command-group>
                  </template>

                  <!-- Defaults when empty -->
                  <el-defaults v-else>
                    <div class="px-4 py-3 text-sm opacity-70">
                      Type a transaction hash or an address starting with dys2…
                    </div>
                  </el-defaults>
                </el-command-list>

                <el-no-results
                  v-if="
                    commandQuery &&
                    isNameLike(commandQuery) &&
                    !hasAnyNameResults
                  "
                >
                  <div class="px-4 py-3 text-sm">
                    No matching name, classes, denoms, or NFTs.
                  </div>
                </el-no-results>
              </el-command-palette>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Global Transaction Modal Override -->
    <GlobalTransactionModal />
  </div>
</template>

<script setup>
import { ref, computed, provide, onMounted, onBeforeUnmount, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useWallet } from "@/composables/useWallet";
import TxHashDisplay from "@/components/TxHashDisplay.vue";
import { useStorage } from "@vueuse/core";

// Global chain configuration (persist and prefer stored restUrl)
const customRestUrlStorage = useStorage("customRestUrlStorage", "");

const resolveRestUrl = () =>
  customRestUrlStorage.value ||
  (typeof window !== "undefined" ? window.location.origin : "");

const CHAIN_INFO = {
  restUrl: resolveRestUrl(),
  bech32Prefix: "dys2",
  setRestUrl: (url) => {
    customRestUrlStorage.value = url;
    CHAIN_INFO.restUrl = resolveRestUrl();
  },
};

watch(
  () => customRestUrlStorage.value,
  () => {
    CHAIN_INFO.restUrl = resolveRestUrl();
  }
);

// Expose setter globally for runtime overrides
if (typeof window !== "undefined") {
  window.setCustomRestUrl = CHAIN_INFO.setRestUrl;
  window.resolveRestUrl = resolveRestUrl;
}

// Provide chain info to all child components
provide("chainInfo", CHAIN_INFO);
import {
  Dialog,
  DialogPanel,
  TransitionChild,
  TransitionRoot,
} from "@headlessui/vue";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/vue";
import { Bars3Icon, BellIcon, XMarkIcon } from "@heroicons/vue/24/outline";
import {
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
} from "@heroicons/vue/20/solid";
import WalletButton from "@/components/shared/WalletButton.vue";
import ThemeSwitcher from "./components/ThemeSwitcher.vue";
import GlobalTransactionModal from "@/components/shared/GlobalTransactionModal.vue";
import SidebarMenu from "@/components/shared/SidebarMenu.vue";
// duplicate import removed
import { useTheme } from "@/composables/useTheme";
import logoDark from "@/assets/images/dys.svg";
import logoLight from "@/assets/images/dys-inverted.svg";

const router = useRouter();
const route = useRoute();
const {
  unlockedWallets,
  lockWallet,
  generateMnemonic,
  importNamedCosmJsWallet,
  connectNamedCosmJsWallet,
  connectExtension,
  init,
  cleanup,
} = useWallet();

// Theme-aware logo for mobile header
const { theme } = useTheme();
const logoSrc = computed(() => (theme.value === "dark" ? logoLight : logoDark));

const truncateAddress = (addr) => {
  if (!addr) return "";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
};

// Import form state
const newWalletName = ref("");
const mnemonic = ref("");
const seedBackedUp = ref(false);
const newWalletPassword = ref("");
const importLoading = ref(false);
const importError = ref("");

const canImport = computed(
  () =>
    newWalletName.value.trim() &&
    mnemonic.value.trim() &&
    seedBackedUp.value &&
    newWalletPassword.value.trim()
);

const handleImport = async () => {
  importError.value = "";
  if (!canImport.value) return;
  importLoading.value = true;
  try {
    await importNamedCosmJsWallet(
      newWalletName.value.trim(),
      mnemonic.value.trim(),
      newWalletPassword.value
    );
    await connectNamedCosmJsWallet(
      newWalletName.value.trim(),
      newWalletPassword.value
    );
    newWalletName.value = "";
    mnemonic.value = "";
    seedBackedUp.value = false;
    newWalletPassword.value = "";
  } catch (e) {
    importError.value = e?.message || "Failed to import wallet";
  } finally {
    importLoading.value = false;
  }
};

const generateSeed = async (wordCount) => {
  importLoading.value = true;
  try {
    mnemonic.value = await generateMnemonic(wordCount);
  } finally {
    importLoading.value = false;
  }
};

// Keplr connect/disconnect state & actions
const keplrLoading = ref(false);
const keplrError = ref("");
const hasKeplrWallet = computed(() =>
  unlockedWallets.value.some((w) => w.type === "keplr")
);
const keplrWallet = computed(() =>
  unlockedWallets.value.find((w) => w.type === "keplr")
);
const handleKeplr = async () => {
  keplrError.value = "";
  keplrLoading.value = true;
  try {
    if (hasKeplrWallet.value) {
      const w = keplrWallet.value;
      if (w) await lockWallet(w.name);
    } else {
      await connectExtension("keplr");
    }
  } catch (e) {
    keplrError.value = e?.message || "Failed to connect to Keplr";
  } finally {
    keplrLoading.value = false;
  }
};

// Removed unused navigation/explorer items; sidebar owns its nav

const sidebarOpen = ref(false);

// Command palette state
const isCmdOpen = ref(false);
const commandQuery = ref("");
const commandEl = ref();

function openCommandPalette() {
  isCmdOpen.value = true;
}

function isTxHash(value) {
  if (!value) return false;
  return /^[A-Fa-f0-9]{64}$/.test(value.trim());
}

function isDysAddress(value) {
  if (!value) return false;
  return value.trim().startsWith("dys2");
}

// Name/class/denom/NFT helpers for command palette
function isNameLike(value) {
  if (!value) return false;
  const v = String(value).trim();
  if (!v.includes(".")) return false;
  return /^[A-Za-z0-9./\s-]+$/.test(v);
}

const parsedName = computed(() => {
  const q = String(commandQuery.value || "").trim();
  if (!isNameLike(q)) return { root: "", main: "", classId: "", tokenId: "" };
  const tokens = q.split(/\s+/);
  const main = String(tokens[0] || "");
  const segs = main.split("/");
  const root = String(segs[0] || "");
  let classId = segs.length >= 2 ? `${segs[0]}/${segs[1]}` : root;
  let tokenId =
    segs.length >= 3 ? segs.slice(2).join("/") : String(tokens[1] || "");
  return { root, main, classId, tokenId };
});

const classFound = ref(false);
const denomFound = ref(false);
const nftFound = ref(null);
const nameFound = ref(false);
let searchSeq = 0;

watch(
  () => commandQuery.value,
  async () => {
    classFound.value = false;
    denomFound.value = false;
    nftFound.value = null;
    nameFound.value = false;
    if (!isNameLike(commandQuery.value)) return;
    const { root, main, classId, tokenId } = parsedName.value || {};
    if (!root) return;
    const seq = ++searchSeq;
    const rest = CHAIN_INFO.restUrl;
    try {
      // Check name existence
      const pName = fetch(
        `${rest}/dysonprotocol/nameservice/v1/resolve_name/${encodeURIComponent(
          root
        )}`
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => Boolean(j && j.address));

      // Check class existence
      const classUrl = `${rest}/dysonprotocol/nft/v1beta1/class?class_id=${encodeURIComponent(
        classId
      )}`;
      const pClass = fetch(classUrl)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => Boolean(j && j.class));

      // Check denom existence (only when path-like)
      const pDenoms = main.includes("/")
        ? fetch(
            `${rest}/dysonprotocol/nameservice/v1/denoms_by_name/${encodeURIComponent(
              root
            )}`
          )
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
              const list = Array.isArray(j?.denoms) ? j.denoms : [];
              const strList = list.map((it) =>
                typeof it === "string" ? it : String(it?.denom || "")
              );
              return strList.includes(main);
            })
        : Promise.resolve(false);

      // Check NFT existence (when tokenId provided)
      const pNft = tokenId
        ? fetch(
            `${rest}/dysonprotocol/nft/v1beta1/nft?class_id=${encodeURIComponent(
              main.includes("/") ? `${root}/${main.split("/")[1]}` : root
            )}&id=${encodeURIComponent(tokenId)}`
          )
            .then((r) => (r.ok ? r.json() : null))
            .then((j) =>
              j?.nft
                ? {
                    classId: main.includes("/")
                      ? `${root}/${main.split("/")[1]}`
                      : root,
                    id: tokenId,
                  }
                : null
            )
        : Promise.resolve(null);
      const [hasName, hasClass, hasDenom, nftObj] = await Promise.all([
        pName,
        pClass,
        pDenoms,
        pNft,
      ]);
      if (seq !== searchSeq) return; // stale
      nameFound.value = Boolean(hasName);
      classFound.value = Boolean(hasClass);
      denomFound.value = Boolean(hasDenom);
      nftFound.value = nftObj;
    } catch {}
  }
);

const hasAnyNameResults = computed(
  () =>
    nameFound.value ||
    classFound.value ||
    denomFound.value ||
    Boolean(nftFound.value)
);

function shortHash(h) {
  if (!h) return "";
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

onMounted(() => {
  // Initialize wallet system (sets up Keplr keystore change listener)
  init();
  const onElementsReady = () => {
    if (
      commandEl.value &&
      typeof commandEl.value.setFilterCallback === "function"
    ) {
      // Disable built-in filtering; we render only the options we want
      commandEl.value.setFilterCallback(() => true);
    }
  };

  if (customElements.get("el-command-palette")) onElementsReady();
  else window.addEventListener("elements:ready", onElementsReady);

  const onKeydown = (e) => {
    const isMod = e.ctrlKey || e.metaKey;
    if (isMod && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      isCmdOpen.value = true;
    }
  };
  window.addEventListener("keydown", onKeydown);

  onBeforeUnmount(() => {
    window.removeEventListener("keydown", onKeydown);
    window.removeEventListener("elements:ready", onElementsReady);
  });
});

onBeforeUnmount(() => {
  // Remove global wallet listeners
  cleanup();
});

// Address tabs logic (moved from AddressNavigation)
const addressTabs = [
  { name: "Coins", path: "coins" },
  { name: "NFTs", path: "nfts" },
  { name: "Staking", path: "staking" },
  { name: "Names", path: "names" },
  { name: "Script", path: "script" },
  { name: "Storage", path: "storage" },
  { name: "Tasks", path: "tasks" },
];
const addressCurrentTab = computed(() => route.path.split("/")[3] || "");
const addressCurrentAddress = computed(() => route.path.split("/")[2] || "");
provide("addressTabs", addressTabs);
provide("addressCurrentTab", addressCurrentTab);
provide("addressCurrentAddress", addressCurrentAddress);
</script>
