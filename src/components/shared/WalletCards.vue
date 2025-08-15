<template>
  <div class="space-y-2">
    <!-- Keplr as collapse -->
    <div class="space-y-2">
      <div
        class="collapse bg-base-100 border-base-300 border"
        v-if="hasKeplrWallet"
        :class="{
          'border-primary': addressCurrentAddress === keplrWallet?.address,
        }"
      >
        <input type="checkbox" />
        <div class="collapse-title font-medium">
          <div class="flex items-center gap-2">
            <img :src="keplrLogo" alt="Keplr" class="w-5 h-5" />
            <div class="text-base text-base-content">
              {{ keplrWallet?.name }}
            </div>
          </div>
        </div>
        <div class="collapse-content text-sm">
          <div class="text-xs text-base-content/80 mb-2">
            <AddressDisplay :address="keplrWallet?.address" :truncate="7" />
          </div>
          <div class="flex items-center gap-2 my-3">
            <button
              @click.stop="disconnectKeplr"
              class="btn btn-outline btn-xs"
              :disabled="keplrLoading"
            >
              <span
                v-if="keplrLoading"
                class="loading loading-spinner loading-xs mr-1"
              ></span>
              Disconnect
            </button>
          </div>

          <router-link
            v-for="tab in addressTabs"
            :key="tab.path"
            :to="`/address/${keplrWallet?.address}/${tab.path}`"
            class="btn btn-xs text-sm mr-1 mt-1"
            :class="{
              'text-primary font-medium':
                addressCurrentTab === tab.path &&
                addressCurrentAddress === keplrWallet?.address,
            }"
          >
            {{ tab.name }}
          </router-link>
        </div>
      </div>
      <div class="collapse bg-base-100 border-base-300 border" v-else>
        <input type="checkbox" />
        <div class="collapse-title font-medium">
          <div class="flex items-center gap-2">
            <img :src="keplrLogo" alt="Keplr" class="w-5 h-5" />
            <div class="text-base text-base-content">Keplr Wallet!</div>
          </div>
        </div>
        <div class="collapse-content text-sm">
          <div class="flex items-center gap-2 mt-1">
            <a
              v-if="!isKeplrAvailable"
              href="https://www.keplr.app/get"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Get Keplr"
              class="inline-flex btn"
              >Get Keplr
              <ArrowTopRightOnSquareIcon class="w-4 h-4 text-primary" />
            </a>
          </div>
          <div class="flex items-center gap-2 mt-3">
            <button
              class="btn btn-outline btn-xs"
              :disabled="keplrLoading"
              @click.stop="connectKeplr"
            >
              <span
                v-if="keplrLoading"
                class="loading loading-spinner loading-xs mr-1"
              ></span>
              Connect
            </button>
            <div v-if="keplrError" class="text-error text-xs">
              {{ keplrError }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CosmJS wallets as collapses -->
    <div
      v-for="wallet in localCosmJsWallets"
      :key="wallet.name"
      class="collapse bg-base-100 border-base-300 border collapse-arrow"
      :class="{
        'border-primary':
          addressCurrentAddress === wallet.address && isWalletUnlocked(wallet),
        'border-warning':
          addressCurrentAddress === wallet.address && !isWalletUnlocked(wallet),
      }"
    >
      <input type="checkbox" v-model="openWalletCollapse[wallet.name]" />
      <div class="collapse-title font-medium">
        <div class="text-base">
          {{ wallet.name }}
        </div>
      </div>
      <div class="collapse-content text-sm">
        <div class="text-xs text-base-content/80 mb-2">
          <AddressDisplay :address="wallet.address" :truncate="7" />
        </div>

        <div class="flex items-center gap-2 mt-3">
          <button
            v-if="isWalletUnlocked(wallet)"
            class="btn btn-outline btn-xs"
            @click="lockWallet(wallet.name)"
          >
            Lock
          </button>

          <div v-else class="flex flex-col gap-1">
            <div class="flex items-center gap-1">
              <input
                v-model="unlockPassword[wallet.name]"
                type="password"
                placeholder="Password"
                class="input input-xs w-20 text-xs"
                :class="{
                  'input-error': unlockErrors[wallet.name],
                  'input-disabled': unlockLoading[wallet.name],
                }"
                :disabled="unlockLoading[wallet.name]"
              />
              <button
                class="btn btn-primary btn-xs"
                :disabled="unlockLoading[wallet.name]"
                @click="doUnlock(wallet.name)"
              >
                <span
                  v-if="unlockLoading[wallet.name]"
                  class="loading loading-spinner loading-xs m-1"
                ></span>
                Unlock
              </button>
            </div>
            <div v-if="unlockErrors[wallet.name]" class="text-xs text-error">
              {{ unlockErrors[wallet.name] }}
            </div>
          </div>
          <button
            class="btn btn-ghost btn-xs text-error"
            @click="handleRemoveWallet(wallet.name)"
            aria-label="Remove wallet"
            title="Remove wallet"
          >
            X
          </button>
        </div>
        <div class="mt-4">
          <router-link
            v-for="tab in addressTabs"
            :key="tab.path"
            :to="`/address/${wallet.address}/${tab.path}`"
            class="btn btn-xs text-sm mr-1 mt-1"
            :class="{
              'text-primary font-medium':
                addressCurrentTab === tab.path &&
                addressCurrentAddress === wallet.address,
            }"
          >
            {{ tab.name }}
          </router-link>
        </div>
      </div>
    </div>

    <!-- Import wallet (collapse) moved below wallets; styled same as others -->
    <div class="collapse bg-base-100 border-base-300 border">
      <input type="checkbox" v-model="isImportOpen" />
      <div class="collapse-title font-medium">Import CosmJS wallet</div>
      <div class="collapse-content text-sm">
        <input
          v-model="newWalletName"
          placeholder="Wallet name"
          class="input input-xs w-full"
        />
        <textarea
          v-model="mnemonic"
          placeholder="Enter recovery phrase..."
          class="textarea textarea-xs w-full resize-none"
          rows="2"
        ></textarea>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            @click="generateSeed(12)"
          >
            12W
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            @click="generateSeed(24)"
          >
            24W
          </button>
        </div>
        <label class="flex items-start gap-2 text-xs">
          <input
            v-model="seedBackedUp"
            type="checkbox"
            class="checkbox checkbox-xs mt-0.5"
          />
          <span class="opacity-80">I've backed up my recovery phrase</span>
        </label>
        <input
          v-model="newWalletPassword"
          type="password"
          placeholder="Password"
          class="input input-xs w-full"
          :disabled="!seedBackedUp"
        />
        <div v-if="importError" class="text-error text-xs">
          {{ importError }}
        </div>
        <button
          class="btn btn-primary btn-xs w-full"
          :disabled="!canImport || importLoading"
          @click="handleImport"
        >
          <span
            v-if="importLoading"
            class="loading loading-spinner loading-xs mr-1"
          ></span>
          Import Wallet
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, inject } from "vue";
import { useWallet } from "@/composables/useWallet";
import AddressDisplay from "@/components/AddressDisplay.vue";
import keplrLogo from "@/assets/images/keplr-logo-256.png";
import { ArrowTopRightOnSquareIcon } from "@heroicons/vue/24/outline";
import { ChevronDownIcon } from "@heroicons/vue/24/outline";

const {
  unlockedWallets,
  localCosmJsWallets,
  lockWallet,
  unlockWallet,
  removeNamedCosmJsWallet,
  connectExtension,
  generateMnemonic,
  importNamedCosmJsWallet,
  connectNamedCosmJsWallet,
} = useWallet();

const hasKeplrWallet = computed(() =>
  unlockedWallets.value.some((w) => w.type === "keplr")
);
const keplrWallet = computed(() =>
  unlockedWallets.value.find((w) => w.type === "keplr")
);

import { ref, watch, onMounted } from "vue";
const keplrLoading = ref(false);
const keplrError = ref("");
const isKeplrAvailable = ref(false);

onMounted(() => {
  isKeplrAvailable.value = typeof window !== "undefined" && !!window.keplr;
});

// Inject address tabs data from root
const addressTabs = inject("addressTabs", []);
const addressCurrentTab = inject("addressCurrentTab", "");
const addressCurrentAddress = inject("addressCurrentAddress", "");

function disconnectKeplr() {
  const w = keplrWallet.value;
  if (!w) return;
  keplrError.value = "";
  keplrLoading.value = true;
  Promise.resolve(lockWallet(w.name))
    .catch((e) => {
      keplrError.value = e?.message || "Failed to disconnect";
    })
    .finally(() => {
      keplrLoading.value = false;
    });
}

function connectKeplr() {
  keplrError.value = "";
  keplrLoading.value = true;
  Promise.resolve(connectExtension("keplr"))
    .catch((e) => {
      keplrError.value = e?.message || "Failed to connect to Keplr";
    })
    .finally(() => {
      keplrLoading.value = false;
    });
}

const unlockPassword = reactive({});
const unlockErrors = reactive({});
const unlockLoading = reactive({});
const openWalletCollapse = reactive({});

function isWalletUnlocked(wallet) {
  return unlockedWallets.value.some((w) => w.address === wallet.address);
}

async function doUnlock(name) {
  unlockErrors[name] = "";
  unlockLoading[name] = true;
  try {
    await unlockWallet(name, unlockPassword[name] || "");
    unlockPassword[name] = "";
  } catch (e) {
    unlockErrors[name] = e?.message || "Invalid password";
  } finally {
    unlockLoading[name] = false;
  }
}

function handleRemoveWallet(walletName) {
  const confirmed = confirm(
    `Are you sure you want to remove wallet "${walletName}"?\n\nThis action cannot be undone.`
  );
  if (confirmed) removeNamedCosmJsWallet(walletName);
}

// Import wallet (moved from SidebarMenu)
const newWalletName = ref("");
const mnemonic = ref("");
const seedBackedUp = ref(false);
const newWalletPassword = ref("");
const importLoading = ref(false);
const importError = ref("");
const isImportOpen = ref(false);

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
    const name = newWalletName.value.trim();
    await importNamedCosmJsWallet(
      name,
      mnemonic.value.trim(),
      newWalletPassword.value
    );
    await connectNamedCosmJsWallet(name, newWalletPassword.value);
    isImportOpen.value = false;
    openWalletCollapse[name] = true;
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

// Reset rules for import card interactions
watch([newWalletName, mnemonic], () => {
  if (newWalletPassword.value || seedBackedUp.value) {
    newWalletPassword.value = "";
    seedBackedUp.value = false;
  }
  if (importError.value) importError.value = "";
});

watch(isImportOpen, () => {
  newWalletPassword.value = "";
  seedBackedUp.value = false;
  if (importError.value) importError.value = "";
});
</script>
