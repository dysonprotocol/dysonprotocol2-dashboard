<template>
  <div class="wrap-anywhere">
    <div class="flex items-center gap-2">
      <h2 class="text-xl font-medium">
        NFT
      </h2>
      <router-link
        :to="`/names/${encodeURIComponent(
          (classId || '').split('/')[0] || ''
        )}/nfts/${encodeURIComponent(classId)}`"
        class="btn btn-xs"
      >
        Back to class
      </router-link>
    </div>
    <div
      v-if="isLoading"
      class="text-base-content/70 mt-2"
    >
      Loading…
    </div>
    <div
      v-else-if="error"
      class="alert alert-error mt-2"
    >
      {{ error }}
    </div>
    <div
      v-else
      class="mt-2"
    >
      <table class="table">
        <tbody>
          <tr>
            <th class="w-48">
              Class ID
            </th>
            <td class="font-mono">
              <router-link
                :to="`/names/${encodeURIComponent(
                  (classId || '').split('/')[0] || ''
                )}/nfts/${encodeURIComponent(nft?.class_id || '')}`"
                class="link"
              >
                {{ nft?.class_id }}
              </router-link>
            </td>
          </tr>
          <tr>
            <th>ID</th>
            <td class="font-mono">
              {{ nft?.id }}
            </td>
          </tr>
          <tr>
            <th>Owner</th>
            <td class="break-all">
              <AddressDisplay
                :address="ownerAddress"
                :truncate="0"
              />
            </td>
          </tr>
          <tr>
            <th>URI</th>
            <td class="font-mono break-all">
              {{ nft?.uri || "" }}
            </td>
          </tr>
          <tr>
            <th>Listed</th>
            <td>
              <div
                v-if="nft?.data?.listed || classAlwaysListed"
                class="badge badge-success"
              >
                <span v-if="classAlwaysListed">always</span> listed
              </div>
              <span v-else>—</span>
            </td>
          </tr>
          <tr>
            <th>Valuation</th>
            <td>
              <span v-if="valuationDisplay.label">{{ valuationDisplay.amount }}
                {{ valuationDisplay.label }}</span>
              <span v-else>—</span>
            </td>
          </tr>
          <tr>
            <th>Valuation expiry</th>
            <td>
              <span v-if="valuationExpiry">{{ valuationExpiry }} - </span>

              <span v-if="valuationExpiryDelta">{{
                valuationExpiryDelta
              }}</span>
            </td>
          </tr>

          <tr>
            <th>Current bid</th>
            <td>
              <span v-if="currentBidDisplay.label">{{ currentBidDisplay.amount }}
                {{ currentBidDisplay.label }}</span>
              <span v-else>—</span>
            </td>
          </tr>
          <tr>
            <th>Current bidder</th>
            <td class="break-all">
              <AddressDisplay
                v-if="hasCurrentBid"
                :address="nft?.data?.current_bidder"
                :truncate="0"
              />
              <span v-else>—</span>
            </td>
          </tr>
          <tr>
            <th>Bid time</th>
            <td>
              <span v-if="hasCurrentBid">{{ nft?.data?.bid_timestamp }}</span>
              <span v-else>—</span>
            </td>
          </tr>
          <tr>
            <th>Bid timeout</th>
            <td>
              <span v-if="bidTimeoutMs > 0">{{ bidTimeoutDisplay }}</span>
              <span v-else>—</span>
            </td>
          </tr>
          <tr>
            <th>Claimable at</th>
            <td>
              <span v-if="bidClaimableAt">{{ bidClaimableAt }}</span>
              <span v-else>—</span>
            </td>
          </tr>
          <tr>
            <th>Bidder can claim</th>
            <td>
              <span v-if="hasCurrentBid && bidTimeoutMs > 0">
                {{ claimCountdownDisplay || (isBidderClaimable ? "now" : "") }}
              </span>
              <span v-else>—</span>
            </td>
          </tr>
          <tr>
            <th>Metadata</th>
            <td class="break-words whitespace-pre-wrap">
              {{ nft?.data?.metadata || "" }}
            </td>
          </tr>
        </tbody>
      </table>
      <!-- Actions -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        <NftPublicActions
          :class-id="classId"
          :token-id="tokenId"
          :nft="nft"
          :class-always-listed="Boolean(classAlwaysListed)"
          @success="reload"
        />
        <NftOwnerActions
          :class-id="classId"
          :token-id="tokenId"
          :owner-address="ownerAddress"
          :listed="Boolean(nft?.data?.listed)"
          :class-always-listed="Boolean(classAlwaysListed)"
          :nft="nft"
          @success="reload"
        />
        <NftDestinationActions
          :class-id="classId"
          :token-id="tokenId"
          :name-destination="nameDestination"
          :nft="nft"
          @success="reload"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute } from "vue-router";
import AddressDisplay from "@/components/AddressDisplay.vue";
import NftOwnerActions from "@/components/nft/forms/NftOwnerActions.vue";
import NftDestinationActions from "@/components/nft/forms/NftDestinationActions.vue";
import NftPublicActions from "@/components/nft/forms/NftPublicActions.vue";
import { useDenom } from "@/composables/useDenom";
import { useWallet } from "@/composables/useWallet";

const route = useRoute();
const chainInfo = inject("chainInfo", { restUrl: "" });
const {
  getDisplayInfoForBase,
  baseToDisplay,
  loadDenomMetadata,
  getDisplayOptions,
  normalizeFromDisplay,
  normalizeCoin,
} = useDenom();
const { unlockedWallets, sendMsg } = useWallet();

const classId = computed(() => String(route.params.class || ""));
const tokenId = computed(() => String(route.params.id || ""));

const isLoading = ref(false);
const error = ref("");
const nft = ref(null);
const ownerAddress = ref("");
const isBusy = ref(false);
const busy = ref("");
const err = ref({
  valuation: "",
  accept: "",
  reject: "",
  bid: "",
  burn: "",
  move: "",
  metadata: "",
  send: "",
});

const valuationDisplay = computed(() => {
  const coin = nft.value?.data?.valuation || { amount: "0", denom: "" };
  const denom = String(coin?.denom || "");
  if (!denom) return { amount: "0", label: "" };
  const amount = String(coin?.amount || "0");
  const { display } = getDisplayInfoForBase(denom);
  return { amount: baseToDisplay(amount, denom), label: display };
});

const hasCurrentBid = computed(() => {
  const coin = nft.value?.data?.current_bid;
  return !!(
    coin &&
    String(coin.amount || "0") !== "0" &&
    String(coin.denom || "") !== ""
  );
});

const currentBidDisplay = computed(() => {
  const coin = nft.value?.data?.current_bid || { amount: "0", denom: "" };
  const denom = String(coin?.denom || "");
  if (!denom) return { amount: "0", label: "" };
  const amount = String(coin?.amount || "0");
  const { display } = getDisplayInfoForBase(denom);
  return { amount: baseToDisplay(amount, denom), label: display };
});

const classAlwaysListedRef = ref(false);
const classAlwaysListed = computed(() =>
  Boolean(
    nft.value?.class_data?.always_listed ||
      nft.value?.class?.data?.always_listed ||
      classAlwaysListedRef.value
  )
);

const bidder = ref("");

const valuation = ref({ amount: "", denom: "", maxPct: "" });
const valuationDisplayAmount = ref("");
const allowedDenoms = ref([]);
const allowedDisplayOptions = ref([]);
const selectedDisplayDenom = ref("");
const bid = ref({ amount: "", denom: "" });
const bidDisplayAmount = ref("");
const bidSelectedDisplayDenom = ref("");
const nameDestination = ref("");
const moveTo = ref("");
const sendTo = ref("");
const meta = ref({ metadata: "", uri: "" });

// Bid timeout / claim window derived from class data
const bidTimeoutMsRef = ref(0);
const bidTimeoutMs = computed(() => Number(bidTimeoutMsRef.value || 0));
function parseDurationMs(s) {
  const v = String(s || "").trim();
  if (!v) return 0;
  // supports e.g. "2s", "1500ms"
  if (v.endsWith("ms")) return Number(v.slice(0, -2)) || 0;
  if (v.endsWith("s")) return (Number(v.slice(0, -1)) || 0) * 1000;
  return Number(v) || 0;
}
function formatUtcDateTime(ms) {
  const iso = new Date(ms).toISOString();
  return `${iso.slice(0, 19).replace("T", " ")} UTC`;
}
const bidTimeoutDisplay = computed(() => {
  const ms = bidTimeoutMs.value;
  if (ms < 1000) return `${ms}ms`;
  return `${Math.round(ms / 1000)}s`;
});
const bidClaimableAt = computed(() => {
  try {
    if (!hasCurrentBid.value) return "";
    const ts = String(nft.value?.data?.bid_timestamp || "");
    if (!ts) return "";
    const ms = Date.parse(ts);
    if (!ms || Number.isNaN(ms)) return "";
    const at = new Date(ms + bidTimeoutMs.value);
    return at.toISOString().replace(".000Z", "Z");
  } catch {
    return "";
  }
});
const isBidderClaimable = computed(() => {
  if (!hasCurrentBid.value) return false;
  if (bidTimeoutMs.value <= 0) return false;
  const ts = String(nft.value?.data?.bid_timestamp || "");
  const ms = Date.parse(ts);
  if (!ms || Number.isNaN(ms)) return false;
  return Date.now() >= ms + bidTimeoutMs.value;
});

// Live countdown for claim time
const nowMs = ref(Date.now());
let claimTimer = 0;
onMounted(() => {
  claimTimer = window.setInterval(() => (nowMs.value = Date.now()), 1000);
});
onBeforeUnmount(() => {
  if (claimTimer) window.clearInterval(claimTimer);
});
const claimRemainingMs = computed(() => {
  if (!hasCurrentBid.value || bidTimeoutMs.value <= 0) return 0;
  const ts = String(nft.value?.data?.bid_timestamp || "");
  const ms = Date.parse(ts);
  if (!ms || Number.isNaN(ms)) return 0;
  const rem = ms + bidTimeoutMs.value - nowMs.value;
  return rem > 0 ? rem : 0;
});
const claimCountdownDisplay = computed(() => {
  if (!hasCurrentBid.value || bidTimeoutMs.value <= 0) return "";
  if (claimRemainingMs.value <= 0) return "now";
  const totalSec = Math.ceil(claimRemainingMs.value / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  if (minutes > 0) return `in ${minutes}m ${seconds}s`;
  return `in ${seconds}s`;
});

const valuationExpiry = computed(() => {
  try {
    const ts = String(nft.value?.data?.valuation_expiry || "");
    if (!ts) return "";
    const ms = Date.parse(ts);
    if (!ms || Number.isNaN(ms)) return "";
    return formatUtcDateTime(ms);
  } catch {
    return "";
  }
});

const valuationExpiryDelta = computed(() => {
  try {
    const ts = String(nft.value?.data?.valuation_expiry || "");
    if (!ts) return "";
    const ms = Date.parse(ts);
    if (!ms || Number.isNaN(ms)) return "";
    const diff = ms - nowMs.value;
    if (diff <= 0) return "expired";
    const totalSec = Math.ceil(diff / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) return `in ${hours}h ${minutes}m`;
    if (minutes > 0) return `in ${minutes}m ${seconds}s`;
    return `in ${seconds}s`;
  } catch {
    return "";
  }
});

async function loadNFTDetail() {
  isLoading.value = true;
  error.value = "";
  nft.value = null;
  ownerAddress.value = "";
  try {
    busy.value = "valuation";
    err.value.valuation = "";
    const url = `${
      chainInfo.restUrl
    }/dysonprotocol/nft/v1beta1/nft?class_id=${encodeURIComponent(
      classId.value
    )}&id=${encodeURIComponent(tokenId.value)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    const json = await resp.json();
    nft.value = json?.nft || null;

    const or = await fetch(
      `${
        chainInfo.restUrl
      }/dysonprotocol/nft/v1beta1/owner?class_id=${encodeURIComponent(
        classId.value
      )}&id=${encodeURIComponent(tokenId.value)}`
    );
    if (or.ok) {
      const oj = await or.json();
      ownerAddress.value = String(oj?.owner || "");
      // default bidder to first unlocked if available
      const first =
        Array.isArray(unlockedWallets.value) &&
        unlockedWallets.value[0]?.address;
      bidder.value = String(first || ownerAddress.value || "");
    }
    // fetch class to set valuation.maxPct and bid timeout
    try {
      const cr = await fetch(
        `${
          chainInfo.restUrl
        }/dysonprotocol/nft/v1beta1/class?class_id=${encodeURIComponent(
          classId.value
        )}`
      );
      if (cr.ok) {
        const cj = await cr.json();
        valuation.value.maxPct = String(
          cj?.class?.data?.valuation_fee_pct || ""
        );
        classAlwaysListedRef.value = Boolean(cj?.class?.data?.always_listed);
        bidTimeoutMsRef.value = parseDurationMs(
          String(cj?.class?.data?.bid_timeout || "")
        );
      }
    } catch {}
  } catch (e) {
    error.value = e?.message || "Failed to load NFT";
  } finally {
    isLoading.value = false;
  }
}

async function reload() {
  await loadDenomMetadata();
  await loadValuationParams();
  await loadNFTDetail();
  await loadNameDestination();
}

defineExpose({ reload, isLoading });

onMounted(reload);

watch(
  () => [classId.value, tokenId.value],
  () => reload()
);

// Initialize default valuation input from NFT valuation (normalize base -> display)
watch(
  () => nft.value,
  async (val) => {
    try {
      const coin = val?.data?.valuation || { amount: "0", denom: "" };
      const denom = String(coin?.denom || "");
      if (!denom) return;
      const normalized = normalizeCoin({
        amount: String(coin?.amount || "0"),
        denom,
      });
      valuationDisplayAmount.value = String(normalized.display.amount || "0");
      if (!selectedDisplayDenom.value)
        selectedDisplayDenom.value = String(normalized.display.denom || "");
    } catch {}
  },
  { immediate: true }
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

async function loadValuationParams() {
  try {
    const resp = await fetch(
      `${
        chainInfo.restUrl
      }/dysonprotocol/nft/v1beta1/class?class_id=${encodeURIComponent(
        classId.value
      )}`
    );
    if (!resp.ok) return;
    const json = await resp.json();
    allowedDenoms.value = json?.class?.data?.allowed_denoms || [];
    allowedDisplayOptions.value = getDisplayOptions({
      allowedBases: allowedDenoms.value,
    });
    if (!selectedDisplayDenom.value && allowedDisplayOptions.value.length)
      selectedDisplayDenom.value = allowedDisplayOptions.value[0].display;
  } catch {}
}

async function setValuation() {
  // backend authorizes
  isBusy.value = true;
  try {
    const displayDenom = String(selectedDisplayDenom.value || "");
    const displayAmount = String(valuationDisplayAmount.value || "0");
    const normalized = displayDenom
      ? normalizeFromDisplay({ amount: displayAmount, displayDenom })
      : null;
    const base = normalized?.base || { amount: "0", denom: "" };
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgSetValuation",
      owner: ownerAddress.value,
      nft_class_id: classId.value,
      nft_id: tokenId.value,
      valuation: {
        amount: String(base.amount || "0"),
        denom: String(base.denom || ""),
      },
      max_valuation_fee_pct: String(valuation.value.maxPct || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: ownerAddress.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  } catch (e) {
    err.value.valuation = e?.message || "Failed to set valuation";
  } finally {
    busy.value = "";
    isBusy.value = false;
  }
}

async function setMetadata() {
  // backend authorizes
  isBusy.value = true;
  try {
    busy.value = "metadata";
    err.value.metadata = "";
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgSetNFTMetadata",
      name_destination: nameDestination.value,
      class_id: classId.value,
      nft_id: tokenId.value,
      metadata: String(meta.value.metadata || ""),
      uri: String(meta.value.uri || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: nameDestination.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  } catch (e) {
    err.value.metadata = e?.message || "Failed to set metadata";
  } finally {
    busy.value = "";
    isBusy.value = false;
  }
}

async function acceptBid() {
  // backend authorizes
  isBusy.value = true;
  try {
    busy.value = "accept";
    err.value.accept = "";
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgAcceptBid",
      owner: ownerAddress.value,
      nft_class_id: classId.value,
      nft_id: tokenId.value,
    };
    const res = await sendMsg({
      msg,
      executorAddress: ownerAddress.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  } catch (e) {
    err.value.accept = e?.message || "Failed to accept bid";
  } finally {
    busy.value = "";
    isBusy.value = false;
  }
}

async function rejectBid() {
  // backend authorizes
  isBusy.value = true;
  try {
    busy.value = "reject";
    err.value.reject = "";
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgRejectBid",
      owner: ownerAddress.value,
      nft_class_id: classId.value,
      nft_id: tokenId.value,
    };
    const res = await sendMsg({
      msg,
      executorAddress: ownerAddress.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  } catch (e) {
    err.value.reject = e?.message || "Failed to reject bid";
  } finally {
    busy.value = "";
    isBusy.value = false;
  }
}

async function placeBid() {
  // backend authorizes
  isBusy.value = true;
  try {
    busy.value = "bid";
    err.value.bid = "";
    const displayDenom = String(bidSelectedDisplayDenom.value || "");
    const displayAmount = String(bidDisplayAmount.value || "0");
    const normalized = displayDenom
      ? normalizeFromDisplay({ amount: displayAmount, displayDenom })
      : null;
    const base = normalized?.base || { amount: "0", denom: "" };
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgPlaceBid",
      bidder: bidder.value,
      nft_class_id: classId.value,
      nft_id: tokenId.value,
      bid_amount: {
        amount: String(base.amount || "0"),
        denom: String(base.denom || ""),
      },
    };
    const res = await sendMsg({
      msg,
      executorAddress: bidder.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  } catch (e) {
    err.value.bid = e?.message || "Failed to place bid";
  } finally {
    busy.value = "";
    isBusy.value = false;
  }
}

async function burnNft() {
  // backend authorizes
  isBusy.value = true;
  try {
    busy.value = "burn";
    err.value.burn = "";
    const cid = String(nft.value?.class_id || classId.value);
    const nid = String(nft.value?.id || tokenId.value);
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgBurnNFT",
      name_destination: nameDestination.value,
      class_id: cid,
      nft_id: nid,
    };
    const res = await sendMsg({
      msg,
      executorAddress: nameDestination.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  } catch (e) {
    err.value.burn = e?.message || "Failed to burn NFT";
  } finally {
    busy.value = "";
    isBusy.value = false;
  }
}

async function moveNft() {
  if (!moveTo.value) return;
  isBusy.value = true;
  try {
    busy.value = "move";
    err.value.move = "";
    const cid = String(nft.value?.class_id || classId.value);
    const nid = String(nft.value?.id || tokenId.value);
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgMoveNft",
      name_destination: nameDestination.value,
      class_id: cid,
      nft_id: nid,
      to_address: String(moveTo.value),
    };
    const res = await sendMsg({
      msg,
      executorAddress: nameDestination.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  } catch (e) {
    err.value.move = e?.message || "Failed to move NFT";
  } finally {
    busy.value = "";
    isBusy.value = false;
  }
}

async function sendNft() {
  if (!sendTo.value) return;
  isBusy.value = true;
  try {
    busy.value = "send";
    err.value.send = "";
    const msg = {
      "@type": "/dysonprotocol.nft.v1beta1.MsgSend",
      class_id: classId.value,
      id: tokenId.value,
      sender: ownerAddress.value,
      receiver: String(sendTo.value),
    };
    const res = await sendMsg({
      msg,
      executorAddress: ownerAddress.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  } catch (e) {
    err.value.send = e?.message || "Failed to send NFT";
  } finally {
    busy.value = "";
    isBusy.value = false;
  }
}
</script>
