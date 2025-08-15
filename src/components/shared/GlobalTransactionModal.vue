<script setup>
import { transactionConfig } from "@/utils/transactionModalConfig.js";
import SignTxDrawer from "./SignTxDrawer.vue";
import { ref, computed } from "vue";

// Global modal state
const isOpen = ref(false);
const transactionData = ref({});
const resolvePromise = ref(null);

// Override the global transaction modal handler
transactionConfig.modalHandler = (msgs, memo, fee, chainId, address) => {
  console.log("🌐 GlobalTransactionModal.modalHandler() - Called with:", {
    msgs,
    memo,
    fee,
    feeType: typeof fee,
    feeAmount: fee?.amount,
    feeAmountType: typeof fee?.amount,
    feeAmountIsArray: Array.isArray(fee?.amount),
    chainId,
    address,
  });

  return new Promise((resolve) => {
    transactionData.value = { msgs, memo, fee, chainId, address };
    resolvePromise.value = resolve;
    isOpen.value = true;

    console.log(
      "📂 GlobalTransactionModal.transactionData.value set to:",
      transactionData.value
    );
  });
};

const handleClose = () => {
  isOpen.value = false;
  resolvePromise.value?.(null); // User cancelled
};

const handleSuccess = (result) => {
  console.log(
    "✅ GlobalTransactionModal.handleSuccess() - Called with result:",
    result
  );

  // Use the resolved transaction from SignTxDrawer if available,
  // otherwise fallback to original transaction data
  const resolvedData = result.resolvedTransaction || {
    msgs: transactionData.value.msgs,
    memo: result.memo || transactionData.value.memo,
    fee: transactionData.value.fee,
    chainId: transactionData.value.chainId,
    address: transactionData.value.address,
  };

  console.log(
    "📤 GlobalTransactionModal.handleSuccess() - Resolving with:",
    resolvedData
  );

  isOpen.value = false;
  resolvePromise.value?.(resolvedData);
};

// Computed property to track what we're passing to SignTxDrawer
const transactionForDrawer = computed(() => {
  const tx = {
    senderAddress: transactionData.value.address,
    messages: transactionData.value.msgs,
    fee: transactionData.value.fee,
    memo: transactionData.value.memo,
  };

  console.log("🎯 GlobalTransactionModal.transactionForDrawer computed:", {
    tx,
    fee: tx.fee,
    feeType: typeof tx.fee,
    feeAmount: tx.fee?.amount,
    feeAmountType: typeof tx.fee?.amount,
    isArray: Array.isArray(tx.fee?.amount),
  });

  return tx;
});
</script>

<template>
  <SignTxDrawer
    :open="isOpen"
    :transaction="transactionForDrawer"
    @close="handleClose"
    @success="handleSuccess"
  />
</template>
