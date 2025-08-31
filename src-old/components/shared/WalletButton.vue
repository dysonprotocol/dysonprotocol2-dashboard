<template>
  <div>
    <!-- Connected State: Show wallet address with arrow -->
    <button
      v-if="unlockedWallets.length > 0"
      class="btn btn-sm"
      data-testid="wallet-button"
      @click="openDrawer"
    >
      <WalletIcon class="w-4 h-4" />
      {{ displayAddress }}
      <ChevronRightIcon class="w-4 h-4" />
    </button>

    <!-- Disconnected State: Show connect options -->
    <div
      v-else
      class="flex gap-2"
    >
      <button
        class="btn btn-sm btn-primary"
        data-testid="connect-wallet-button"
        @click="openDrawer"
      >
        <WalletIcon class="w-4 h-4" />
        Connect Wallet
      </button>
    </div>

    <!-- Wallet Drawer -->
    <WalletDrawer
      :open="drawerOpen"
      @close="closeDrawer"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useWallet } from "@/composables/useWallet";
import { WalletIcon, ChevronRightIcon } from "@heroicons/vue/24/outline";
import WalletDrawer from "./WalletDrawer.vue";

const { unlockedWallets, init } = useWallet();

// Drawer state
const drawerOpen = ref(false);

const displayAddress = computed(() => {
  const first = unlockedWallets.value[0];
  if (!first) return "";
  const type = first.type || "unknown";
  const name = first.name || "unnamed";
  const addr = first.address || "";
  const shortAddr =
    addr.length <= 13 ? addr : addr.slice(0, 10) + "..." + addr.slice(-5);
  return `${type} | ${name} | ${shortAddr}`;
});

const openDrawer = () => {
  drawerOpen.value = true;
};

const closeDrawer = () => {
  drawerOpen.value = false;
};

onMounted(init);
</script>
