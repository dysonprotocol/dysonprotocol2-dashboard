<template>
  <div class="space-y-4 w-1/2 mx-auto">
    <div class="text-xl font-semibold">Register Name</div>

    <!-- Step 1: Select name -->
    <div :class="cardClass(1)" class="card card-border bg-base-100">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <h2 class="card-title">1. Select a name</h2>
          <span
            v-if="step > 1 && isValidName && nameAvailable"
            class="badge badge-success badge-outline"
            >Valid</span
          >
        </div>
        <p class="text-sm">Enter your name; .dys is automatically appended.</p>
        <div :class="enabledClass(1)" class="space-y-2">
          <div>
            <div class="join w-full">
              <input
                v-model.trim="nameMain"
                type="text"
                class="join-item input w-full"
                placeholder="alice"
                aria-describedby="name-suffix"
              />
              <div
                id="name-suffix"
                class="input join-item text-base-content/70 w-16"
              >
                .dys
              </div>
            </div>
          </div>
          <div class="">
            <span v-if="nameMain && !isValidName" class="text-error">{{
              nameValidationMessage
            }}</span>
            <span v-else-if="isCheckingName" class="opacity-70"
              >Checking availability…</span
            >
            <span
              v-else-if="nameMain && isValidName && nameAvailable"
              class="text-success"
              >The name
              <span class="text-base-content">{{ chosenName }}</span>
              is available</span
            >
            <span
              v-else-if="nameMain && isValidName && !nameAvailable"
              class="text-error"
              >The name
              <span class="text-base-content">{{ chosenName }}</span> is already
              registered</span
            >
          </div>
        </div>
      </div>
    </div>

    <div
      :class="collapseWrapperClass"
      class="transition-all duration-300 ease-in-out overflow-hidden space-y-4"
    >
      <!-- Step 2: Estimate value -->
      <div :class="cardClass(2)" class="card card-border bg-base-100">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <h2 class="card-title">2. Estimate a value</h2>
            <span
              v-if="step > 2 && canProceedValue"
              class="badge badge-success badge-outline"
              >Ready</span
            >
          </div>
          <p class="text-sm">
            Set the valuation and denom. Annual fee is charged at reveal.
          </p>
          <div :class="enabledClass(2)" class="space-y-2">
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
            <div
              v-if="
                hasNumericValuation && denomAllowed && annualFeeBase !== '0'
              "
              class="text-sm text-base-content/80"
            >
              Annual fee:
              <span class="font-bold"
                >{{ annualFeeDisplay }} {{ currentDisplayOpt?.display }}</span
              >
            </div>
            <div class="text-error text-xs" v-if="validationMessage">
              {{ validationMessage }}
            </div>
            <div v-if="canProceedValue" class="text-success text-sm">
              Your name is valued at
              <span class="font-bold text-base-content"
                >{{ valuationAmount }} {{ currentDisplayOpt?.display }}
              </span>
              and you will pay a fee of
              <span class="font-bold text-base-content">
                {{ annualFeeDisplay }} {{ currentDisplayOpt?.display }}
              </span>
              with the reveal transaction.
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Select wallet -->
      <div :class="cardClass(3)" class="card card-border bg-base-100">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <h2 class="card-title">3. Select a wallet</h2>
            <span
              v-if="step > 3 && selectedExecutor"
              class="badge badge-success badge-outline"
              >Selected</span
            >
          </div>
          <p class="text-sm">
            Choose the wallet that will sign the two commit and reveal
            transactions.
          </p>
          <div :class="enabledClass(3)" class="space-y-2">
            <WalletSelector
              v-model="selectedExecutor"
              :show-locked="false"
              button-class="btn-outline btn-primary"
            />
            <div v-if="hasExecutor" class="text-success text-sm">
              Wallet selected, next generate the commitment hash.
            </div>
            <div class="text-error text-xs" v-if="walletFundsError">
              {{ walletFundsError }}
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: Submit commitment -->
      <div :class="cardClass(4)" class="card card-border bg-base-100">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <h2 class="card-title">4. Submit commitment</h2>
            <span v-if="commitTxHash" class="badge badge-success badge-outline"
              >Submitted</span
            >
          </div>
          <p class="text-sm">
            Submit a commitment to prevent frontrunning. A random salt will be
            used automatically.
          </p>
          <div :class="enabledClass(4)" class="space-y-2">
            <div class="overflow-x-auto">
              <table class="table table-zebra">
                <tbody>
                  <tr>
                    <td class="font-semibold">Name</td>
                    <td class="font-mono">{{ chosenName || "—" }}</td>
                  </tr>
                  <tr>
                    <td class="font-semibold">Salt</td>
                    <td class="font-mono">{{ salt || "—" }}</td>
                  </tr>
                  <tr>
                    <td class="font-semibold">Valuation</td>
                    <td>
                      {{ valuationAmount || "0" }}
                      {{ currentDisplayOpt?.display }}
                    </td>
                  </tr>
                  <tr>
                    <td class="font-semibold">
                      Annual fee (amount paid at reveal)
                    </td>
                    <td>
                      {{ annualFeeDisplay }}
                      {{ currentDisplayOpt?.display }}
                    </td>
                  </tr>
                  <tr>
                    <td class="font-semibold">Commit hash</td>
                    <td class="font-mono">{{ hexHash || "—" }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="card-actions justify-end">
              <button
                class="btn btn-primary"
                :disabled="isRegistering || !canCommit"
                @click="commit"
              >
                Sign commit tx...
              </button>
            </div>
            <div class="text-error text-xs" v-if="commitError">
              {{ commitError }}
            </div>
          </div>
        </div>
      </div>

      <!-- Step 5: Reveal -->
      <div :class="cardClass(5)" class="card card-border bg-base-100">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <h2 class="card-title">5. Reveal</h2>
            <span v-if="revealTxHash" class="badge badge-success badge-outline"
              >Submitted</span
            >
          </div>
          <p class="text-sm">
            Reveal the original data. The annual fee of
            <span class="font-medium">{{ annualFeeDisplay }}</span>
            {{ currentDisplayOpt?.display }} will be charged.
          </p>
          <div :class="enabledClass(5)" class="space-y-2">
            <div class="overflow-x-auto">
              <table class="table table-zebra">
                <tbody>
                  <tr>
                    <td class="font-semibold">Name</td>
                    <td class="font-mono">{{ chosenName || "—" }}</td>
                  </tr>
                  <tr>
                    <td class="font-semibold">Salt</td>
                    <td class="font-mono">{{ salt || "—" }}</td>
                  </tr>
                  <tr>
                    <td class="font-semibold">Valuation</td>
                    <td>
                      {{ valuationAmount || "0" }}
                      {{ currentDisplayOpt?.display }}
                    </td>
                  </tr>
                  <tr>
                    <td class="font-semibold">Annual fee (amount paid now)</td>
                    <td>
                      {{ annualFeeDisplay }}
                      {{ currentDisplayOpt?.display }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="card-actions justify-end">
              <button
                class="btn btn-primary"
                :disabled="!hasExecutor || !isValidName || !salt || !hexHash"
                @click="reveal"
              >
                Sign reveal tx and pay annual fee
              </button>
            </div>
            <div class="text-error text-xs" v-if="revealError">
              {{ revealError }}
            </div>
            <div
              v-if="revealTxHash"
              class="alert alert-success shadow-sm text-sm alert-soft"
            >
              Reveal Tx:
              <router-link :to="`/txs/${revealTxHash}`" class="link">{{
                shortHash(revealTxHash)
              }}</router-link>
            </div>
          </div>
        </div>
      </div>
      <!-- Step 6: Go to name -->
      <div :class="cardClass(6)" class="card card-border bg-base-100">
        <div class="card-body">
          <h2 class="card-title">6. Congratulations!</h2>
          <p class="text-sm">
            Your name is now registered and you can view it details and manage
            it.
          </p>
          <div :class="enabledClass(6)" class="card-actions justify-end">
            <router-link
              :to="`/names/${chosenName}`"
              v-if="step >= 6 && chosenName"
              class="link"
            >
              <button class="btn btn-primary">Go to {{ chosenName }}</button>
            </router-link>
            <button class="btn" v-else disabled>Waiting for reveal…</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed, onMounted, onUnmounted, watch } from "vue";
import WalletSelector from "@/components/shared/WalletSelector.vue";
import { useWallet } from "@/composables/useWallet";
import TxHashDisplay from "@/components/TxHashDisplay.vue";

const props = defineProps({ initialName: { type: String, default: "" } });
const emit = defineEmits(["registered"]);

const chainInfo = inject("chainInfo", { restUrl: "" });

const isRegistering = ref(false);
const step = ref(1);
const nameMain = ref("");
const chosenName = computed(() => {
  const raw = String(nameMain.value || "")
    .trim()
    .toLowerCase();
  if (!raw) return "";
  return `${raw}.dys`;
});
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
  unlockedWallets,
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
    const addr =
      selectedExecutor.value ||
      (isWalletConnected.value ? getSignerAddress() : "");
    if (!addr) {
      availableBalance.value = "0";
      return;
    }
    const resp = await fetch(
      `${chainInfo.restUrl}/cosmos/bank/v1beta1/balances/${addr}?pagination.limit=1000`
    );
    if (!resp.ok) {
      availableBalance.value = "0";
      return;
    }
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
  if (!salt.value) generateSalt();
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

// Do not disable Step 1 while typing. If user had progressed beyond, bounce back only to Step 1.
watch([chosenName], () => {
  if (step.value > 1) step.value = 1;
});

onUnmounted(() => {
  if (balanceInterval) clearInterval(balanceInterval);
  if (nameCheckTimer) clearTimeout(nameCheckTimer);
  if (hashComputeTimer) clearTimeout(hashComputeTimer);
});

const NameRegex = /^[a-z]([-a-z0-9]*[a-z0-9])?\.dys$/;
const isValidName = computed(() => {
  const full = String(chosenName.value || "").trim();
  if (!full.endsWith(".dys")) return false;
  if (!NameRegex.test(full)) return false;
  const main = full.slice(0, -4); // remove .dys
  if (main.includes("dys")) return false;
  return true;
});
const nameValidationMessage = computed(() => {
  const full = String(chosenName.value || "").trim();
  if (!full) return "";
  if (!full.endsWith(".dys")) return "Name must end with .dys";
  if (!/^[a-z]/.test(full)) return "Must start with a letter";
  if (!/^[a-z0-9.-]+$/.test(full.replace(".dys", "")))
    return "Lowercase letters, digits, and dashes only";
  if (!NameRegex.test(full))
    return "Invalid format: lowercase, start with a letter, may contain dashes";
  const main = full.slice(0, -4);
  if (main.includes("dys")) return "Name cannot contain 'dys'";
  return "";
});

// Name availability (debounced)
const isCheckingName = ref(false);
const nameAvailable = ref(false);
const nameError = ref("");
let nameCheckTimer;
let nameCheckToken = 0;

function toMainFromInitial(s) {
  const raw = String(s || "")
    .trim()
    .toLowerCase();
  if (!raw) return "";
  return raw.endsWith(".dys") ? raw.slice(0, -4) : raw;
}

function checkNameAvailabilityImmediate() {
  nameError.value = "";
  nameAvailable.value = false;
  const n = String(chosenName.value || "").trim();
  if (nameCheckTimer) clearTimeout(nameCheckTimer);
  if (!n || !n.endsWith(".dys")) {
    isCheckingName.value = false;
    return;
  }
  isCheckingName.value = true;
  const myToken = ++nameCheckToken;
  (async () => {
    try {
      const url = `${
        chainInfo.restUrl
      }/dysonprotocol/nft/v1beta1/nft?class_id=nameservice.dys&id=${encodeURIComponent(
        n
      )}`;
      const r = await fetch(url);
      if (!r.ok) nameAvailable.value = true;
      else {
        const j = await r.json();
        const id = j?.nft?.id || "";
        nameAvailable.value = id !== n;
      }
    } catch {
      nameAvailable.value = true;
    } finally {
      if (myToken === nameCheckToken) isCheckingName.value = false;
    }
  })();
}

watch(
  () => props.initialName,
  (v) => {
    nameMain.value = toMainFromInitial(v);
    if (nameMain.value) checkNameAvailabilityImmediate();
  },
  { immediate: true }
);
watch(
  () => chosenName.value,
  () => {
    nameError.value = "";
    nameAvailable.value = false;
    const n = String(chosenName.value || "").trim();
    if (nameCheckTimer) clearTimeout(nameCheckTimer);
    if (!n || !n.endsWith(".dys")) {
      isCheckingName.value = false;
      return;
    }
    isCheckingName.value = true;
    const myToken = ++nameCheckToken;
    nameCheckTimer = setTimeout(async () => {
      try {
        const url = `${
          chainInfo.restUrl
        }/dysonprotocol/nft/v1beta1/nft?class_id=nameservice.dys&id=${encodeURIComponent(
          n
        )}`;
        const r = await fetch(url);
        if (!r.ok)
          nameAvailable.value = true; // 404/500 => not found => available
        else {
          const j = await r.json();
          const id = j?.nft?.id || "";
          nameAvailable.value = id !== n;
        }
      } catch {
        nameAvailable.value = true;
      } finally {
        if (myToken === nameCheckToken) isCheckingName.value = false;
      }
    }, 500);
  }
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
  if (hasNumericValuation.value && !hasMinAnnual.value) {
    const pct = formatPercent(annualPctStr.value);
    const denomLabel = currentDisplayOpt.value?.display || "";
    const minBase = annualPctRatio.value.num > 0n ? 1n : 0n;
    const minDisplay = baseToDisplay(minBase.toString());
    return `Annual charge is ${pct}. So the minimum valuation is ${minDisplay} ${denomLabel}.`;
  }
  return "";
});

const walletFundsError = computed(() => {
  try {
    if (!hasExecutor.value || !hasNumericValuation.value) return "";
    const annualBase = String(annualFeeBase.value || "0");
    if (annualBase === "0") return "";
    if (hasFunds.value && annualWithinBalance.value) return "";
    const denomLabel =
      currentDisplayOpt.value?.display || effectiveDisplayDenom.value || "dys";
    const need = baseToDisplay(annualBase);
    const have = baseToDisplay(availableBalance.value || "0");
    const who = selectedExecutor.value ? selectedExecutor.value : "your wallet";
    return `Insufficient funds for annual fee. Need ${need} ${denomLabel}, ${who} has ${have} ${denomLabel}.`;
  } catch {
    return "";
  }
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
const selectedWalletName = computed(() => {
  const w = unlockedWallets.value.find(
    (w) => w.address === selectedExecutor.value
  );
  return w?.name || "wallet";
});
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
  const committer =
    selectedExecutor.value ||
    (isWalletConnected.value ? getSignerAddress() : "");
  if (!committer) throw new Error("No wallet selected.");
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
  if (hexHash.value) step.value = Math.max(step.value, 4);
}

function shortHash(h) {
  if (!h) return "";
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

async function commit() {
  commitError.value = "";
  commitTxHash.value = "";
  const committer =
    selectedExecutor.value ||
    (isWalletConnected.value ? getSignerAddress() : "");
  if (!committer) {
    commitError.value = "No wallet selected.";
    return;
  }
  if (!salt.value) generateSalt();
  if (!hexHash.value) await computeHash();
  const msg = {
    "@type": "/dysonprotocol.nameservice.v1.MsgCommit",
    committer,
    hexhash: hexHash.value,
    valuation: {
      denom: String(requiredBaseDenom.value || "udys"),
      amount: String(requiredBaseAmount.value || "0"),
    },
  };
  const res = await sendMsg({ msg, executorAddress: committer, gas: "auto" });
  if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  const txhash =
    res?.fullResult?.raw?.tx_response?.txhash ||
    res?.rawSendMsgsResponse?.raw?.tx_response?.txhash ||
    res?.txhash ||
    "";
  commitTxHash.value = txhash;
  const code =
    res?.code ??
    res?.fullResult?.code ??
    res?.fullResult?.raw?.tx_response?.code ??
    res?.rawSendMsgsResponse?.raw?.tx_response?.code ??
    -1;
  if (res.success && Number(code) === 0) step.value = 5;
  refreshBalance();
}

async function reveal() {
  revealError.value = "";
  revealTxHash.value = "";
  const committer =
    selectedExecutor.value ||
    (isWalletConnected.value ? getSignerAddress() : "");
  if (!committer) {
    revealError.value = "No wallet selected.";
    return;
  }
  const msg = {
    "@type": "/dysonprotocol.nameservice.v1.MsgReveal",
    committer,
    name: String(chosenName.value),
    salt: String(salt.value),
  };
  step.value = Math.max(step.value, 5);

  const res = await sendMsg({ msg, executorAddress: committer, gas: "auto" });
  if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  revealTxHash.value = res.rawSendMsgsResponse?.raw?.tx_response?.txhash || "";
  step.value = 6;
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

// Step card helpers
function cardClass(n) {
  const base = "border ";
  if (step.value === n) return base + "border-info"; // current = blue
  if (step.value > n) return base + "border-success"; // previous = green
  return base + "border-base-300"; // future = gray
}
function enabledClass(n) {
  // Steps 1-4 are always enabled until commit is submitted
  if (n <= 4) return commitTxHash.value ? "opacity-60 pointer-events-none" : "";
  // For steps 5+, keep original step-based gating
  if (step.value === n) return "";
  if (step.value > n) return "opacity-60 pointer-events-none";
  return "opacity-60 pointer-events-none";
}

const canProceedValue = computed(
  () => hasNumericValuation.value && denomAllowed.value && hasMinAnnual.value
);

// Auto-recompute commit hash when prerequisites change
let hashComputeTimer;
let hashComputeToken = 0;
watch([chosenName, () => selectedExecutor.value, () => salt.value], () => {
  if (hashComputeTimer) clearTimeout(hashComputeTimer);
  // Only compute when we have a wallet, a valid name, and a salt
  if (!hasExecutor.value || !isValidName.value || !salt.value) {
    return;
  }
  const myToken = ++hashComputeToken;
  hashComputeTimer = setTimeout(async () => {
    if (!hasExecutor.value || !isValidName.value || !salt.value) return;
    await computeHash();
    // token is informational in case of future concurrency needs
    if (myToken !== hashComputeToken) return;
  }, 300);
});

const canCommit = computed(() => {
  return (
    isValidName.value &&
    hasExecutor.value &&
    hasNumericValuation.value &&
    denomAllowed.value &&
    hasMinAnnual.value
  );
});

// Transition collapse for steps when name is empty (smooth grow/shrink)
const hasName = computed(() => !!nameMain.value.trim());
const collapseWrapperClass = computed(() =>
  hasName.value ? "max-h-[4000px] opacity-100" : "max-h-0 opacity-0"
);
</script>
