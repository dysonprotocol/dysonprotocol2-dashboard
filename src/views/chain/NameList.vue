<template>
  <div class="max-w-5xl mx-auto p-4 space-y-4">
    <!-- Register Name Wizard -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <div class="lg:col-span-2 space-y-3">
        <!-- Registration Form styled like NftOwnerActions -->
        <fieldset class="fieldset bg-base-200 border-base-300 border p-4">
          <legend class="fieldset-legend">Register Name</legend>
          <div class="gap-4 space-y-4">
            <div class="grid grid-cols-1 gap-3">
              <div class="space-y-1">
                <div class="font-semibold">Choose name</div>
                <input
                  v-model.trim="chosenName"
                  class="input input-bordered w-full"
                  placeholder="e.g. alice.dys"
                />
                <div class="text-warning text-xs">
                  <span v-if="chosenName && !isValidName">
                    Name must end with ".dys".
                  </span>
                </div>
              </div>

              <div class="space-y-1">
                <div class="font-semibold">Estimate value</div>
                <div class="join w-full">
                  <input
                    v-model.trim="valuationAmount"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    class="input join-item"
                    placeholder="amount"
                  />

                  <select
                    v-model="selectedDisplayDenom"
                    class="select join-item"
                  >
                    <option disabled value="">Denom</option>
                    <option
                      v-for="opt in allowedDisplayOptions"
                      :key="opt.base"
                      :value="opt.display"
                    >
                      {{ opt.display }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <WalletSelector
                v-model="selectedExecutor"
                :show-locked="false"
                button-class="btn-primary"
              />
              <button
                class="btn btn-primary"
                :disabled="!canRegister || isRegistering"
                @click="register"
              >
                {{ isRegistering ? "Registering…" : "Register" }}
              </button>
              <span
                v-if="commitError || revealError"
                class="text-error text-sm"
              >
                {{ commitError || revealError }}
              </span>
            </div>

            <div
              v-if="
                hasNumericValuation && denomAllowed && annualFeeBase !== '0'
              "
              class="text-sm text-base-content/80"
            >
              Annual fee:
              <span class="font-medium">{{ annualFeeDisplay }}</span>
              {{ currentDisplayOpt?.display }}. This is charged during the
              <span class="font-medium">Reveal</span> transaction.
            </div>

            <div class="text-xs space-y-1">
              <div v-if="validationMessage" class="text-warning">
                {{ validationMessage }}
              </div>
              <div v-if="commitTxHash">
                Commit Tx:
                <router-link :to="`/txs/${commitTxHash}`" class="link">{{
                  shortHash(commitTxHash)
                }}</router-link>
              </div>
              <div v-if="revealTxHash">
                Reveal Tx:
                <router-link :to="`/txs/${revealTxHash}`" class="link">{{
                  shortHash(revealTxHash)
                }}</router-link>
              </div>
            </div>
          </div>

          <ul class="steps steps-vertical">
            <li :class="['step', step >= 1 ? 'step-primary' : '']">
              <div>Choose name & value</div>
            </li>
            <li :class="['step', step >= 2 ? 'step-primary' : '']">
              <div>Commit</div>
            </li>
            <li :class="['step', step >= 3 ? 'step-primary' : '']">
              <div>Reveal</div>
            </li>
            <li :class="['step', step >= 4 ? 'step-primary' : '']">
              <router-link
                v-if="step >= 4 && chosenName"
                :to="`/names/${chosenName}`"
                class="link"
              >
                <button class="btn btn-sm btn-primary">
                  View name details {{ chosenName }}
                </button>
              </router-link>
              <div v-else>View Name</div>
            </li>
          </ul>
        </fieldset>
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-medium">All names</h2>
        <button
          class="btn btn-sm"
          @click="loadAllNames"
          :disabled="isLoadingAll"
        >
          Refresh
        </button>
      </div>

      <div v-if="isLoadingAll" class="text-base-content/70 mt-2">Loading…</div>
      <div v-else-if="allError" class="text-error mt-2">{{ allError }}</div>
      <div v-else class="mt-2">
        <div v-if="nftsView.length === 0" class="text-base-content/70">
          No names found.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Valuation</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="nft in nftsView" :key="nft.id">
                <td class="font-mono">
                  <router-link :to="`/names/${nft.id}`" class="link">{{
                    nft.id
                  }}</router-link>
                </td>
                <td>
                  <span v-if="formatValuation(nft).label">
                    {{ formatValuation(nft).amount }}
                    {{ formatValuation(nft).label }}
                  </span>
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed, onMounted, onUnmounted, watch } from "vue";
import { useWallet } from "@/composables/useWallet";
import WalletSelector from "@/components/shared/WalletSelector.vue";
import TxHashDisplay from "@/components/TxHashDisplay.vue";

const chainInfo = inject("chainInfo", { restUrl: "http://localhost:1317" });

// removed search state
const isLoadingAll = ref(false);
const allError = ref("");
const allNames = ref([]);
const allNfts = ref([]); // full NFT objects
const selectedExecutor = ref("");
const hasExecutor = computed(() => !!selectedExecutor.value);

// Registration wizard state
const step = ref(1);
const chosenName = ref("");
const valuationAmount = ref("");
// Denom is fixed to display unit 'dys' for UI; convert to base using normalizeCoin
const salt = ref("");
const hexHash = ref("");
const isRegistering = ref(false);
const commitError = ref("");
const revealError = ref("");
const commitTxHash = ref("");
const revealTxHash = ref("");

const {
  sendMsg,
  getSignerAddress,
  isWalletConnected,
  loadDenomMetadata,
  getDisplayOptions,
  normalizeFromDisplay,
} = useWallet();

// Nameservice params (allowed denoms)
const allowedDenoms = ref([]);
const allowedDisplayOptions = ref([]); // [{ display: string, name: string, base: string }]
const selectedDisplayDenom = ref("");
async function loadNameserviceParams() {
  try {
    const resp = await fetch(
      `${chainInfo.restUrl}/dysonprotocol/nameservice/v1/params`
    );
    if (!resp.ok) return;
    const json = await resp.json();
    allowedDenoms.value = json?.params?.allowed_denoms || [];
    await loadDenomMetadata();
    allowedDisplayOptions.value = getDisplayOptions({
      allowedBases: allowedDenoms.value,
    });
    if (!selectedDisplayDenom.value && allowedDisplayOptions.value.length)
      selectedDisplayDenom.value = allowedDisplayOptions.value[0].display;
  } catch {}
}

// Balance tracking for the currently selected base denom
const availableBalance = ref("0");
const effectiveDisplayDenom = computed(
  () => selectedDisplayDenom.value || "dys2"
);
const currentDisplayOpt = computed(() =>
  allowedDisplayOptions.value.find(
    (o) => o.display === effectiveDisplayDenom.value
  )
);
const currentBaseDenom = computed(
  () => requiredBaseDenom.value || currentDisplayOpt.value?.base || "udys"
);
async function refreshBalance() {
  try {
    const addr = selectedExecutor.value || getSignerAddress();
    const resp = await fetch(
      `${chainInfo.restUrl}/cosmos/bank/v1beta1/balances/${addr}?pagination.limit=1000`
    );
    if (!resp.ok) return (availableBalance.value = "0");
    const json = await resp.json();
    const targetDenom = currentBaseDenom.value;
    const bal = (json?.balances || []).find((c) => c.denom === targetDenom);
    availableBalance.value = String(bal?.amount || "0");
  } catch {
    availableBalance.value = "0";
  }
}

let balanceInterval;
onMounted(() => {
  loadNameserviceParams();
  loadDenomMetadata();
  loadAnnualPct();
  if (isWalletConnected.value) refreshBalance();
  balanceInterval = setInterval(() => {
    if (selectedExecutor.value || isWalletConnected.value) refreshBalance();
  }, 5000);
});

watch(isWalletConnected, (v) => {
  if (v) refreshBalance();
});

watch(
  () => selectedExecutor.value,
  () => refreshBalance()
);

watch(
  () => selectedDisplayDenom.value,
  () => refreshBalance()
);

// Reset steps when form fields change
watch(
  [chosenName, valuationAmount, selectedDisplayDenom, selectedExecutor],
  () => {
    step.value = 1;
  }
);

onUnmounted(() => {
  if (balanceInterval) clearInterval(balanceInterval);
});

const isValidName = computed(() =>
  String(chosenName.value || "")
    .trim()
    .endsWith(".dys")
);
const canComputeHash = computed(() => isValidName.value && !!salt.value);
// Convert entered display amount to base denom/amount based on selected display denom
const requiredBase = computed(() => {
  if (!hasNumericValuation.value) return null;
  try {
    const displayDenom = effectiveDisplayDenom.value || "";
    let amt = String(valuationAmount.value || "0").trim();
    if (amt.startsWith(".")) amt = `0${amt}`;
    return normalizeFromDisplay({
      amount: amt,
      displayDenom,
    });
  } catch {
    return null;
  }
});
const requiredBaseAmount = computed(
  () => requiredBase.value?.base?.amount || null
);
const requiredBaseDenom = computed(
  () => requiredBase.value?.base?.denom || null
);

const denomAllowed = computed(() => {
  const bases = allowedDenoms.value || [];
  if (!bases.length) return true;
  const display = selectedDisplayDenom.value || "";
  const match = allowedDisplayOptions.value.find((o) => o.display === display);
  const base = match?.base;
  return !!base && bases.includes(base);
});
// allow integer or decimal amounts in display denom
const hasNumericValuation = computed(() =>
  /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(String(valuationAmount.value || "").trim())
);

// Valuation fee pct for nameservice.dys class
const annualPctStr = ref("0");
async function loadAnnualPct() {
  try {
    const r = await fetch(
      `${chainInfo.restUrl}/dysonprotocol/nft/v1beta1/class?class_id=nameservice.dys`
    );
    if (!r.ok) return;
    const j = await r.json();
    annualPctStr.value = j?.class?.data?.valuation_fee_pct || "0";
  } catch {
    annualPctStr.value = "0";
  }
}

function parseDecimalToRatio(s) {
  const str = String(s || "0").trim();
  if (!str.includes(".")) return { num: BigInt(str), den: 1n };
  const [a, b] = str.split(".");
  const scale = BigInt(b.length);
  const num = BigInt(a + b);
  const den = 10n ** scale;
  return { num, den };
}
const annualPctRatio = computed(() => parseDecimalToRatio(annualPctStr.value));
const hasFunds = computed(() => {
  if (!hasNumericValuation.value) return false;
  try {
    if (!requiredBaseAmount.value) return false;
    const { num, den } = annualPctRatio.value;
    const annual = (BigInt(requiredBaseAmount.value) * num) / den;
    return annual <= BigInt(availableBalance.value || "0");
  } catch {
    return false;
  }
});

// Annual charge validations: valuation >= 1 base unit when annual_pct > 0, and <= balance
const hasMinAnnual = computed(() => {
  try {
    const amt = requiredBaseAmount.value
      ? BigInt(requiredBaseAmount.value)
      : 0n;
    const { num } = annualPctRatio.value;
    // If annual percent is 0, allow zero valuation; otherwise require at least 1 base unit valuation
    if (num === 0n) return true;
    return amt >= 1n;
  } catch {
    return false;
  }
});

const annualWithinBalance = computed(() => {
  try {
    const amt = requiredBaseAmount.value
      ? BigInt(requiredBaseAmount.value)
      : 0n;
    const { num, den } = annualPctRatio.value;
    const annual = (amt * num) / den;
    return annual <= BigInt(availableBalance.value || "0");
  } catch {
    return false;
  }
});

function baseToDisplay(amountBase) {
  const exp = Number(currentDisplayOpt.value?.exponent || 0);
  const s = String(amountBase || "0");
  if (exp <= 0) return s;
  if (s.length <= exp) {
    const pad = "0".repeat(exp - s.length);
    return `0.${pad}${s}`.replace(/\.0+$/, "");
  }
  const i = s.length - exp;
  return `${s.slice(0, i)}.${s.slice(i)}`.replace(/\.0+$/, "");
}

function formatPercent(s) {
  const { num, den } = parseDecimalToRatio(s);
  const scale = 10000n;
  const scaled = (num * 100n * scale) / (den || 1n);
  const intPart = scaled / scale;
  let frac = (scaled % scale).toString().padStart(4, "0").replace(/0+$/, "");
  return frac ? `${intPart}.${frac}%` : `${intPart}%`;
}

const validationMessage = computed(() => {
  if (!denomAllowed.value) {
    const allowedDisplays = (allowedDisplayOptions.value || []).map(
      (o) => o.display
    );
    return `Denom not allowed. Allowed: ${allowedDisplays.join(", ") || "—"}`;
  }
  if (hasNumericValuation.value && !hasFunds.value) {
    const denomLabel =
      currentDisplayOpt.value?.display || effectiveDisplayDenom.value || "dys";
    // Use the computed annual fee base; if zero, do not show an insufficient-funds message
    const annualBase = String(annualFeeBase.value || "0");
    if (annualBase === "0") return "";
    const need = baseToDisplay(annualBase);
    const have = baseToDisplay(availableBalance.value || "0");
    const addr = selectedExecutor.value || getSignerAddress();
    return `Insufficient funds for annual fee. Need ${need} ${denomLabel}, ${addr} has ${have} ${denomLabel}.`;
  }
  if (hasNumericValuation.value && !hasMinAnnual.value) {
    const { num } = annualPctRatio.value;
    const pct = formatPercent(annualPctStr.value);
    const denomLabel = currentDisplayOpt.value?.display || "";
    const minBase = num > 0n ? 1n : 0n;
    const minDisplay = baseToDisplay(minBase.toString());
    return `Annual charge is ${pct}. So the minimum valuation is ${minDisplay} ${denomLabel}.`;
  }
  if (hasNumericValuation.value && !annualWithinBalance.value)
    return "Annual charge exceeds balance.";
  if (!hasExecutor.value) return "Select a wallet.";
  return "";
});

const annualFeeBase = computed(() => {
  try {
    if (!requiredBaseAmount.value) return "0";
    const { num, den } = annualPctRatio.value;
    return ((BigInt(requiredBaseAmount.value) * num) / den).toString();
  } catch {
    return "0";
  }
});
const annualFeeDisplay = computed(() => baseToDisplay(annualFeeBase.value));
const canCommit = computed(
  () =>
    !!hexHash.value &&
    hasNumericValuation.value &&
    denomAllowed.value &&
    hasFunds.value
);
const canReveal = computed(() => isValidName.value && !!salt.value);
const canRegister = computed(
  () =>
    isValidName.value &&
    hasNumericValuation.value &&
    denomAllowed.value &&
    hasFunds.value &&
    hasMinAnnual.value &&
    annualWithinBalance.value &&
    hasExecutor.value
);

function generateSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  salt.value = Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function computeHash() {
  hexHash.value = "";
  const committer = selectedExecutor.value || getSignerAddress();
  const url = `${
    chainInfo.restUrl
  }/dysonprotocol/nameservice/v1/compute_hash?name=${encodeURIComponent(
    chosenName.value
  )}&salt=${encodeURIComponent(salt.value)}&committer=${encodeURIComponent(
    committer
  )}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
  const json = await resp.json();
  hexHash.value = json?.hex_hash || "";
}

function shortHash(h) {
  if (!h) return "";
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

async function commit() {
  commitError.value = "";
  commitTxHash.value = "";
  const committer = selectedExecutor.value || getSignerAddress();
  const msg = {
    "@type": "/dysonprotocol.nameservice.v1.MsgCommit",
    committer,
    hexhash: hexHash.value,
    valuation: {
      denom: String(requiredBaseDenom.value || "udys"),
      amount: String(requiredBaseAmount.value || "0"),
    },
  };
  const res = await sendMsg({ msg, executorAddress: committer });
  if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  commitTxHash.value = res.rawSendMsgsResponse?.raw?.tx_response?.txhash || "";
  step.value = Math.max(step.value, 2);
  refreshBalance();
}

async function reveal() {
  revealError.value = "";
  revealTxHash.value = "";
  const committer = selectedExecutor.value || getSignerAddress();
  const msg = {
    "@type": "/dysonprotocol.nameservice.v1.MsgReveal",
    committer,
    name: String(chosenName.value),
    salt: String(salt.value),
  };
  step.value = Math.max(step.value, 3);
  const res = await sendMsg({ msg, executorAddress: committer });
  if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  revealTxHash.value = res.rawSendMsgsResponse?.raw?.tx_response?.txhash || "";
  step.value = Math.max(step.value, 4);
  refreshBalance();
}

async function register() {
  if (!canRegister.value) return;
  isRegistering.value = true;
  commitError.value = "";
  revealError.value = "";
  try {
    // Step 1: generate salt and compute hash
    generateSalt();
    await computeHash();
    // Step 2: commit
    await commit();
    // Step 3: reveal
    await reveal();
  } catch (e) {
    const msg = e?.message || String(e);
    if (!commitTxHash.value) commitError.value = msg;
    else revealError.value = msg;
  } finally {
    isRegistering.value = false;
  }
}

// search removed

async function loadAllNames() {
  isLoadingAll.value = true;
  allError.value = "";
  allNames.value = [];
  allNfts.value = [];
  try {
    const collected = [];
    let nextKey = "";
    do {
      const url = `${
        chainInfo.restUrl
      }/dysonprotocol/nft/v1beta1/nfts?class_id=nameservice.dys&pagination.limit=200${
        nextKey ? `&pagination.key=${encodeURIComponent(nextKey)}` : ""
      }`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
      const json = await resp.json();
      const page = (json?.nfts || []).filter(
        (n) => n?.class_id === "nameservice.dys" && n?.id
        // &&
        //n.id !== "nameservice.dys"
      );
      collected.push(...page);
      nextKey = json?.pagination?.next_key || "";
    } while (nextKey);
    allNfts.value = collected;
  } catch (e) {
    allError.value = e?.message || "Failed to load names";
  } finally {
    isLoadingAll.value = false;
  }
}

onMounted(() => {
  loadAllNames();
});

// ===== Table helpers =====

function getDisplayInfoForBase(baseDenom) {
  const opt = allowedDisplayOptions.value.find((o) => o.base === baseDenom);
  if (!opt) return { display: baseDenom || "", exponent: 0 };
  return { display: opt.display, exponent: Number(opt.exponent || 0) };
}

function baseToDisplayFor(amountBase, baseDenom) {
  const { exponent } = getDisplayInfoForBase(baseDenom);
  const s = String(amountBase || "0");
  const exp = Number(exponent || 0);
  if (exp <= 0) return s;
  if (s.length <= exp) {
    const pad = "0".repeat(exp - s.length);
    return `0.${pad}${s}`.replace(/\.0+$/, "");
  }
  const i = s.length - exp;
  return `${s.slice(0, i)}.${s.slice(i)}`.replace(/\.0+$/, "");
}

// no date formatting needed for this table

function coinAmountBigInt(coin) {
  try {
    const amt = coin?.amount ? BigInt(String(coin.amount)) : 0n;
    const denom = String(coin?.denom || "");
    if (!denom) return 0n;
    return amt;
  } catch {
    return 0n;
  }
}

function formatValuation(nft) {
  const coin = nft?.data?.valuation || { amount: "0", denom: "" };
  const denom = String(coin?.denom || "");
  if (!denom) return { amount: "0", label: "" };
  const amount = String(coin?.amount || "0");
  const label = getDisplayInfoForBase(denom).display;
  return { amount: baseToDisplayFor(amount, denom), label };
}

// current bid formatting removed with column

const nftsView = computed(() => {
  const arr = Array.isArray(allNfts.value) ? [...allNfts.value] : [];
  arr.sort((a, b) => {
    const aa = coinAmountBigInt(a?.data?.valuation);
    const bb = coinAmountBigInt(b?.data?.valuation);
    if (aa === bb)
      return String(a?.id || "").localeCompare(String(b?.id || ""));
    // Descending by valuation
    return aa > bb ? -1 : 1;
  });
  return arr;
});
</script>
