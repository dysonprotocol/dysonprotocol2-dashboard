<template>
  <fieldset class="fieldset bg-base-200 border-base-300 border p-4">
    <legend class="fieldset-legend">Public actions</legend>

    <!-- Place bid -->
    <form @submit.prevent="placeBid">
      <fieldset class="fieldset bg-base-200 border-base-300 border p-3">
        <legend class="fieldset-legend">Place bid</legend>
        <div v-if="!isListed" class="alert alert-warning alert-soft mb-2">
          NFT is not listed.
        </div>
        <div class="text-xs opacity-70 mb-1">Bidder</div>
        <WalletSelector
          v-model="bidder"
          :show-locked="false"
          button-class="btn-primary btn-sm w-full mb-2"
        />
        <div class="join w-full mb-2">
          <input
            v-model.trim="bidDisplayAmount"
            class="input join-item w-full"
            placeholder="amount"
            :disabled="busy === 'bid' || !isListed"
          />
          <select
            v-model="bidSelectedDisplayDenom"
            class="select join-item"
            :disabled="busy === 'bid' || !isListed"
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
        <button
          class="btn join-item btn-primary btn-sm"
          :disabled="busy === 'bid' || !bidder || !isListed"
        >
          place bid
        </button>

        <div v-if="err" class="alert alert-error alert-soft mt-2">
          {{ err }}
        </div>
      </fieldset>
    </form>

    <!-- Claim bid -->
    <form @submit.prevent="claimBid">
      <fieldset class="fieldset bg-base-200 border-base-300 border p-3 mt-3">
        <legend class="fieldset-legend">Claim bid</legend>
        <div v-if="!hasCurrentBid" class="alert alert-warning alert-soft mb-2">
          No current bid to claim.
        </div>
        <div class="text-xs opacity-70 mb-1">Bidder</div>
        <WalletSelector
          v-model="bidder"
          :show-locked="false"
          button-class="btn-primary btn-sm w-full mb-2"
        />
        <button
          class="btn btn-primary btn-sm"
          :disabled="busy === 'claim' || !bidder || !hasCurrentBid"
        >
          claim bid
        </button>
        <div v-if="errClaim" class="alert alert-error alert-soft mt-2">
          {{ errClaim }}
        </div>
      </fieldset>
    </form>
  </fieldset>
</template>

<script setup>
import { ref, inject, watch, computed } from "vue";
import { useStorage } from "@vueuse/core";
import { useDenom } from "@/composables/useDenom";
import { useWallet } from "@/composables/useWallet";
import WalletSelector from "@/components/shared/WalletSelector.vue";

const emit = defineEmits(["success"]);

const props = defineProps({
  classId: { type: String, required: true },
  tokenId: { type: String, required: true },
  nft: { type: Object, default: null },
  classAlwaysListed: { type: Boolean, default: false },
});

const chainInfo = inject("chainInfo", { restUrl: "http://localhost:1317" });
const { getDisplayOptions, normalizeFromDisplay, loadDenomMetadata } =
  useDenom();
const { sendMsg } = useWallet();

const allowedDenoms = ref([]);
const allowedDisplayOptions = ref([]);
const bidSelectedDisplayDenom = ref("");
const bidDisplayAmount = ref("");

// Persist bidder across all place bid forms
const bidder = useStorage("nameservice.bidder", "");

const busy = ref("");
const err = ref("");
const errClaim = ref("");
const isListed = computed(
  () => Boolean(props?.classAlwaysListed) || Boolean(props?.nft?.data?.listed)
);

const hasCurrentBid = computed(() => {
  const coin = props?.nft?.data?.current_bid;
  return !!(
    coin &&
    String(coin?.amount || "0") !== "0" &&
    String(coin?.denom || "") !== ""
  );
});

load();
async function load() {
  try {
    const r = await fetch(
      `${
        chainInfo.restUrl
      }/dysonprotocol/nft/v1beta1/class?class_id=${encodeURIComponent(
        props.classId
      )}`
    );
    if (r.ok) {
      const j = await r.json();
      allowedDenoms.value = j?.class?.data?.allowed_denoms || [];
      await loadDenomMetadata();
      allowedDisplayOptions.value = getDisplayOptions({
        allowedBases: allowedDenoms.value,
      });
      if (!bidSelectedDisplayDenom.value && allowedDisplayOptions.value.length)
        bidSelectedDisplayDenom.value = allowedDisplayOptions.value[0].display;
    }
  } catch {}
}

async function placeBid() {
  busy.value = "bid";
  err.value = "";
  try {
    const displayDenom = String(bidSelectedDisplayDenom.value || "");
    const displayAmount = String(bidDisplayAmount.value || "0");
    const normalized = displayDenom
      ? normalizeFromDisplay({ amount: displayAmount, displayDenom })
      : null;
    const base = normalized?.base || { amount: "0", denom: "" };
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgPlaceBid",
      bidder: String(bidder.value || ""),
      nft_class_id: props.classId,
      nft_id: props.tokenId,
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
    emit("success");
  } catch (e) {
    err.value = e?.message || "Failed to place bid";
  } finally {
    busy.value = "";
  }
}

async function claimBid() {
  busy.value = "claim";
  errClaim.value = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgClaimBid",
      bidder: String(bidder.value || ""),
      nft_class_id: props.classId,
      nft_id: props.tokenId,
    };
    const res = await sendMsg({
      msg,
      executorAddress: bidder.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    emit("success");
  } catch (e) {
    errClaim.value = e?.message || "Failed to claim bid";
  } finally {
    busy.value = "";
  }
}
</script>
