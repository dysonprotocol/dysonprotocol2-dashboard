<template>
  <div class="max-w-5xl mx-auto p-4 space-y-4">
    <div class="card bg-base-100 border-base-300 border card-md shadow-sm">
      <div class="card-body">
        <h2 class="card-title">Send Coins</h2>
        <form class="flex flex-col gap-2" @submit.prevent="onSend">
          <ResolveNameOrAddresInput
            v-model="toAddr"
            :disabled="!isUnlocked || isSending"
          >
            <template
              #default="{
                inputValue,
                rawValue,
                isResolving,
                err,
                showResolve,
                canResolve,
                labelSuffix,
                disabled,
                onInput,
                onResolve,
              }"
            >
              <div class="flex flex-wrap items-end gap-2 w-full">
                <div class="join flex-1 min-w-[16rem]">
                  <input
                    :value="inputValue"
                    @input="onInput"
                    type="text"
                    placeholder="dys2... or name"
                    class="input input-bordered input-md font-mono join-item w-full validator"
                    :class="{ 'input-error': !!err }"
                    :disabled="disabled || isResolving"
                    autocomplete="off"
                    spellcheck="false"
                  />
                  <button
                    v-if="showResolve"
                    class="btn btn-md join-item"
                    :disabled="disabled || isResolving || !canResolve"
                    @click.prevent="onResolve"
                  >
                    {{ isResolving ? "Resolving…" : "Resolve name" }}
                  </button>
                </div>

                <AmountDenomSelector
                  :base-denoms="baseDenoms"
                  :default-base-denom="defaultBaseDenom"
                  :disabled="!isUnlocked || isSending"
                  @update:display="onDisplayUpdate"
                  @update:base="onBaseUpdate"
                />

                <button
                  class="btn btn-primary"
                  :disabled="!isUnlocked || isSending"
                >
                  Send
                </button>
              </div>

              <div
                class="w-full text-error text-sm flex flex-wrap gap-x-4 gap-y-1"
              >
                <span v-if="err">{{ err }}</span>
                <span v-if="formErr">{{ formErr }}</span>
              </div>
            </template>
          </ResolveNameOrAddresInput>
        </form>
      </div>
    </div>

    <h2 class="text-xl font-semibold">Coins & Balances</h2>
    <p class="text-sm text-base-content/70">Balances for {{ address }}</p>

    <div v-if="isLoading" class="text-base-content/70">Loading…</div>
    <div v-else-if="error" class="text-error">{{ error }}</div>
    <div v-else>
      <div v-if="balancesView.length === 0" class="text-base-content/70">
        No balances.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th>Denom</th>
              <th>Description</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in balancesView" :key="b.baseDenom">
              <td class="font-mono">{{ b.displayDenom }}</td>
              <td>{{ b.description }}</td>
              <td class="text-right">{{ b.displayAmount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject } from "vue";
import { useRoute } from "vue-router";
import { useWallet } from "@/composables/useWallet";
import AmountDenomSelector from "@/components/AmountDenomSelector.vue";
import ResolveNameOrAddresInput from "@/components/ResolveNameOrAddresInput.vue";

const chainInfo = inject("chainInfo", { restUrl: "" });

const route = useRoute();
const address = computed(() =>
  String(route.meta?.resolvedAddress || route.params.address || "")
);

const isLoading = ref(false);
const error = ref("");
const balancesRaw = ref([]); // [{ amount, denom }]

const {
  loadDenomMetadata,
  normalizeCoin,
  normalizeFromDisplay,
  sendMsg,
  unlockedWallets,
} = useWallet();

const toAddr = ref("");
const amt = ref("");
const den = ref("dys2");
const baseAmount = ref("");
const baseDenom = ref("");
const isSending = ref(false);
const formErr = ref("");
const isUnlocked = computed(() =>
  unlockedWallets.value.some((w) => w.address === address.value)
);
const baseDenoms = computed(() =>
  balancesRaw.value.map((c) => String(c.denom))
);
const defaultBaseDenom = computed(() => balancesRaw.value[0]?.denom || "");

function onDisplayUpdate({ amount, denom }) {
  amt.value = amount || "";
  den.value = denom || "";
}

function onBaseUpdate({ amount, denom }) {
  baseAmount.value = amount || "";
  baseDenom.value = denom || "";
}

async function onSend() {
  formErr.value = "";
  if (!isUnlocked.value) return;
  if (!toAddr.value.startsWith("dys2")) {
    formErr.value = "Invalid recipient";
    return;
  }
  if (!amt.value || Number(amt.value) <= 0) {
    formErr.value = "Amount must be > 0";
    return;
  }
  if (!den.value) {
    formErr.value = "Select denom";
    return;
  }

  // Use base values computed by selector
  if (!baseDenom.value || !baseAmount.value) {
    formErr.value = "Denom conversion failed";
    return;
  }

  // Validate balance (compare in base)
  const bal = balancesRaw.value.find(
    (c) => String(c.denom) === baseDenom.value
  );
  const balBase = BigInt(bal?.amount || "0");
  const sendBase = BigInt(baseAmount.value);
  if (sendBase > balBase) {
    formErr.value = `Insufficient ${den.value}`;
    return;
  }

  isSending.value = true;
  try {
    const msg = {
      "@type": "/cosmos.bank.v1beta1.MsgSend",
      from_address: address.value,
      to_address: toAddr.value.trim(),
      amount: [{ denom: baseDenom.value, amount: baseAmount.value }],
    };
    const res = await sendMsg({
      msg,
      memo: "",
      gasLimit: "auto",
      executorAddress: address.value,
    });
    if (!res?.success) throw new Error(res?.rawLog || "Tx failed");
    toAddr.value =
      amt.value =
      den.value =
      baseAmount.value =
      baseDenom.value =
        "";
    await fetchBalances();
  } catch (e) {
    formErr.value = e?.message || "Send failed";
  } finally {
    isSending.value = false;
  }
}

async function fetchBalances() {
  isLoading.value = true;
  error.value = "";
  balancesRaw.value = [];
  try {
    const url = `${
      chainInfo.restUrl
    }/cosmos/bank/v1beta1/balances/${encodeURIComponent(
      address.value
    )}?pagination.limit=1000`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    const json = await resp.json();
    const arr = Array.isArray(json?.balances) ? json.balances : [];
    balancesRaw.value = arr;
  } catch (e) {
    error.value = e?.message || "Failed to load balances";
  } finally {
    isLoading.value = false;
  }
}

const balancesView = computed(() => {
  const items = [];
  for (const coin of balancesRaw.value) {
    try {
      const norm = normalizeCoin({
        amount: String(coin.amount || "0"),
        denom: String(coin.denom || ""),
      });
      items.push({
        baseDenom: norm.base.denom,
        displayDenom: norm.display.denom,
        displayAmount: formatDisplay(norm.display.amount, norm.metadata),
        description: resolveDescription(norm.metadata),
      });
    } catch {
      items.push({
        baseDenom: String(coin.denom || ""),
        displayDenom: String(coin.denom || ""),
        displayAmount: String(coin.amount || "0"),
        description: "",
      });
    }
  }
  // Sort alphabetically by display denom
  items.sort((a, b) =>
    String(a.displayDenom).localeCompare(String(b.displayDenom))
  );
  return items;
});

function formatDisplay(amountStr, metadata) {
  // amountStr is already in display unit per normalizeCoin; keep as-is
  return String(amountStr);
}

function resolveDescription(metadata) {
  if (!metadata) return "";
  if (metadata.description && String(metadata.description).trim() !== "")
    return String(metadata.description);
  if (metadata.name && String(metadata.name).trim() !== "")
    return String(metadata.name);
  return "";
}

onMounted(async () => {
  await loadDenomMetadata();
  await fetchBalances();
});

watch(
  () => address.value,
  async () => {
    await fetchBalances();
  }
);
</script>
