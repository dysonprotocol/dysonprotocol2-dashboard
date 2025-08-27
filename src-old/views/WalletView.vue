<template>
  <div class="container mx-auto p-6">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold mb-4">Wallet Management</h1>
      <p class="text-gray-600 mb-8">
        Manage your wallets and send transactions.
      </p>

      <button
        @click="openDrawer"
        class="btn btn-primary btn-lg"
        data-testid="open-wallet-drawer"
      >
        <WalletIcon class="w-5 h-5 mr-2" />
        Open Wallet Manager
      </button>
    </div>

    <!-- Bank Send Demo Form -->
    <div class="max-w-md mx-auto">
      <div class="card bg-base-100 shadow-xl border border-base-300">
        <div class="card-body">
          <h2 class="card-title justify-center mb-4">
            <CurrencyDollarIcon class="w-5 h-5" />
            Bank Send Demo
          </h2>

          <form @submit.prevent="handleReviewTransaction" class="space-y-4">
            <!-- Wallet Selection -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">From Wallet</span>
              </label>
              <WalletSelector v-model="selectedSender" />
            </div>

            <!-- Recipient Address -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">To Address</span>
              </label>
              <input
                v-model="recipientAddress"
                type="text"
                placeholder="dys2..."
                class="input input-bordered w-full font-mono text-sm"
                data-testid="recipient-address"
                required
              />
            </div>

            <!-- Amount and Denomination -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Amount</span>
              </label>
              <div class="join w-full">
                <input
                  v-model="amount"
                  type="number"
                  min="0"
                  step="0.000001"
                  placeholder="0.0"
                  class="input input-bordered join-item"
                  data-testid="amount-input"
                  required
                />
                <select
                  v-model="denomination"
                  class="select select-bordered join-item flex-1"
                  data-testid="denomination-select"
                >
                  <option value="udys">udys</option>
                  <option value="dys">DYS</option>
                </select>
              </div>
            </div>

            <!-- Memo (Optional) -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Memo (Optional)</span>
              </label>
              <input
                v-model="memo"
                type="text"
                placeholder="Transaction memo..."
                class="input input-bordered w-full"
                data-testid="memo-input"
              />
            </div>

            <!-- Error Display -->
            <div
              v-if="formError"
              class="alert alert-error"
              data-testid="form-error"
            >
              <span>{{ formError }}</span>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              class="btn btn-primary w-full"
              data-testid="send-transaction"
              :disabled="!canSubmit"
            >
              <span
                v-if="loading"
                class="loading loading-spinner loading-sm"
              ></span>
              <span v-else>Send Transaction</span>
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Wallet Drawer -->
    <WalletDrawer :open="drawerOpen" @close="closeDrawer" />
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { WalletIcon, CurrencyDollarIcon } from "@heroicons/vue/24/outline";
import WalletDrawer from "@/components/shared/WalletDrawer.vue";
import { useWallet } from "@/composables/useWallet";
import { sendMsgs } from "@/utils/dysonTxUtils";
import WalletSelector from "@/components/shared/WalletSelector.vue";

// Composables
const { unlockedWallets, restUrl, localCosmJsWallets, chainId } = useWallet();

// Drawer state
const drawerOpen = ref(false);

// Form state
const selectedSender = ref("");
const recipientAddress = ref("");
const amount = ref("");
const denomination = ref("udys");
const memo = ref("");
const formError = ref("");
const loading = ref(false);

// Computed
const canSubmit = computed(() => {
  return (
    selectedSender.value !== "" &&
    recipientAddress.value.trim() &&
    amount.value &&
    parseFloat(amount.value) > 0 &&
    unlockedWallets.value.length > 0 &&
    !loading.value
  );
});

// Helper functions
const shortenAddress = (address) => {
  if (!address) return "";
  if (address.length <= 13) return address;
  return address.slice(0, 10) + "..." + address.slice(-5);
};

const convertAmount = (amount, fromDenom) => {
  const numAmount = parseFloat(amount);
  if (fromDenom === "dys") {
    // Convert DYS to udys (multiply by 10^6)
    return Math.floor(numAmount * 1000000).toString();
  }
  // Already in udys
  return Math.floor(numAmount).toString();
};

// Drawer methods
const openDrawer = () => {
  drawerOpen.value = true;
};

const closeDrawer = () => {
  drawerOpen.value = false;
};

// Form methods
const handleReviewTransaction = async () => {
  formError.value = "";
  loading.value = true;

  try {
    // Validate inputs
    if (!recipientAddress.value.trim()) {
      formError.value = "Recipient address is required";
      return;
    }

    if (!recipientAddress.value.startsWith("dys2")) {
      formError.value = "Invalid recipient address format";
      return;
    }

    if (!amount.value || parseFloat(amount.value) <= 0) {
      formError.value = "Amount must be greater than 0";
      return;
    }

    if (selectedWalletForTx.value === "") {
      formError.value = "Please select a wallet";
      return;
    }

    const selectedWallet = unlockedWallets.value.find(
      (w) => w.address === selectedSender.value
    );
    if (!selectedWallet) {
      formError.value = "Selected wallet is not unlocked";
      return;
    }

    if (selectedWallet.type === "cosmjs" && !selectedWallet._pass) {
      formError.value = "Wallet is not unlocked";
      return;
    }

    // Convert amount to base denomination (udys)
    const baseAmount = convertAmount(amount.value, denomination.value);

    // Build bank send message
    const bankSendMsg = {
      "@type": "/cosmos.bank.v1beta1.MsgSend",
      from_address: selectedWallet.address,
      to_address: recipientAddress.value.trim(),
      amount: [
        {
          denom: "udys",
          amount: baseAmount,
        },
      ],
    };

    let walletInstance;
    let walletType;

    if (selectedWallet.type === "keplr") {
      // Use Keplr wallet
      await window.keplr.enable(chainId.value);
      walletInstance = window.keplr.getOfflineSigner(chainId.value);
      walletType = "keplr";
    } else {
      // Create CosmJS wallet instance for signing
      const { DirectSecp256k1HdWallet, extractKdfConfiguration, executeKdf } =
        await import("@cosmjs/proto-signing");

      // Find wallet data
      const walletData = localCosmJsWallets.value.find(
        (w) => w.name === selectedWallet.name
      );
      if (!walletData) {
        formError.value = "Wallet data not found";
        return;
      }

      // Recreate wallet instance
      const kdfConf = extractKdfConfiguration(walletData.encrypted);
      const encryptionKey = await executeKdf(selectedWallet._pass, kdfConf);
      walletInstance =
        await DirectSecp256k1HdWallet.deserializeWithEncryptionKey(
          walletData.encrypted,
          encryptionKey
        );
      walletType = "cosmjs";
    }

    // Send transaction using dysonTxUtils (will trigger global modal)
    const result = await sendMsgs({
      apiUrl: restUrl.value,
      wallet: walletInstance,
      walletType: walletType,
      address: selectedWallet.address,
      msgs: [bankSendMsg],
      memo: memo.value.trim(),
      fee: { amount: [{ denom: "udys", amount: "0" }], gas_limit: "200000" },
      simulate: false,
    });

    if (result.success) {
      console.log("Transaction successful:", result);

      // Reset form on success
      selectedSender.value = "";
      recipientAddress.value = "";
      amount.value = "";
      memo.value = "";
      formError.value = "";
    } else {
      formError.value = result.rawLog || "Transaction failed";
    }
  } catch (error) {
    console.error("Transaction error:", error);
    formError.value = error.message || "Transaction failed";
  } finally {
    loading.value = false;
  }
};
</script>
