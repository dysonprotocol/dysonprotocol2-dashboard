<template>
  <TransitionRoot as="template" :show="open">
    <Dialog class="relative z-50" @close="$emit('close')">
      <TransitionChild
        as="template"
        enter="ease-in-out duration-500"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in-out duration-500"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-base-content/25 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-hidden">
        <div class="absolute inset-0 overflow-hidden">
          <div
            class="pointer-events-none fixed inset-y-0 right-0 flex max-w-2xl pl-10 sm:pl-16"
          >
            <TransitionChild
              as="template"
              enter="transform transition ease-in-out duration-500 sm:duration-700"
              enter-from="translate-x-full"
              enter-to="translate-x-0"
              leave="transform transition ease-in-out duration-500 sm:duration-700"
              leave-from="translate-x-0"
              leave-to="translate-x-full"
            >
              <DialogPanel class="pointer-events-auto w-screen max-w-lg">
                <div class="h-full flex flex-col bg-base-100 shadow-xl">
                  <!-- Header -->
                  <div
                    class="flex items-center justify-between p-4 border-b border-base-300"
                  >
                    <h2 class="text-lg font-semibold text-base-content">
                      Review Transaction
                    </h2>
                    <button
                      @click="$emit('close')"
                      class="btn btn-ghost btn-sm btn-circle"
                      data-testid="close-tx-drawer"
                    >
                      <XMarkIcon class="h-5 w-5" />
                    </button>
                  </div>

                  <!-- Content -->
                  <div class="flex-1 overflow-y-auto p-4 space-y-4">
                    <!-- Chain ID -->
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium">Chain ID</span>
                      </label>
                      <div class="bg-base-200 p-3">
                        <div
                          class="text-sm font-mono text-base-content"
                          data-testid="chain-id-display"
                        >
                          {{ editableTransaction.chainId || "Not set" }}
                        </div>
                      </div>
                    </div>

                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium"
                          >Signer Wallet</span
                        >
                      </label>
                      <div class="bg-base-200 p-3">
                        <div
                          class="text-sm font-mono text-base-content"
                          data-testid="signer-wallet-display"
                        >
                          {{ signerWallet?.type || "Unknown" }} |
                          {{ signerWallet?.name || "Not set" }}
                        </div>
                      </div>
                    </div>

                    <!-- Signer Address -->
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium"
                          >Signer Address</span
                        >
                      </label>
                      <div class="bg-base-200 p-3 space-y-2">
                        <div
                          class="text-sm font-mono text-base-content break-all"
                          data-testid="signer-address-display"
                        >
                          {{ editableTransaction.senderAddress }}
                        </div>
                      </div>
                    </div>

                    <!-- Messages -->
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium"
                          >Messages (JSON)</span
                        >
                      </label>
                      <textarea
                        v-model="messagesJson"
                        class="textarea textarea-bordered w-full text-sm font-mono min-h-32 resize-y"
                        data-testid="messages-input"
                        :class="{ 'textarea-error': messagesError }"
                        placeholder="JSON messages array..."
                        :style="{ height: 'auto', minHeight: '8rem' }"
                        @input="autoResize"
                        ref="messagesTextarea"
                      ></textarea>
                      <div v-if="messagesError" class="label">
                        <span class="label-text-alt text-error">{{
                          messagesError
                        }}</span>
                      </div>
                    </div>

                    <!-- Fee -->
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium">Fee</span>
                      </label>
                      <div class="grid grid-cols-2 gap-2">
                        <div>
                          <label class="label py-1">
                            <span class="label-text-alt">Amount (udys)</span>
                          </label>
                          <input
                            v-model="editableTransaction.fee.amount"
                            type="number"
                            min="0"
                            class="input input-bordered input-sm w-full"
                            data-testid="fee-amount-input"
                          />
                        </div>
                        <div>
                          <label class="label py-1">
                            <span class="label-text-alt">Gas Limit</span>
                          </label>
                          <input
                            v-model="editableTransaction.fee.gasLimit"
                            type="number"
                            min="0"
                            class="input input-bordered input-sm w-full"
                            data-testid="fee-gas-limit-input"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- Memo -->
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium"
                          >Memo (Optional)</span
                        >
                      </label>
                      <input
                        v-model="editableTransaction.memo"
                        type="text"
                        class="input input-bordered w-full text-sm"
                        data-testid="memo-input"
                        placeholder="Enter transaction memo..."
                      />
                    </div>

                    <!-- Error Display -->
                    <div
                      v-if="error"
                      class="alert alert-error"
                      data-testid="transaction-error"
                    >
                      <span>{{ error }}</span>
                    </div>
                  </div>

                  <!-- Footer Actions -->
                  <div class="flex gap-3 p-4 border-t border-base-300">
                    <button
                      @click="$emit('close')"
                      class="btn btn-outline flex-1"
                      data-testid="cancel-transaction"
                      :disabled="loading"
                    >
                      Cancel
                    </button>
                    <button
                      @click="signTransaction"
                      class="btn btn-primary flex-1"
                      data-testid="sign-transaction"
                      :disabled="loading || !!messagesError"
                    >
                      <span
                        v-if="loading"
                        class="loading loading-spinner loading-sm"
                      ></span>
                      <span v-else>Sign Transaction</span>
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from "vue";
import {
  Dialog,
  DialogPanel,
  TransitionChild,
  TransitionRoot,
} from "@headlessui/vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";
import { useWallet } from "@/composables/useWallet";

// Props & Emits
const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  transaction: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["close", "success"]);

// Composables
const { chainId, sendMsg, addTransaction, unlockedWallets, selectWallet } =
  useWallet();

// State
const loading = ref(false);
const error = ref("");
const messagesError = ref("");

// Editable transaction data
const editableTransaction = ref({
  chainId: "",
  senderAddress: "",
  messages: [],
  fee: {
    amount: "0",
    gasLimit: "200000",
  },
  memo: "",
});

// Messages as JSON string for editing
const messagesJson = ref("");
const messagesTextarea = ref(null);

// Computed
const parsedMessages = computed(() => {
  try {
    const parsed = JSON.parse(messagesJson.value);
    messagesError.value = "";
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    messagesError.value = "Invalid JSON format";
    return [];
  }
});

const signerWallet = computed(() => {
  const senderAddress = editableTransaction.value.senderAddress;
  if (!senderAddress) return null;

  return (
    unlockedWallets.value.find((wallet) => wallet.address === senderAddress) ||
    null
  );
});

// Watchers
watch(
  () => props.transaction,
  (newTransaction) => {
    if (newTransaction && props.open) {
      populateTransaction(newTransaction);
    }
  },
  { immediate: true }
);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetState();
      populateTransaction(props.transaction);
    }
  }
);

// Methods
const populateTransaction = (transaction) => {
  console.log("🔍 SignTxDrawer.populateTransaction() - Input transaction:", {
    transaction,
    fee: transaction.fee,
    feeType: typeof transaction.fee,
    feeAmount: transaction.fee?.amount,
    feeAmountType: typeof transaction.fee?.amount,
    isArray: Array.isArray(transaction.fee?.amount),
  });

  // Extract fee amount - handle both array and string formats
  let feeAmount = "0";
  if (transaction.fee?.amount) {
    if (Array.isArray(transaction.fee.amount)) {
      // Cosmos SDK format: amount is array of coin objects
      console.log(
        "📦 Fee amount is array (Cosmos SDK format):",
        transaction.fee.amount
      );
      const firstCoin = transaction.fee.amount[0];
      feeAmount = firstCoin?.amount || "0";
      console.log("💰 Extracted amount from first coin:", feeAmount);
    } else {
      // Simple string/number format
      console.log("🔢 Fee amount is simple value:", transaction.fee.amount);
      feeAmount = String(transaction.fee.amount);
    }
  }

  // Extract gas limit - handle both snake_case and camelCase
  const gasLimit =
    transaction.fee?.gas_limit || transaction.fee?.gasLimit || "200000";
  console.log("⛽ Gas limit extracted:", {
    gas_limit: transaction.fee?.gas_limit,
    gasLimit: transaction.fee?.gasLimit,
    final: gasLimit,
  });

  editableTransaction.value = {
    chainId: chainId.value || "",
    senderAddress: transaction.senderAddress || "",
    messages: transaction.messages || [],
    fee: {
      amount: feeAmount,
      gasLimit: gasLimit,
    },
    memo: transaction.memo || "",
  };

  console.log(
    "✅ SignTxDrawer.populateTransaction() - Final editable transaction:",
    {
      editableTransaction: editableTransaction.value,
      feeAmount: editableTransaction.value.fee.amount,
      feeAmountType: typeof editableTransaction.value.fee.amount,
      gasLimit: editableTransaction.value.fee.gasLimit,
    }
  );

  messagesJson.value = JSON.stringify(
    editableTransaction.value.messages,
    null,
    2
  );

  // Auto-resize textarea after content is set
  nextTick(() => {
    autoResize();
  });
};

const resetState = () => {
  loading.value = false;
  error.value = "";
  messagesError.value = "";
};

// Auto-resize textarea to fit content
const autoResize = () => {
  const textarea = messagesTextarea.value;
  if (textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + 5 + "px";
  }
};

const signTransaction = async () => {
  console.log(
    "🚀 SignTxDrawer.signTransaction() - Starting transaction signing"
  );

  if (messagesError.value) {
    error.value = "Please fix the JSON format error in messages";
    return;
  }

  if (parsedMessages.value.length === 0) {
    error.value = "At least one message is required";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    // Find and select the correct wallet for this transaction
    const senderAddress = editableTransaction.value.senderAddress;
    if (!unlockedWallets.value.some((w) => w.address === senderAddress)) {
      error.value =
        "Sender wallet is not unlocked. Please unlock the wallet first.";
      return;
    }

    // Send each message (for now, just send the first one)
    const message = parsedMessages.value[0];
    console.log("📨 Message to send:", message);

    // Reconstruct fee object in Cosmos SDK format
    const feeAmount = editableTransaction.value.fee.amount;
    const gasLimit = editableTransaction.value.fee.gasLimit;

    const reconstructedFee = {
      amount: [{ denom: "udys", amount: feeAmount }],
      gas_limit: gasLimit,
    };

    console.log("💰 Fee reconstruction:", {
      originalFeeAmount: feeAmount,
      originalGasLimit: gasLimit,
      reconstructedFee,
      feeAmountType: typeof feeAmount,
      gasLimitType: typeof gasLimit,
    });

    // Instead of calling sendMsg (which triggers modal recursively),
    // resolve the modal promise with the edited transaction data
    console.log("📤 SignTxDrawer resolving modal promise with edited data");

    const resolvedTransaction = {
      msgs: parsedMessages.value,
      memo: editableTransaction.value.memo,
      fee: reconstructedFee,
      chainId: editableTransaction.value.chainId,
      address: editableTransaction.value.senderAddress,
    };

    console.log("✅ Resolved transaction data:", resolvedTransaction);

    // Emit success with resolved transaction data (not txHash)
    emit("success", {
      resolvedTransaction,
      memo: editableTransaction.value.memo,
    });

    console.log(
      "🚪 Closing SignTxDrawer, transaction will be processed by dysonTxUtils"
    );

    // Note: After this closes, dysonTxUtils.sendMsgs will continue execution
    // with the resolved transaction data and actually broadcast to the chain
    emit("close");
  } catch (err) {
    console.error("💥 Transaction error:", err);
    error.value = err.message || "Transaction failed";
  } finally {
    loading.value = false;
    console.log("🏁 SignTxDrawer.signTransaction() - Finished");
  }
};

// Initialize on mount
onMounted(() => {
  if (props.open && props.transaction) {
    populateTransaction(props.transaction);
  }
});
</script>
