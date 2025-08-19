<template>
  <div class="max-w-5xl mx-auto p-4">
    <div class="grid gap-4 md:grid-cols-1">
      <div>
        <h2 class="text-xl font-semibold">Coins & Balances</h2>
        <p class="text-base-content/70 mb-3">
          Balances for
          <AddressDisplay :address="address" :truncate="0" />
        </p>

        <div v-if="isLoading" class="text-base-content/70">Loading…</div>
        <div v-else-if="error" class="text-error">{{ error }}</div>
        <div v-else>
          <div
            v-if="balancesView.length === 0"
            class="card bg-base-100 border border-base-300 shadow-sm p-4"
          >
            <div class="text-base-content/70">No balances.</div>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="b in balancesView"
              :key="b.baseDenom"
              class="card bg-base-100 border border-base-300 shadow-sm"
            >
              <div class="card-body py-3 grid grid-cols-2 w-full">
                <div class="space-y-2">
                  <div class="text-xs text-base-content/60">Denom</div>
                  <div class="font-mono">{{ b.displayDenom }}</div>
                  <div class="text-xs text-base-content/60">Balance</div>
                  <div class="font-mono">{{ b.displayAmount }}</div>
                  <div class="text-xs text-base-content/60">Description</div>
                  <div>{{ b.description || "—" }}</div>
                </div>

                <div>
                  <h3 class="font-semibold">Send {{ b.displayDenom }}</h3>
                  <form
                    class="flex flex-col gap-3"
                    @submit.prevent="onSendCard(b)"
                  >
                    <ResolveNameOrAddresInput
                      v-model="cardToAddr[b.baseDenom]"
                      v-model:text="cardToText[b.baseDenom]"
                      :disabled="!isUnlocked || isSending"
                    />

                    <AmountDenomSelector
                      :base-denoms="[b.baseDenom]"
                      :default-base-denom="b.baseDenom"
                      :disabled="!isUnlocked || isSending"
                      @update:display="
                        (p) => onCardDisplayUpdate(b.baseDenom, p)
                      "
                      @update:base="(p) => onCardBaseUpdate(b.baseDenom, p)"
                    />

                    <div
                      v-if="
                        cardBaseAmount[b.baseDenom] &&
                        !hasSufficient(b.baseDenom)
                      "
                      class="text-error text-sm"
                    >
                      Insufficient {{ b.displayDenom }} balance
                    </div>

                    <button
                      class="btn btn-primary"
                      :disabled="
                        !isUnlocked ||
                        isSending ||
                        (cardBaseAmount[b.baseDenom] &&
                          !hasSufficient(b.baseDenom))
                      "
                    >
                      <span
                        v-if="isSending"
                        class="loading loading-spinner"
                      ></span
                      >Send {{ cardAmt[b.baseDenom] }} {{ b.displayDenom }} ...
                    </button>

                    <div class="w-full text-error text-sm">
                      <span v-if="cardErr[b.baseDenom]">{{
                        cardErr[b.baseDenom]
                      }}</span>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
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
import AddressDisplay from "@/components/AddressDisplay.vue";

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
const toText = ref("");
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

// Per-card form state keyed by base denom
import { reactive } from "vue";
const cardToAddr = reactive({});
const cardToText = reactive({});
const cardAmt = reactive({});
const cardBaseAmount = reactive({});
const cardBaseDenom = reactive({});
const cardErr = reactive({});

function onDisplayUpdate({ amount, denom }) {
  amt.value = amount || "";
  den.value = denom || "";
}

function onBaseUpdate({ amount, denom }) {
  baseAmount.value = amount || "";
  baseDenom.value = denom || "";
}

function onCardDisplayUpdate(key, { amount }) {
  cardAmt[key] = amount || "";
}

function onCardBaseUpdate(key, { amount, denom }) {
  cardBaseAmount[key] = amount || "";
  cardBaseDenom[key] = denom || "";
}

function hasSufficient(denom) {
  const amtStr = String(cardBaseAmount[denom] || "");
  if (!amtStr) return true;
  const bal = balancesRaw.value.find((c) => String(c.denom) === denom);
  const balBase = BigInt(String(bal?.amount || "0"));
  const sendBase = BigInt(amtStr);
  return sendBase <= balBase;
}

async function sendInternal({
  to,
  amountDisplay,
  displayDenom,
  baseAmt,
  baseDen,
  setError,
  clear,
}) {
  setError("");
  if (!isUnlocked.value) return;
  if (!String(to || "").startsWith("dys2")) {
    setError("Invalid recipient");
    return;
  }
  if (!amountDisplay || Number(amountDisplay) <= 0) {
    setError("Amount must be > 0");
    return;
  }
  if (!displayDenom) {
    setError("Select denom");
    return;
  }

  if (!baseDen || !baseAmt) {
    setError("Denom conversion failed");
    return;
  }

  const bal = balancesRaw.value.find((c) => String(c.denom) === baseDen);
  const balBase = BigInt(bal?.amount || "0");
  const sendBase = BigInt(baseAmt);
  if (sendBase > balBase) {
    setError(`Insufficient ${displayDenom}`);
    return;
  }

  isSending.value = true;
  try {
    const msg = {
      "@type": "/cosmos.bank.v1beta1.MsgSend",
      from_address: address.value,
      to_address: String(to).trim(),
      amount: [{ denom: baseDen, amount: baseAmt }],
    };
    const res = await sendMsg({
      msg,
      memo: "",
      gasLimit: "auto",
      executorAddress: address.value,
    });
    if (!res?.success) throw new Error(res?.rawLog || "Tx failed");
    clear?.();
    await fetchBalances();
  } catch (e) {
    setError(e?.message || "Send failed");
  } finally {
    isSending.value = false;
  }
}

async function onSend() {
  await sendInternal({
    to: toAddr.value,
    amountDisplay: amt.value,
    displayDenom: den.value,
    baseAmt: baseAmount.value,
    baseDen: baseDenom.value,
    setError: (msg) => (formErr.value = msg),
    clear: () => {
      toAddr.value =
        amt.value =
        den.value =
        baseAmount.value =
        baseDenom.value =
          "";
    },
  });
}

async function onSendCard(b) {
  const key = b.baseDenom;
  await sendInternal({
    to: cardToAddr[key] || "",
    amountDisplay: cardAmt[key] || "",
    displayDenom: b.displayDenom,
    baseAmt: cardBaseAmount[key] || "",
    baseDen: cardBaseDenom[key] || "",
    setError: (msg) => (cardErr[key] = msg),
    clear: () => {
      cardToAddr[key] = "";
      cardToText[key] = "";
      cardAmt[key] = "";
      cardBaseAmount[key] = "";
      cardBaseDenom[key] = "";
    },
  });
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
