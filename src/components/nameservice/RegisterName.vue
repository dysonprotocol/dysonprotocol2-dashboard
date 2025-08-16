<template>
  <div class="space-y-3">
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
            <div class="text-error text-xs">
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

              <select v-model="selectedDisplayDenom" class="select join-item">
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
          <span v-if="commitError || revealError" class="text-error text-sm">
            {{ commitError || revealError }}
          </span>
        </div>

        <div
          v-if="hasNumericValuation && denomAllowed && annualFeeBase !== '0'"
          class="text-sm text-base-content/80"
        >
          Annual fee:
          <span class="font-medium">{{ annualFeeDisplay }}</span>
          {{ currentDisplayOpt?.display }}. This is charged during the
          <span class="font-medium">Reveal</span> transaction.
        </div>

        <div class="text-xs space-y-1">
          <div v-if="validationMessage" class="text-error">
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
</template>

<script setup>
import { ref, inject, computed, onMounted, onUnmounted, watch } from "vue";
import WalletSelector from "@/components/shared/WalletSelector.vue";
import { useWallet } from "@/composables/useWallet";

const props = defineProps({ initialName: { type: String, default: "" } });
const emit = defineEmits(["registered"]);

const chainInfo = inject("chainInfo", { restUrl: "" });

const isRegistering = ref(false);
const step = ref(1);
const chosenName = ref(props.initialName || "");
const valuationAmount = ref("");
const salt = ref("");
const hexHash = ref("");
const commitError = ref("");
const revealError = ref("");
const commitTxHash = ref("");
const revealTxHash = ref("");
const selectedExecutor = ref("");

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
      `${chainInfo.restUrl}/dysonprotocol/nft/v1beta1/class?class_id=nameservice.dys`
    );
    if (!resp.ok) allowedDenoms.value = ["udys"];
    else {
      const json = await resp.json();
      const list = json?.class?.data?.allowed_denoms;
      allowedDenoms.value =
        Array.isArray(list) && list.length ? list : ["udys"];
    }
  } catch {
    allowedDenoms.value = ["udys"];
  }
  await loadDenomMetadata();
  allowedDisplayOptions.value = getDisplayOptions({
    allowedBases: allowedDenoms.value,
  });
  if (!selectedDisplayDenom.value && allowedDisplayOptions.value.length)
    selectedDisplayDenom.value = allowedDisplayOptions.value[0].display;
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

watch([chosenName], () => {
  step.value = 1;
});

onUnmounted(() => {
  if (balanceInterval) clearInterval(balanceInterval);
});

const isValidName = computed(() =>
  String(chosenName.value || "")
    .trim()
    .endsWith(".dys")
);
// Convert entered display amount to base denom/amount based on selected display denom
const requiredBase = computed(() => {
  if (!hasNumericValuation.value) return null;
  try {
    const displayDenom = effectiveDisplayDenom.value || "";
    let amt = String(valuationAmount.value || "0").trim();
    if (amt.startsWith(".")) amt = `0${amt}`;
    return normalizeFromDisplay({ amount: amt, displayDenom });
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
    const annualBase = String(annualFeeBase.value || "0");
    if (annualBase === "0") return "";
    const need = baseToDisplay(annualBase);
    const have = baseToDisplay(availableBalance.value || "0");
    const addr = selectedExecutor.value || getSignerAddress();
    return `Insufficient funds for annual fee. Need ${need} ${denomLabel}, ${addr} has ${have} ${denomLabel}.`;
  }
  if (hasNumericValuation.value && !hasMinAnnual.value) {
    const pct = formatPercent(annualPctStr.value);
    const denomLabel = currentDisplayOpt.value?.display || "";
    const minBase = annualPctRatio.value.num > 0n ? 1n : 0n;
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
const hasExecutor = computed(() => !!selectedExecutor.value);
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
  step.value = Math.max(step.value, 2);
  const res = await sendMsg({ msg, executorAddress: committer, gas: "auto" });
  if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  commitTxHash.value = res.rawSendMsgsResponse?.raw?.tx_response?.txhash || "";
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

  const res = await sendMsg({ msg, executorAddress: committer, gas: "auto" });
  if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  revealTxHash.value = res.rawSendMsgsResponse?.raw?.tx_response?.txhash || "";
  step.value = Math.max(step.value, 4);
  refreshBalance();
  emit("registered", {
    name: String(chosenName.value || ""),
    commitTxHash: String(commitTxHash.value || ""),
    revealTxHash: String(revealTxHash.value || ""),
  });
}

async function register() {
  if (!canRegister.value) return;
  isRegistering.value = true;
  commitError.value = "";
  revealError.value = "";
  try {
    generateSalt();
    await computeHash();
    await commit();
    await reveal();
  } catch (e) {
    const msg = e?.message || String(e);
    if (!commitTxHash.value) commitError.value = msg;
    else revealError.value = msg;
  } finally {
    isRegistering.value = false;
  }
}
</script>
