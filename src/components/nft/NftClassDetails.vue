<template>
  <div>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h2 class="text-xl font-medium">
          Class: <span class="font-mono">{{ classId }}</span>
        </h2>
      </div>
    </div>
    <div v-if="isLoading" class="text-base-content/70 mt-2">Loading…</div>
    <div v-else-if="error" class="text-error mt-2">{{ error }}</div>
    <div v-else class="mt-2">
      <table class="table">
        <tbody>
          <tr>
            <th class="w-48">Class</th>
            <td class="font-mono break-all">
              {{ classMeta?.id || classId }}
            </td>
          </tr>
          <tr>
            <th>Name</th>
            <td>{{ classMeta?.name || "" }}</td>
          </tr>
          <tr>
            <th>Symbol</th>
            <td>{{ classMeta?.symbol || "" }}</td>
          </tr>
          <tr>
            <th>Description</th>
            <td class="break-words whitespace-pre-wrap">
              {{ classMeta?.description || "" }}
            </td>
          </tr>
          <tr>
            <th>URI</th>
            <td class="font-mono break-all">{{ classMeta?.uri || "" }}</td>
          </tr>
          <tr>
            <th>Supply</th>
            <td class="font-mono">{{ classSupply }}</td>
          </tr>
          <tr>
            <th>Always listed</th>
            <td>
              <div
                v-if="classMeta?.data?.always_listed"
                class="badge badge-success"
              >
                always listed
              </div>
              <span v-else>—</span>
            </td>
          </tr>
          <tr>
            <th>Allowed denoms</th>
            <td>
              {{ (classMeta?.data?.allowed_denoms || []).join(", ") || "" }}
            </td>
          </tr>
          <tr>
            <th>Valuation fee pct</th>
            <td>{{ classMeta?.data?.valuation_fee_pct || "" }}</td>
          </tr>
          <tr>
            <th>Valuation period</th>
            <td>{{ classMeta?.data?.valuation_period || "" }}</td>
          </tr>
          <tr>
            <th>Bid timeout</th>
            <td>{{ classMeta?.data?.bid_timeout || "" }}</td>
          </tr>
          <tr>
            <th>Min bid % increase</th>
            <td>
              {{ classMeta?.data?.minimum_bid_percent_increase || "" }}
            </td>
          </tr>
          <tr>
            <th>Reject bid valuation fee %</th>
            <td>
              {{ classMeta?.data?.reject_bid_valuation_fee_percent || "" }}
            </td>
          </tr>
          <tr>
            <th>Extra data</th>
            <td class="break-words whitespace-pre-wrap">
              {{ classMeta?.data?.extra_data || "" }}
            </td>
          </tr>
        </tbody>
      </table>
      <div class="mt-4 grid grid-cols-1 gap-3">
        <fieldset class="fieldset bg-base-200 border-base-300 border p-4">
          <legend class="fieldset-legend">Class settings</legend>
          <div class="text-sm opacity-70 mb-2">
            Destination: <span class="font-mono">{{ nameDestination }}</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <!-- Always listed -->
            <form @submit.prevent="saveAlwaysListed">
              <fieldset
                class="fieldset bg-base-200 border-base-300 border p-3 h-full"
              >
                <legend class="fieldset-legend">Always listed</legend>
                <div class="flex items-center justify-between gap-2">
                  <label class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      class="toggle"
                      v-model="alwaysListed"
                      :disabled="isBusy"
                    />
                    <span>Always listed</span>
                  </label>
                  <button class="btn btn-primary btn-xs" :disabled="isBusy">
                    save
                  </button>
                </div>
                <div
                  v-if="formErr.alwaysListed"
                  class="alert alert-soft alert-error mt-2 wrap-anywhere"
                >
                  {{ formErr.alwaysListed }}
                </div>
              </fieldset>
            </form>

            <!-- Allowed denoms -->
            <form @submit.prevent="saveAllowedDenoms">
              <fieldset
                class="fieldset bg-base-200 border-base-300 border p-3 h-full"
              >
                <legend class="fieldset-legend">Allowed denoms</legend>
                <div class="flex items-center gap-2">
                  <input
                    v-model.trim="allowedDenomsInput"
                    class="input input-bordered w-full"
                    placeholder="comma-separated base denoms (e.g. udys,uatom)"
                    :disabled="isBusy"
                  />
                  <button class="btn btn-primary btn-xs" :disabled="isBusy">
                    save
                  </button>
                </div>
                <div
                  v-if="formErr.allowedDenoms"
                  class="alert alert-soft alert-error mt-2 wrap-anywhere"
                >
                  {{ formErr.allowedDenoms }}
                </div>
              </fieldset>
            </form>

            <!-- Valuation fee pct -->
            <form @submit.prevent="saveValuationFeePct">
              <fieldset
                class="fieldset bg-base-200 border-base-300 border p-3 h-full"
              >
                <legend class="fieldset-legend">Valuation fee pct</legend>
                <div class="flex items-center gap-2">
                  <input
                    v-model.trim="valuationFeePct"
                    class="input input-bordered w-full"
                    placeholder="e.g. 0.025"
                    :disabled="isBusy"
                  />
                  <button class="btn btn-primary btn-xs" :disabled="isBusy">
                    save
                  </button>
                </div>
                <div
                  v-if="formErr.valuationFeePct"
                  class="alert alert-soft alert-error mt-2 wrap-anywhere"
                >
                  {{ formErr.valuationFeePct }}
                </div>
              </fieldset>
            </form>

            <!-- Valuation period -->
            <form @submit.prevent="saveValuationPeriod">
              <fieldset
                class="fieldset bg-base-200 border-base-300 border p-3 h-full"
              >
                <legend class="fieldset-legend">Valuation period</legend>
                <div class="flex items-center gap-2">
                  <input
                    v-model.trim="valuationPeriod"
                    class="input input-bordered w-full"
                    placeholder="e.g. 24h"
                    :disabled="isBusy"
                  />
                  <button class="btn btn-primary btn-xs" :disabled="isBusy">
                    save
                  </button>
                </div>
                <div class="flex flex-wrap gap-1 mt-2">
                  <button
                    type="button"
                    class="btn btn-xs btn-ghost"
                    :disabled="isBusy"
                    @click="valuationPeriod = '1h'"
                  >
                    1h
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-ghost"
                    :disabled="isBusy"
                    @click="valuationPeriod = '12h'"
                  >
                    12h
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-ghost"
                    :disabled="isBusy"
                    @click="valuationPeriod = '168h'"
                  >
                    7d
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-ghost"
                    :disabled="isBusy"
                    @click="valuationPeriod = '720h'"
                  >
                    30d
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-ghost"
                    :disabled="isBusy"
                    @click="valuationPeriod = '8760h'"
                  >
                    365d
                  </button>
                </div>
                <div
                  v-if="formErr.valuationPeriod"
                  class="alert alert-soft alert-error mt-2 wrap-anywhere"
                >
                  {{ formErr.valuationPeriod }}
                </div>
              </fieldset>
            </form>

            <!-- Bid timeout -->
            <form @submit.prevent="saveBidTimeout">
              <fieldset
                class="fieldset bg-base-200 border-base-300 border p-3 h-full"
              >
                <legend class="fieldset-legend">Bid timeout</legend>
                <div class="flex items-center gap-2">
                  <input
                    v-model.trim="bidTimeout"
                    class="input input-bordered w-full"
                    placeholder="e.g. 600s"
                    :disabled="isBusy"
                  />
                  <button class="btn btn-primary btn-xs" :disabled="isBusy">
                    save
                  </button>
                </div>
                <div
                  v-if="formErr.bidTimeout"
                  class="alert alert-soft alert-error mt-2 wrap-anywhere"
                >
                  {{ formErr.bidTimeout }}
                </div>
              </fieldset>
            </form>

            <!-- Min bid % increase -->
            <form @submit.prevent="saveMinBidPercentIncrease">
              <fieldset
                class="fieldset bg-base-200 border-base-300 border p-3 h-full"
              >
                <legend class="fieldset-legend">Min bid % increase</legend>
                <div class="flex items-center gap-2">
                  <input
                    v-model.trim="minBidPctInc"
                    class="input input-bordered w-full"
                    placeholder="e.g. 0.05"
                    :disabled="isBusy"
                  />
                  <button class="btn btn-primary btn-xs" :disabled="isBusy">
                    save
                  </button>
                </div>
                <div
                  v-if="formErr.minBidPctInc"
                  class="alert alert-soft alert-error mt-2 wrap-anywhere"
                >
                  {{ formErr.minBidPctInc }}
                </div>
              </fieldset>
            </form>

            <!-- Reject bid valuation fee % -->
            <form @submit.prevent="saveRejectBidValuationFeePct">
              <fieldset
                class="fieldset bg-base-200 border-base-300 border p-3 h-full"
              >
                <legend class="fieldset-legend">
                  Reject bid valuation fee %
                </legend>
                <div class="flex items-center gap-2">
                  <input
                    v-model.trim="rejectBidValuationFeePct"
                    class="input input-bordered w-full"
                    placeholder="e.g. 0.01"
                    :disabled="isBusy"
                  />
                  <button class="btn btn-primary btn-xs" :disabled="isBusy">
                    save
                  </button>
                </div>
                <div
                  v-if="formErr.rejectFeePct"
                  class="alert alert-soft alert-error mt-2 wrap-anywhere"
                >
                  {{ formErr.rejectFeePct }}
                </div>
              </fieldset>
            </form>

            <!-- Extra data -->
            <form @submit.prevent="saveExtraData">
              <fieldset
                class="fieldset bg-base-200 border-base-300 border p-3 h-full"
              >
                <legend class="fieldset-legend">Extra data</legend>
                <div class="flex items-center gap-2">
                  <input
                    v-model.trim="extraData"
                    class="input input-bordered w-full"
                    placeholder="extra data (json/text)"
                    :disabled="isBusy"
                  />
                  <button
                    class="btn btn-primary btn-xs"
                    :disabled="isBusy || !extraData"
                  >
                    save
                  </button>
                </div>
                <div
                  v-if="formErr.extraData"
                  class="alert alert-soft alert-error mt-2 wrap-anywhere"
                >
                  {{ formErr.extraData }}
                </div>
              </fieldset>
            </form>

            <!-- Delete class -->
            <form @submit.prevent="deleteClassAction">
              <fieldset
                class="fieldset bg-base-200 border-base-300 border p-3 h-full"
              >
                <legend class="fieldset-legend">Delete class</legend>
                <div class="text-sm opacity-70 mb-2">
                  Class must exist and have zero NFTs (current supply:
                  <span class="font-mono">{{ classSupply }}</span
                  >)
                </div>
                <button
                  class="btn btn-error btn-xs"
                  :disabled="
                    isBusy || !isDestUnlocked || String(classSupply) !== '0'
                  "
                >
                  delete class
                </button>
                <div
                  v-if="formErr.deleteClass"
                  class="alert alert-soft alert-error mt-2 wrap-anywhere"
                >
                  {{ formErr.deleteClass }}
                </div>
              </fieldset>
            </form>
          </div>
        </fieldset>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <!-- Mint NFT -->
          <form @submit.prevent="mintNft">
            <fieldset
              class="fieldset bg-base-200 border-base-300 border p-4 h-full"
            >
              <legend class="fieldset-legend">Mint NFT</legend>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  v-model.trim="mintForm.nftId"
                  class="input input-bordered w-full"
                  placeholder="nft id"
                  :disabled="isBusy"
                />
                <input
                  v-model.trim="mintForm.uri"
                  class="input input-bordered w-full"
                  placeholder="uri (optional)"
                  :disabled="isBusy"
                />
                <input
                  v-model.trim="mintForm.uriHash"
                  class="input input-bordered w-full"
                  placeholder="uri hash (optional)"
                  :disabled="isBusy"
                />
              </div>
              <button
                class="btn btn-primary btn-sm mt-3"
                :disabled="!canMint || isBusy"
              >
                mint
              </button>
            </fieldset>
          </form>

          <!-- NFTs list -->
          <fieldset class="fieldset bg-base-200 border-base-300 border p-4">
            <legend class="fieldset-legend">NFTs</legend>
            <div class="flex items-center gap-2 mb-3">
              <input
                v-model.trim="search"
                class="input input-bordered w-full"
                placeholder="search NFTs (id contains)"
              />
            </div>
            <div v-if="nftLoading" class="text-base-content/70">
              Loading NFTs…
            </div>
            <div v-else class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>NFT ID</th>
                    <th>Listed</th>
                    <th>Valuation</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="n in filteredNFTs" :key="n.id">
                    <td class="font-mono">
                      <router-link
                        :to="`/names/${encodeURIComponent(
                          (classId || '').split('/')[0] || ''
                        )}/nfts/${encodeURIComponent(
                          classId
                        )}/${encodeURIComponent(n.id)}`"
                        class="link"
                        >{{ n.id }}</router-link
                      >
                    </td>
                    <td>
                      <div v-if="n.data?.listed" class="badge badge-success">
                        listed
                      </div>
                      <span v-else>—</span>
                    </td>
                    <td>
                      <span v-if="formatValuation(n).label"
                        >{{ formatValuation(n).amount }}
                        {{ formatValuation(n).label }}</span
                      ><span v-else>—</span>
                    </td>
                    <td class="break-all">
                      <a
                        v-if="n?.uri"
                        :href="n.uri"
                        class="link inline-flex items-center gap-1 font-mono"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>{{ n.uri }}</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          class="w-4 h-4 opacity-70"
                          aria-hidden="true"
                        >
                          <path
                            d="M14 3h7v7h-2V6.414l-9.293 9.293-1.414-1.414L17.586 5H14V3z"
                          />
                          <path d="M5 5h7v2H7v10h10v-5h2v7H5V5z" />
                        </svg>
                      </a>
                      <span v-else>—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch, reactive } from "vue";
import { useRoute } from "vue-router";
import { useWallet } from "@/composables/useWallet";
import { useDenom } from "@/composables/useDenom";

const route = useRoute();
const chainInfo = inject("chainInfo", { restUrl: "http://localhost:1317" });
const { unlockedWallets, sendMsg } = useWallet();
const { getDisplayInfoForBase, baseToDisplay, loadDenomMetadata } = useDenom();

const classId = computed(() => String(route.params.class || ""));
const isLoading = ref(false);
const error = ref("");
const classMeta = ref(null);
const classSupply = ref("-");

// destination and unlock
const nameDestination = ref("");
const isDestUnlocked = computed(() =>
  Array.isArray(unlockedWallets.value)
    ? unlockedWallets.value.some(
        (w) => String(w?.address || "") === nameDestination.value
      )
    : false
);

// class settings
const alwaysListed = ref(false);
const valuationFeePct = ref("");
const valuationPeriod = ref("");
const bidTimeout = ref("");
const minBidPctInc = ref("");
const rejectBidValuationFeePct = ref("");
const allowedDenomsInput = ref("");
const extraData = ref("");
const isBusy = ref(false);
const formErr = ref({
  alwaysListed: "",
  allowedDenoms: "",
  valuationFeePct: "",
  valuationPeriod: "",
  bidTimeout: "",
  minBidPctInc: "",
  rejectFeePct: "",
  extraData: "",
  mint: "",
  deleteClass: "",
});

// Clear errors when any corresponding form field changes
watch(alwaysListed, () => (formErr.value.alwaysListed = ""));
watch(allowedDenomsInput, () => (formErr.value.allowedDenoms = ""));
watch(valuationFeePct, () => (formErr.value.valuationFeePct = ""));
watch(valuationPeriod, () => (formErr.value.valuationPeriod = ""));
watch(bidTimeout, () => (formErr.value.bidTimeout = ""));
watch(minBidPctInc, () => (formErr.value.minBidPctInc = ""));
watch(rejectBidValuationFeePct, () => (formErr.value.rejectFeePct = ""));
watch(extraData, () => (formErr.value.extraData = ""));

// nfts list & actions
const nftLoading = ref(false);
const classNFTs = ref([]);
const search = ref("");
const mintForm = reactive({ nftId: "", uri: "", uriHash: "" });
const canMint = computed(() => String(mintForm.nftId || "").trim().length > 0);

function formatValuation(obj) {
  const coin = obj?.data?.valuation || { amount: "0", denom: "" };
  const denom = String(coin?.denom || "");
  if (!denom) return { amount: "0", label: "" };
  const amount = String(coin?.amount || "");
  const { display } = getDisplayInfoForBase(denom);
  return { amount: baseToDisplay(amount, denom), label: display };
}

async function loadClassDetails() {
  isLoading.value = true;
  error.value = "";
  classMeta.value = null;
  classSupply.value = "-";
  try {
    const r = await fetch(
      `${
        chainInfo.restUrl
      }/dysonprotocol/nft/v1beta1/class?class_id=${encodeURIComponent(
        classId.value
      )}`
    );
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const j = await r.json();
    classMeta.value = j?.class || null;
    const d = classMeta.value?.data || {};
    alwaysListed.value = !!d.always_listed;
    valuationFeePct.value = String(d.valuation_fee_pct || "");
    valuationPeriod.value = String(d.valuation_period || "");
    bidTimeout.value = String(d.bid_timeout || "");
    minBidPctInc.value = String(d.minimum_bid_percent_increase || "");
    rejectBidValuationFeePct.value = String(
      d.reject_bid_valuation_fee_percent || ""
    );
    allowedDenomsInput.value = (d.allowed_denoms || []).join(",");
    extraData.value = String(d.extra_data || "");
    const sr = await fetch(
      `${
        chainInfo.restUrl
      }/dysonprotocol/nft/v1beta1/supply?class_id=${encodeURIComponent(
        classId.value
      )}`
    );
    if (sr.ok) {
      const sj = await sr.json();
      classSupply.value = String(sj?.amount || "0");
    }
  } catch (e) {
    error.value = e?.message || "Failed to load class";
  } finally {
    isLoading.value = false;
  }
}

async function reload() {
  await Promise.all([
    loadDenomMetadata(),
    loadClassDetails(),
    loadNameDestination(),
    loadClassNFTs(),
  ]);
}

defineExpose({ reload, isLoading });

onMounted(reload);

watch(
  () => classId.value,
  () => reload()
);

async function loadNameDestination() {
  try {
    nameDestination.value = "";
    const root = String((classId.value || "").split("/")[0] || "");
    if (!root) return;
    const url = `${
      chainInfo.restUrl
    }/dysonprotocol/nameservice/v1/resolve_name/${encodeURIComponent(root)}`;
    const resp = await fetch(url);
    if (!resp.ok) return;
    const json = await resp.json();
    nameDestination.value = String(json?.address || "");
  } catch {}
}

async function applyClassSettings() {
  // backend authorizes
  isBusy.value = true;
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgSetNFTClassAlwaysListed",
      name_destination: nameDestination.value,
      class_id: classId.value,
      always_listed: !!alwaysListed.value,
    };
    const res = await sendMsg({
      msg,
      executorAddress: nameDestination.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    await reload();
  } catch (e) {
    formErr.value.alwaysListed = e?.message || "Failed to update class";
  } finally {
    isBusy.value = false;
  }
}

async function saveAlwaysListed() {
  await applyClassSettings();
}

async function saveAllowedDenoms() {
  if (!isDestUnlocked.value) return;
  isBusy.value = true;
  try {
    const arr = String(allowedDenomsInput.value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgSetNFTClassAllowedDenoms",
      name_destination: nameDestination.value,
      class_id: classId.value,
      allowed_denoms: arr,
    };
    const res = await sendMsg({
      msg,
      executorAddress: nameDestination.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    await reload();
  } catch (e) {
    formErr.value.allowedDenoms = e?.message || "Failed to set allowed denoms";
  } finally {
    isBusy.value = false;
  }
}

async function saveValuationFeePct() {
  if (!isDestUnlocked.value || !valuationFeePct.value) return;
  isBusy.value = true;
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgSetNFTClassValuationFeePct",
      name_destination: nameDestination.value,
      class_id: classId.value,
      valuation_fee_pct: String(valuationFeePct.value || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: nameDestination.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    await reload();
  } catch (e) {
    formErr.value.valuationFeePct =
      e?.message || "Failed to set valuation fee pct";
  } finally {
    isBusy.value = false;
  }
}

async function saveValuationPeriod() {
  if (!isDestUnlocked.value || !valuationPeriod.value) return;
  isBusy.value = true;
  try {
    // Normalize common hour-based inputs like "24h" -> seconds string "86400s"
    const vp = String(valuationPeriod.value || "").trim();
    const vpNormalized = vp.endsWith("h")
      ? `${Number(vp.slice(0, -1)) * 3600 || 0}s`
      : vp;
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgSetNFTClassValuationPeriod",
      name_destination: nameDestination.value,
      class_id: classId.value,
      valuation_period: String(vpNormalized || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: nameDestination.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    await reload();
  } catch (e) {
    formErr.value.valuationPeriod =
      e?.message || "Failed to set valuation period";
  } finally {
    isBusy.value = false;
  }
}

async function saveBidTimeout() {
  if (!isDestUnlocked.value || !bidTimeout.value) return;
  isBusy.value = true;
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgSetNFTClassBidTimeout",
      name_destination: nameDestination.value,
      class_id: classId.value,
      bid_timeout: String(bidTimeout.value || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: nameDestination.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    await reload();
  } catch (e) {
    formErr.value.bidTimeout = e?.message || "Failed to set bid timeout";
  } finally {
    isBusy.value = false;
  }
}

async function saveMinBidPercentIncrease() {
  if (!isDestUnlocked.value || !minBidPctInc.value) return;
  isBusy.value = true;
  try {
    const msg = {
      "@type":
        "/dysonprotocol.nameservice.v1.MsgSetNFTClassMinimumBidPercentIncrease",
      name_destination: nameDestination.value,
      class_id: classId.value,
      minimum_bid_percent_increase: String(minBidPctInc.value || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: nameDestination.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    await reload();
  } catch (e) {
    formErr.value.minBidPctInc =
      e?.message || "Failed to set min bid % increase";
  } finally {
    isBusy.value = false;
  }
}

async function saveRejectBidValuationFeePct() {
  if (!isDestUnlocked.value || !rejectBidValuationFeePct.value) return;
  isBusy.value = true;
  try {
    const msg = {
      "@type":
        "/dysonprotocol.nameservice.v1.MsgSetNFTClassRejectBidValuationFeePercent",
      name_destination: nameDestination.value,
      class_id: classId.value,
      reject_bid_valuation_fee_percent: String(
        rejectBidValuationFeePct.value || ""
      ),
    };
    const res = await sendMsg({
      msg,
      executorAddress: nameDestination.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    await reload();
  } catch (e) {
    formErr.value.rejectFeePct = e?.message || "Failed to set reject bid fee %";
  } finally {
    isBusy.value = false;
  }
}

async function saveExtraData() {
  if (!isDestUnlocked.value || !extraData.value) return;
  isBusy.value = true;
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgSetNFTClassExtraData",
      name_destination: nameDestination.value,
      class_id: classId.value,
      extra_data: String(extraData.value || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: nameDestination.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    await reload();
  } catch (e) {
    formErr.value.extraData = e?.message || "Failed to set extra data";
  } finally {
    isBusy.value = false;
  }
}

async function deleteClassAction() {
  if (!isDestUnlocked.value) return;
  isBusy.value = true;
  formErr.value.deleteClass = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgDeleteClass",
      name_destination: nameDestination.value,
      class_id: classId.value,
    };
    const res = await sendMsg({
      msg,
      executorAddress: nameDestination.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  } catch (e) {
    formErr.value.deleteClass = e?.message || "Failed to delete class";
  } finally {
    isBusy.value = false;
  }
}

async function loadClassNFTs() {
  nftLoading.value = true;
  try {
    const collected = [];
    let nextKey = "";
    do {
      const url = `${
        chainInfo.restUrl
      }/dysonprotocol/nft/v1beta1/nfts?class_id=${encodeURIComponent(
        classId.value
      )}&pagination.limit=200${
        nextKey ? `&pagination.key=${encodeURIComponent(nextKey)}` : ""
      }`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
      const json = await resp.json();
      collected.push(...(json?.nfts || []));
      nextKey = json?.pagination?.next_key || "";
    } while (nextKey);
    collected.sort((a, b) => {
      const aa = BigInt(a?.data?.valuation?.amount || "0");
      const bb = BigInt(b?.data?.valuation?.amount || "0");
      if (aa === bb)
        return String(a?.id || "").localeCompare(String(b?.id || ""));
      return aa > bb ? -1 : 1;
    });
    classNFTs.value = collected;
  } catch (e) {
    error.value = e?.message || "Failed to load NFTs";
  } finally {
    nftLoading.value = false;
  }
}

const filteredNFTs = computed(() => {
  const q = String(search.value || "").toLowerCase();
  if (!q) return classNFTs.value;
  return classNFTs.value.filter((n) =>
    String(n?.id || "")
      .toLowerCase()
      .includes(q)
  );
});

async function mintNft() {
  if (!canMint.value || !isDestUnlocked.value) return;
  isBusy.value = true;
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgMintNFT",
      name_destination: nameDestination.value,
      class_id: classId.value,
      nft_id: String(mintForm.nftId || ""),
      uri: String(mintForm.uri || ""),
      uri_hash: String(mintForm.uriHash || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: nameDestination.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    mintForm.nftId = mintForm.uri = mintForm.uriHash = "";
    await reload();
  } catch (e) {
    error.value = e?.message || "Failed to mint NFT";
  } finally {
    isBusy.value = false;
  }
}

async function burnNft(nftId) {
  if (!isDestUnlocked.value) return;
  isBusy.value = true;
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgBurnNFT",
      name_destination: nameDestination.value,
      class_id: classId.value,
      nft_id: String(nftId),
    };
    const res = await sendMsg({
      msg,
      executorAddress: nameDestination.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    await reload();
  } catch (e) {
    error.value = e?.message || "Failed to burn NFT";
  } finally {
    isBusy.value = false;
  }
}

async function moveNft(nftId) {
  if (!moveTo.value) return;
  isBusy.value = true;
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgMoveNft",
      name_destination: nameDestination.value,
      class_id: classId.value,
      nft_id: String(nftId),
      to_address: String(moveTo.value),
    };
    const res = await sendMsg({
      msg,
      executorAddress: nameDestination.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    await reload();
  } catch (e) {
    error.value = e?.message || "Failed to move NFT";
  } finally {
    isBusy.value = false;
  }
}
</script>
