<template>
  <div class="mx-auto p-4 space-y-4 h-full min-h-0 overflow-y-scroll">
    <h1 class="text-2xl font-semibold">Name: {{ routeName }}</h1>

    <div v-if="isLoading" class="text-base-content/70">Loading…</div>
    <div v-else-if="error" class="text-error">{{ error }}</div>

    <div v-else>
      <div v-if="!nft" class="space-y-3">
        <div class="alert alert-info alert-soft">
          <h2 class="card-title">This name is available</h2>
        </div>
        <div class="card bg-base-200 shadow">
          <div class="card-body gap-3">
            <RegisterName :initialName="routeName" @registered="onRegistered" />
          </div>
        </div>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="card bg-base-200 shadow">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <h2 class="card-title">Name Detail</h2>
            </div>
            <table class="table">
              <tbody>
                <tr>
                  <th class="w-48">Owner</th>
                  <td class="font-mono break-all">
                    <AddressDisplay :address="ownerAddress" />
                  </td>
                </tr>
                <tr>
                  <th class="w-48">Class ID</th>
                  <td class="font-mono">
                    <router-link
                      :to="`/names/${encodeURIComponent(
                        routeName
                      )}/nfts/${encodeURIComponent(nft.class_id)}`"
                      class="link"
                    >
                      {{ nft.class_id }}
                    </router-link>
                  </td>
                </tr>
                <tr>
                  <th>ID</th>
                  <td class="font-mono">
                    <router-link
                      :to="`/names/${encodeURIComponent(nft.id)}`"
                      class="link"
                    >
                      {{ nft.id }}
                    </router-link>
                  </td>
                </tr>
                <tr>
                  <th>Destination (URI)</th>
                  <td class="font-mono break-all">
                    <AddressDisplay :address="nft.uri" />
                  </td>
                </tr>
                <tr>
                  <th>Resolved Address</th>
                  <td class="font-mono break-all">
                    <AddressDisplay :address="resolvedAddress" />
                  </td>
                </tr>
                <tr>
                  <th>Valuation</th>
                  <td>
                    <span v-if="valuationDisplay.label">
                      {{ valuationDisplay.amount }} {{ valuationDisplay.label }}
                      <span class="opacity-70"
                        >(base: {{ nft.data?.valuation?.amount }}
                        {{ nft.data?.valuation?.denom }})</span
                      >
                    </span>
                    <span v-else>—</span>
                  </td>
                </tr>
                <tr>
                  <th>Valuation Expiry</th>
                  <td>{{ formatIso(nft.data?.valuation_expiry) }}</td>
                </tr>
                <tr>
                  <th>Current Bidder</th>
                  <td class="font-mono break-all">
                    {{ nft.data?.current_bidder || "" }}
                  </td>
                </tr>
                <tr>
                  <th>Current Bid</th>
                  <td>
                    <span v-if="bidDisplay.label">
                      {{ bidDisplay.amount }} {{ bidDisplay.label }}
                      <span class="opacity-70"
                        >(base: {{ nft.data?.current_bid?.amount }}
                        {{ nft.data?.current_bid?.denom }})</span
                      >
                    </span>
                    <span v-else>—</span>
                  </td>
                </tr>
                <tr>
                  <th>Bid Timestamp</th>
                  <td>{{ formatIso(nft.data?.bid_timestamp) }}</td>
                </tr>
                <tr>
                  <th>Metadata</th>
                  <td class="break-words whitespace-pre-wrap">
                    {{ nft.data?.metadata || "" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card bg-base-200 shadow">
          <div class="card-body gap-3">
            <div class="flex items-center justify-between">
              <h2 class="card-title">Set Destination</h2>
            </div>
            <div class="text-xs opacity-70 mb-1">
              Destination can be a bech32 address or another .dys name.
            </div>
            <input
              v-model.trim="destination"
              class="input input-bordered w-full font-mono"
              placeholder="new destination (address or name)"
              :disabled="isSettingDest"
            />
            <div v-if="setDestError" class="text-error text-sm">
              {{ setDestError }}
            </div>
            <button
              class="btn btn-primary"
              :disabled="isSettingDest || !canSetDestination"
              @click="setDestination"
            >
              Set Destination
            </button>
            <div class="flex items-center justify-between mt-2">
              <h2 class="card-title">Set Metadata</h2>
            </div>
            <div class="text-xs opacity-70 mb-1">
              Only the owner can set metadata. This is an arbitrary string.
            </div>
            <textarea
              v-model.trim="metadataValue"
              class="textarea textarea-bordered w-full"
              placeholder="metadata"
              :disabled="isSettingMetadata"
              rows="3"
            ></textarea>
            <div v-if="setMetadataError" class="text-error text-sm">
              {{ setMetadataError }}
            </div>
            <button
              class="btn btn-primary"
              :disabled="isSettingMetadata || !ownerAddress"
              @click="setNameMetadata"
            >
              Save Metadata
            </button>
          </div>
        </div>

        <div class="card bg-base-200 shadow">
          <div class="card-body gap-3">
            <div class="flex items-center justify-between">
              <h2 class="card-title">Denoms</h2>
            </div>

            <div class="border rounded p-3 bg-base-100">
              <div class="font-medium mb-2">Mint coin(s)</div>
              <div class="text-xs opacity-70 mb-2">
                Destination:
                <AddressDisplay :address="resolvedAddress" />
              </div>
              <form class="grid grid-cols-1" @submit.prevent="mintCoins">
                <div class="space-y-2">
                  <label class="input w-full">
                    <span class="label">Display Amount </span>
                    <input
                      :value="mintAmountDisplay"
                      @focus="isEditingDisplay = true"
                      @blur="
                        isEditingDisplay = false;
                        mintAmountDisplay = normalizeDisplay(mintAmountDisplay);
                      "
                      @input="onDisplayInput"
                      class=""
                      placeholder="amount (display)"
                      label="amount (display)"
                      type="number"
                      step="0.000001"
                      :disabled="denomBusy === 'mint'"
                    />
                  </label>
                  <label class="input w-full">
                    <span class="label">Display Denom</span>
                    <input
                      class="input-ghost"
                      :value="mintDisplayLabel"
                      readonly
                    />
                  </label>

                  <ul class="list-disc list-inside">
                    <li class="text-xs opacity-70 mb-2">
                      Display Denom:
                      <span class="font-mono">{{ mintDisplayLabel }}</span>
                    </li>
                    <li class="text-xs opacity-70 mb-2">
                      Display amount:
                      <span class="font-mono">{{
                        mintAmountDisplayNormalized
                      }}</span>
                    </li>
                    <li class="text-xs opacity-70 mb-2">
                      Decimal places:
                      <span v-if="mintDenom === routeName" class="font-mono"
                        >6</span
                      >
                      <span v-else class="font-mono">0</span>
                    </li>
                    <li class="text-xs opacity-70 mb-2">
                      Base Denom:
                      <span class="font-mono">{{ mintDenom }}</span>
                    </li>
                    <li class="text-xs opacity-70 mb-2">
                      Base amount:
                      <span class="font-mono">{{ mintAmount }}</span>
                    </li>
                    <li
                      v-if="Number(estimatedFeeUdys || 0) > 0"
                      class="text-xs opacity-70 mb-2"
                    >
                      Fee:
                      <span class="font-mono">{{
                        estimatedFeeDisplay.amount
                      }}</span>
                      {{ estimatedFeeDisplay.label }}
                      <span class="opacity-70">
                        ({{ estimatedFeeUdys }} udys)
                      </span>
                    </li>
                    <li
                      v-if="Number(mintAmount || 0) > 0"
                      class="text-xs opacity-70 mb-2"
                    >
                      <span class="font-mono">{{ mintAmountDisplay }}</span>
                      {{ mintDisplayLabel }}
                      ==
                      <span class="font-mono">{{ mintAmount }}</span>
                      {{ mintDenom }}
                    </li>
                  </ul>

                  <p class="flex items-center gap-2 my-4">
                    <label
                      class="cursor-pointer wrap-anywhere overflow-hidden"
                      for="confirmMintChecked"
                    >
                      <input
                        v-model="confirmMintChecked"
                        id="confirmMintChecked"
                        type="checkbox"
                        class="checkbox mr-2"
                      />

                      I understand that minting
                      <span class="font-mono">{{ mintAmountDisplay }}</span>
                      {{ mintDisplayLabel }} will cost
                      {{ estimatedFeeDisplay.amount }}
                      {{ estimatedFeeDisplay.label }} and is non-refundable.
                    </label>
                  </p>

                  <button
                    class="btn btn-primary w-full mt-2"
                    :disabled="
                      denomBusy === 'mint' || !canMint || !confirmMintChecked
                    "
                  >
                    mint
                  </button>

                  <div
                    v-if="denomErrMint"
                    class="join-item alert alert-error alert-soft mt-2"
                  >
                    {{ denomErrMint }}
                  </div>
                </div>
              </form>
            </div>

            <div>
              <div v-if="isLoadingDenoms" class="text-base-content/70">
                Loading…
              </div>
              <div v-else-if="denomsError" class="text-error">
                {{ denomsError }}
              </div>
              <div v-else>
                <div v-if="denoms.length === 0" class="text-base-content/70">
                  No denoms.
                </div>
                <ul v-else class="menu bg-base-100 rounded">
                  <li v-for="d in denoms" :key="d">
                    <router-link
                      :to="`/names/${encodeURIComponent(
                        routeName
                      )}/denoms/${encodeURIComponent(d)}`"
                      class="font-mono"
                      >{{ d }}</router-link
                    >
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-base-200 shadow">
          <div class="card-body gap-3">
            <div class="flex items-center justify-between">
              <h2 class="card-title">NFT Classes</h2>
            </div>

            <div class="border rounded p-3 bg-base-100">
              <div class="font-medium mb-2">Create NFT Class</div>
              <div class="text-xs opacity-70 mb-2">
                {{ routeName }} is managed by destination:
                <span class="font-mono">{{ resolvedAddress }}</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  v-model.trim="classForm.classId"
                  class="input input-bordered w-full"
                  :placeholder="`class id (e.g. ${routeName}/foo)`"
                  :disabled="isSavingClass"
                />
                <input
                  v-model.trim="classForm.name"
                  class="input input-bordered w-full"
                  placeholder="name (optional)"
                  :disabled="isSavingClass"
                />
                <input
                  v-model.trim="classForm.symbol"
                  class="input input-bordered w-full"
                  placeholder="symbol (optional)"
                  :disabled="isSavingClass"
                />
                <input
                  v-model.trim="classForm.uri"
                  class="input input-bordered w-full"
                  placeholder="uri (optional)"
                  :disabled="isSavingClass"
                />
              </div>
              <textarea
                v-model.trim="classForm.description"
                class="textarea textarea-bordered w-full mt-2"
                placeholder="description (optional)"
                :disabled="isSavingClass"
              ></textarea>
              <div v-if="classSaveError" class="text-error text-sm mt-1">
                {{ classSaveError }}
              </div>
              <button
                class="btn btn-primary mt-2"
                :disabled="!canSaveClass || isSavingClass"
                @click="saveClass"
              >
                Create
              </button>
            </div>
            <div v-if="isLoadingClasses" class="text-base-content/70">
              Loading…
            </div>
            <div v-else-if="classesError" class="text-error">
              {{ classesError }}
            </div>
            <div v-else>
              <div v-if="classIds.length === 0" class="text-base-content/70">
                No classes.
              </div>
              <div v-else class="overflow-x-auto">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Class ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="cid in classIds" :key="cid">
                      <td class="font-mono">
                        <router-link
                          :to="`/names/${encodeURIComponent(
                            routeName
                          )}/nfts/${encodeURIComponent(cid)}`"
                          class="link"
                          >{{ cid }}</router-link
                        >
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, watchEffect, watch } from "vue";
import { useRoute } from "vue-router";
import AddressDisplay from "@/components/AddressDisplay.vue";
import { useWallet } from "@/composables/useWallet";
import RegisterName from "@/components/nameservice/RegisterName.vue";
const route = useRoute();
const routeName = computed(() => String(route.params.name || ""));

// Chain info provided by App.vue
const chainInfo = inject("chainInfo", { restUrl: "" });

const isLoading = ref(false);
const error = ref("");
const resolvedAddress = ref("");
const nft = ref(null);
const ownerAddress = ref("");
const metadataValue = ref("");
const isSettingMetadata = ref(false);
const setMetadataError = ref("");

const { loadDenomMetadata, getDisplayOptions, unlockedWallets, sendMsg } =
  useWallet();

function getDisplayInfoForBase(baseDenom) {
  const opts = getDisplayOptions({ allowedBases: [String(baseDenom || "")] });
  const first = Array.isArray(opts) && opts.length ? opts[0] : null;
  return {
    display: first?.display || String(baseDenom || ""),
    exponent: Number(first?.exponent || 0),
  };
}

function formatIso(s) {
  const v = String(s || "");
  if (!v || v === "0001-01-01T00:00:00Z") return "—";
  try {
    return new Date(v).toISOString().replace(".000Z", "Z");
  } catch {
    return v;
  }
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

function displayToBaseFor(amountDisplay, baseDenom) {
  const { exponent } = getDisplayInfoForBase(baseDenom);
  const s = String(amountDisplay || "").replace(/[^\d.]/g, "");
  if (!s) return "0";
  const [intRaw, decRaw = ""] = s.split(".");
  const intPart = String(intRaw || "0").replace(/^0+/, "") || "0";
  const exp = Number(exponent || 0);
  if (exp <= 0) return (intPart || "0").replace(/^0+/, "") || "0";
  const decPart = String(decRaw).slice(0, exp);
  const padded = decPart + "0".repeat(Math.max(0, exp - decPart.length));
  const base = (intPart || "0") + padded;
  return base.replace(/^0+/, "") || "0";
}

// Mint form: denom may not exist yet. Assume exponent 6 for display/base conversions.
function baseToDisplayAssuming6(amountBase) {
  const s = String(amountBase || "0");
  const exp = 6;

  if (s.length <= exp) {
    const pad = "0".repeat(exp - s.length);
    return `0.${pad}${s}`;
  }
  const i = s.length - exp;
  return `${s.slice(0, i)}.${s.slice(i)}`.replace(/\.0+$/, "");
}

function displayToBaseAssuming6(amountDisplay) {
  const s = String(amountDisplay || "").replace(/[^\d.]/g, "");
  if (!s) return "0";
  const [intRaw, decRaw = ""] = s.split(".");
  const intPart = String(intRaw || "0").replace(/^0+/, "") || "0";
  const exp = 6;
  if (exp <= 0) return (intPart || "0").replace(/^0+/, "") || "0";
  const decPart = String(decRaw).slice(0, exp);
  const padded = decPart + "0".repeat(Math.max(0, exp - decPart.length));
  const base = (intPart || "0") + padded;
  return base.replace(/^0+/, "") || "0";
}

const valuationDisplay = computed(() => {
  const coin = nft.value?.data?.valuation || { amount: "0", denom: "" };
  const denom = String(coin?.denom || "");
  if (!denom) return { amount: "0", label: "" };
  return {
    amount: baseToDisplayFor(coin.amount, denom),
    label: getDisplayInfoForBase(denom).display,
  };
});

const bidDisplay = computed(() => {
  const coin = nft.value?.data?.current_bid || { amount: "0", denom: "" };
  const denom = String(coin?.denom || "");
  if (!denom) return { amount: "0", label: "" };
  return {
    amount: baseToDisplayFor(coin.amount, denom),
    label: getDisplayInfoForBase(denom).display,
  };
});

async function fetchResolveName(name) {
  if (!name) return;
  isLoading.value = true;
  error.value = "";
  resolvedAddress.value = "";
  nft.value = null;
  ownerAddress.value = "";
  try {
    const url = `${
      chainInfo.restUrl
    }/dysonprotocol/nameservice/v1/resolve_name/${encodeURIComponent(name)}`;
    const resp = await fetch(url);
    if (resp.ok) {
      const json = await resp.json();
      resolvedAddress.value = json?.address || "";
    } else if (resp.status === 400 || resp.status === 404) {
      // Treat bad request / not found as unregistered name
      resolvedAddress.value = "";
    } else {
      throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    }
    // Fetch NFT detail in parallel
    const nftUrl = `${
      chainInfo.restUrl
    }/dysonprotocol/nft/v1beta1/nft?class_id=nameservice.dys&id=${encodeURIComponent(
      name
    )}`;
    const nftResp = await fetch(nftUrl);
    if (nftResp.ok) {
      const nftJson = await nftResp.json();
      nft.value = nftJson?.nft || null;
    } else {
      nft.value = null; // treat missing NFT as unregistered name
    }
    destination.value = nft.value?.uri || "";
    metadataValue.value = nft.value?.data?.metadata || "";

    const ownerUrl = `${
      chainInfo.restUrl
    }/dysonprotocol/nft/v1beta1/owner?class_id=nameservice.dys&id=${encodeURIComponent(
      name
    )}`;
    const ownerResp = await fetch(ownerUrl);
    if (ownerResp.ok) {
      const ownerJson = await ownerResp.json();
      ownerAddress.value = ownerJson?.owner || "";
    } else {
      ownerAddress.value = "";
    }
  } catch (e) {
    error.value = e?.message || "Failed to resolve name";
  } finally {
    isLoading.value = false;
  }
}

async function reload() {
  await loadDenomMetadata();
  await loadParams();
  await fetchResolveName(routeName.value);
  await loadClasses();
  await loadDenoms();
  if (!mintDenom.value) mintDenom.value = routeName.value;
}

watchEffect(() => reload());

function onRegistered() {
  reload();
}

// ---- Set Name Metadata ----
async function setNameMetadata() {
  isSettingMetadata.value = true;
  setMetadataError.value = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgSetNameMetadata",
      owner: String(ownerAddress.value || ""),
      name: String(routeName.value || ""),
      metadata: String(metadataValue.value || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: ownerAddress.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    await reload();
  } catch (e) {
    setMetadataError.value = e?.message || "Failed to set metadata";
  } finally {
    isSettingMetadata.value = false;
  }
}

// ---- NFT classes by name ----
const isLoadingClasses = ref(false);
const classesError = ref("");
const classIds = ref([]);
async function loadClasses() {
  isLoadingClasses.value = true;
  classesError.value = "";
  classIds.value = [];
  try {
    const url = `${
      chainInfo.restUrl
    }/dysonprotocol/nameservice/v1/nftclasses_by_name/${encodeURIComponent(
      routeName.value
    )}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    const json = await resp.json();
    classIds.value = Array.isArray(json?.class_ids) ? json.class_ids : [];
  } catch (e) {
    classesError.value = e?.message || "Failed to load classes";
  } finally {
    isLoadingClasses.value = false;
  }
}

const isSavingClass = ref(false);
const classSaveError = ref("");
const classForm = ref({
  classId: "",
  name: "",
  symbol: "",
  description: "",
  uri: "",
  uriHash: "",
});
watchEffect(() => {
  classForm.value.classId = routeName.value || "";
});
const isDestUnlocked = computed(() =>
  Array.isArray(unlockedWallets.value)
    ? unlockedWallets.value.some(
        (w) => String(w?.address || "") === resolvedAddress.value
      )
    : false
);
const canSaveClass = computed(() => {
  const id = String(classForm.value.classId || "");
  const root = String(routeName.value || "");
  if (!id || !root) return false;
  return id === root || id.startsWith(`${root}/`);
});
async function saveClass() {
  if (!canSaveClass.value) return;
  isSavingClass.value = true;
  classSaveError.value = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgSaveClass",
      name_destination: String(resolvedAddress.value || ""),
      class_id: String(classForm.value.classId || ""),
      name: String(classForm.value.name || ""),
      symbol: String(classForm.value.symbol || ""),
      description: String(classForm.value.description || ""),
      uri: String(classForm.value.uri || ""),
      uri_hash: String(classForm.value.uriHash || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: resolvedAddress.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    classForm.value = {
      classId: routeName.value || "",
      name: "",
      symbol: "",
      description: "",
      uri: "",
      uriHash: "",
    };
    await loadClasses();
  } catch (e) {
    classSaveError.value = e?.message || "Failed to create class";
  } finally {
    isSavingClass.value = false;
  }
}

// ---- Set Destination ----
const isSettingDest = ref(false);
const setDestError = ref("");
const destination = ref("");
const canSetDestination = computed(() => Boolean(destination.value));
async function setDestination() {
  if (!canSetDestination.value) return;
  isSettingDest.value = true;
  setDestError.value = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgSetDestination",
      owner: String(ownerAddress.value || ""),
      name: String(routeName.value || ""),
      destination: String(destination.value || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: ownerAddress.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    await reload();
  } catch (e) {
    setDestError.value = e?.message || "Failed to set destination";
  } finally {
    isSettingDest.value = false;
  }
}

// ---- Denoms by name ----
const denoms = ref([]);
const isLoadingDenoms = ref(false);
const denomsError = ref("");
const mintDenom = ref("");
const mintAmount = ref("");
const mintAmountDisplay = ref("");
const mintDisplayLabel = computed(() =>
  String(routeName.value).replace(/\.dys$/, "")
);
const mintAmountDisplayNormalized = computed(() =>
  baseToDisplayAssuming6(mintAmount.value)
);
const denomBusy = ref("");
const denomErrMint = ref("");
const confirmMintChecked = ref(false);
const canMint = computed(
  () => Boolean(mintDenom.value) && Boolean(mintAmount.value)
);

const isEditingDisplay = ref(false);

watch([mintAmount, mintDenom], () => {
  if (isEditingDisplay.value) return;
  mintAmountDisplay.value = baseToDisplayAssuming6(mintAmount.value);
  confirmMintChecked.value = false;
});

watch(mintAmountDisplay, () => {
  mintAmount.value = displayToBaseAssuming6(mintAmountDisplay.value);
  // any change to amount should re-require confirmation
  confirmMintChecked.value = false;
});

function onDisplayInput(e) {
  let v = String(e?.target?.value ?? "");
  // keep digits and dots only
  v = v.replace(/[^\d.]/g, "");
  // keep only first dot
  const firstDot = v.indexOf(".");
  if (firstDot !== -1) {
    const before = v.slice(0, firstDot + 1);
    const after = v
      .slice(firstDot + 1)
      .replace(/\./g, "") // remove extra dots
      .slice(0, 6); // max 6 decimals
    v = before + after;
  }
  // normalize leading zeros for integers (but allow "0." and empty)
  if (v && v !== "." && !v.startsWith("0.")) {
    // collapse multiple leading zeros before a non-zero digit
    v = v.replace(/^0+(\d)/, "$1");
  }
  mintAmountDisplay.value = v;
  // changing amount invalidates confirmation
  confirmMintChecked.value = false;
}

function normalizeDisplay(s) {
  let v = String(s || "");
  if (v === ".") v = "0";
  if (v.endsWith(".")) v = v.slice(0, -1);
  // enforce max 6 decimals
  if (v.includes(".")) {
    const [i, d = ""] = v.split(".");
    v = i + "." + d.slice(0, 6);
  }
  // remove trailing zeros after decimal
  if (v.includes(".")) v = v.replace(/\.0+$/, "").replace(/\.$/, "");
  // normalize integer like "000" -> "0"
  if (v && !v.includes(".")) v = String(Number(v));
  return v;
}

// Nameservice params (mint fee per base unit)
const mintFeePerUnitUdys = ref("-");
async function loadParams() {
  try {
    const r = await fetch(
      `${chainInfo.restUrl}/dysonprotocol/nameservice/v1/params`
    );
    if (!r.ok) return;
    const j = await r.json();
    mintFeePerUnitUdys.value = String(j?.params?.mint_fee_per_coin || "-");
  } catch {}
}

const estimatedFeeUdys = computed(() => {
  const per = Number(mintFeePerUnitUdys.value || 0);
  const amt = Number(mintAmount.value || 0);
  if (!(per > 0 && amt > 0)) return "0";
  return String(per * amt);
});

const estimatedFeeDisplay = computed(() => {
  // For now udys base-to-display is 10^-6 -> display denom "dys2"
  const base = String(estimatedFeeUdys.value || "0");
  // convert udys (1e-6) to dys2 display
  const s = base.replace(/\D/g, "");
  const exp = 6;
  if (s.length <= exp) {
    const pad = "0".repeat(exp - s.length);
    return { amount: `0.${pad}${s}`.replace(/\.0+$/, ""), label: "dys2" };
  }
  const i = s.length - exp;
  return {
    amount: `${s.slice(0, i)}.${s.slice(i)}`.replace(/\.0+$/, ""),
    label: "dys2",
  };
});

async function loadDenoms() {
  isLoadingDenoms.value = true;
  denomsError.value = "";
  denoms.value = [];
  try {
    const url = `${
      chainInfo.restUrl
    }/dysonprotocol/nameservice/v1/denoms_by_name/${encodeURIComponent(
      routeName.value
    )}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    denoms.value = (Array.isArray(j?.denoms) ? j.denoms : [])
      .map((it) => (typeof it === "string" ? it : String(it?.denom || "")))
      .filter(Boolean);
  } catch (e) {
    denomsError.value = e?.message || "Failed to load denoms";
  } finally {
    isLoadingDenoms.value = false;
  }
}

async function mintCoins() {
  denomBusy.value = "mint";
  denomErrMint.value = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgMintCoins",
      name_destination: String(resolvedAddress.value || ""),
      amount: [
        {
          denom: String(mintDenom.value || ""),
          amount: String(mintAmount.value || "0"),
        },
      ],
    };
    const res = await sendMsg({
      msg,
      executorAddress: resolvedAddress.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    await loadDenoms();
  } catch (e) {
    denomErrMint.value = e?.message || "Failed to mint";
  } finally {
    denomBusy.value = "";
  }
}
</script>
