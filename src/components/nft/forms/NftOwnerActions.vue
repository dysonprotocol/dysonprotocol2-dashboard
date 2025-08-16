<template>
  <fieldset class="fieldset bg-base-200 border-base-300 border p-4">
    <legend class="fieldset-legend">NFT owner actions</legend>

    <div class="text-xs opacity-70 mb-2">
      Owner: <AddressDisplay :address="ownerAddress" :truncate="0" />
    </div>

    <!-- Send NFT -->
    <form class="mb-3" @submit.prevent="sendNft">
      <fieldset class="fieldset bg-base-200 border-base-300 border p-3">
        <legend class="fieldset-legend">Send NFT</legend>
        <div class="join w-full">
          <input
            v-model.trim="sendTo"
            class="input join-item w-full"
            placeholder="send to (owner)"
            :disabled="busy === 'send'"
          />
          <button
            class="btn join-item btn-primary"
            :disabled="busy === 'send' || !sendTo"
          >
            send
          </button>
        </div>
        <div v-if="err.send" class="alert alert-error alert-soft mt-2">
          {{ err.send }}
        </div>
      </fieldset>
    </form>

    <!-- Set Listed -->
    <form class="mb-3" @submit.prevent="setListed">
      <fieldset class="fieldset bg-base-200 border-base-300 border p-3">
        <legend class="fieldset-legend">Set Listed</legend>
        <div class="flex items-center gap-2">
          <label class="text-sm">
            <input
              v-model="isListed"
              type="checkbox"
              class="checkbox mr-2"
              :disabled="busy === 'listed'"
            />List NFT for sale
          </label>
        </div>
        <div
          v-if="props.classAlwaysListed"
          class="alert alert-info alert-soft mt-2"
        >
          Class is set to "always listed". Changing listed status on this NFT
          will have no effect.
        </div>
        <button
          class="btn btn-primary btn-sm mt-2"
          :disabled="busy === 'listed'"
        >
          save
        </button>

        <div v-if="err.listed" class="alert alert-error alert-soft mt-2">
          {{ err.listed }}
        </div>
      </fieldset>
    </form>

    <!-- Set valuation -->
    <form class="mb-3" @submit.prevent="setValuation">
      <fieldset class="fieldset bg-base-200 border-base-300 border p-3">
        <legend class="fieldset-legend">Set valuation</legend>
        <div class="join w-full">
          <input
            v-model.trim="valuationDisplayAmount"
            class="input join-item w-full"
            placeholder="amount"
            :disabled="busy === 'valuation'"
          />
          <select
            v-model="selectedDisplayDenom"
            class="select join-item"
            :disabled="busy === 'valuation'"
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
          <button
            class="btn join-item btn-primary"
            :disabled="busy === 'valuation'"
          >
            save
          </button>
        </div>

        <div
          v-if="err.valuation"
          class="alert alert-error alert-soft mt-2 wrap-anywhere"
        >
          {{ err.valuation }}
        </div>
      </fieldset>
    </form>

    <!-- Accept bid -->
    <form class="mb-3" @submit.prevent="acceptBid">
      <fieldset class="fieldset bg-base-200 border-base-300 border p-3">
        <legend class="fieldset-legend">Accept bid</legend>
        <div v-if="!hasCurrentBid" class="alert alert-warning alert-soft mb-2">
          No current bid to accept.
        </div>
        <button
          class="btn btn-primary btn-sm"
          :disabled="busy === 'accept' || !hasCurrentBid"
        >
          accept
        </button>
        <div v-if="err.accept" class="alert alert-error alert-soft mt-2">
          {{ err.accept }}
        </div>
      </fieldset>
    </form>

    <!-- Reject bid -->
    <form class="mb-3" @submit.prevent="rejectBid">
      <fieldset class="fieldset bg-base-200 border-base-300 border p-3">
        <legend class="fieldset-legend">Reject bid</legend>
        <div v-if="!hasCurrentBid" class="alert alert-warning alert-soft mb-2">
          No current bid to reject.
        </div>
        <div v-else class="join w-full mb-2">
          <input
            v-model.trim="rejectDisplayAmount"
            class="input join-item w-full"
            placeholder="new valuation amount"
            :disabled="busy === 'reject'"
          />
          <select
            v-model="rejectSelectedDisplayDenom"
            class="select join-item"
            :disabled="busy === 'reject' || rejectDisplayOptions.length <= 1"
          >
            <option
              v-for="opt in rejectDisplayOptions"
              :key="opt.base"
              :value="opt.display"
            >
              {{ opt.display }}
            </option>
          </select>
        </div>
        <button
          class="btn btn-primary btn-sm"
          :disabled="busy === 'reject' || !hasCurrentBid"
        >
          reject
        </button>
        <div v-if="err.reject" class="alert alert-error alert-soft mt-2">
          {{ err.reject }}
        </div>
      </fieldset>
    </form>

    <!-- Renew -->
    <form class="mb-3" @submit.prevent="renew">
      <fieldset class="fieldset bg-base-200 border-base-300 border p-3">
        <legend class="fieldset-legend">Renew</legend>
        <div class="join w-full">
          <input
            v-model.trim="payer"
            class="input join-item w-full"
            placeholder="payer address"
            :disabled="busy === 'renew'"
          />
          <button
            class="btn join-item btn-primary"
            :disabled="busy === 'renew' || !payer"
          >
            renew
          </button>
        </div>
        <div v-if="err.renew" class="alert alert-error alert-soft mt-2">
          {{ err.renew }}
        </div>
      </fieldset>
    </form>
  </fieldset>
</template>

<script setup>
import { ref, inject, watch, computed } from "vue";
import { useDenom } from "@/composables/useDenom";
import { useWallet } from "@/composables/useWallet";
import AddressDisplay from "@/components/AddressDisplay.vue";

const emit = defineEmits(["success"]);

const props = defineProps({
  classId: { type: String, required: true },
  tokenId: { type: String, required: true },
  ownerAddress: { type: String, required: true },
  listed: { type: Boolean, default: false },
  classAlwaysListed: { type: Boolean, default: false },
  nft: { type: Object, default: null },
});

const chainInfo = inject("chainInfo", { restUrl: "" });
const {
  getDisplayOptions,
  normalizeFromDisplay,
  loadDenomMetadata,
  normalizeCoin,
} = useDenom();
const { sendMsg } = useWallet();

const allowedDenoms = ref([]);
const allowedDisplayOptions = ref([]);
const selectedDisplayDenom = ref("");
const valuationDisplayAmount = ref("");
const valuation = ref({ maxPct: "" });
const rejectDisplayAmount = ref("");
const rejectSelectedDisplayDenom = ref("");

const sendTo = ref("");
const payer = ref("");
const isListed = ref(Boolean(props.listed));
const busy = ref("");
const err = ref({
  valuation: "",
  accept: "",
  reject: "",
  send: "",
  listed: "",
  renew: "",
});

const hasCurrentBid = computed(() => {
  const coin = props?.nft?.data?.current_bid;
  return !!(
    coin &&
    String(coin.amount || "0") !== "0" &&
    String(coin.denom || "") !== ""
  );
});

const rejectDisplayOptions = computed(() => {
  const base = String(props?.nft?.data?.current_bid?.denom || "");
  if (!base) return [];
  return getDisplayOptions({ allowedBases: [base] }) || [];
});

watch(
  () => rejectDisplayOptions.value,
  (opts) => {
    if (!rejectSelectedDisplayDenom.value && Array.isArray(opts) && opts.length)
      rejectSelectedDisplayDenom.value = opts[0].display;
  },
  { immediate: true }
);

watch(
  () => props.ownerAddress,
  (addr) => {
    if (!payer.value) payer.value = String(addr || "");
  },
  { immediate: true }
);

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
      if (!selectedDisplayDenom.value && allowedDisplayOptions.value.length)
        selectedDisplayDenom.value = allowedDisplayOptions.value[0].display;
    }
  } catch {}
}
// default valuation amount from current nft (normalize base -> display)
watch(
  () => props.nft,
  async (val) => {
    try {
      const coin = val?.data?.valuation || { amount: "0", denom: "" };
      const denom = String(coin?.denom || "");
      if (!denom) return;
      await loadDenomMetadata();
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

watch(
  () => props.listed,
  (val) => (isListed.value = Boolean(val))
);

async function setValuation() {
  busy.value = "valuation";
  err.value.valuation = "";
  try {
    const displayDenom = String(selectedDisplayDenom.value || "");
    const displayAmount = String(valuationDisplayAmount.value || "0");
    const normalized = displayDenom
      ? normalizeFromDisplay({ amount: displayAmount, displayDenom })
      : null;
    const base = normalized?.base || { amount: "0", denom: "" };
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgSetValuation",
      owner: props.ownerAddress,
      nft_class_id: props.classId,
      nft_id: props.tokenId,
      valuation: {
        amount: String(base.amount || "0"),
        denom: String(base.denom || ""),
      },
      max_valuation_fee_pct: String(valuation.value.maxPct || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: props.ownerAddress,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    emit("success");
  } catch (e) {
    err.value.valuation = e?.message || "Failed to set valuation";
  } finally {
    busy.value = "";
  }
}

async function acceptBid() {
  busy.value = "accept";
  err.value.accept = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgAcceptBid",
      owner: props.ownerAddress,
      nft_class_id: props.classId,
      nft_id: props.tokenId,
    };
    const res = await sendMsg({
      msg,
      executorAddress: props.ownerAddress,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    emit("success");
  } catch (e) {
    err.value.accept = e?.message || "Failed to accept bid";
  } finally {
    busy.value = "";
  }
}

async function rejectBid() {
  busy.value = "reject";
  err.value.reject = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgRejectBid",
      owner: props.ownerAddress,
      nft_class_id: props.classId,
      nft_id: props.tokenId,
      new_valuation: (() => {
        const displayDenom = String(rejectSelectedDisplayDenom.value || "");
        const displayAmount = String(rejectDisplayAmount.value || "0");
        const normalized = displayDenom
          ? normalizeFromDisplay({ amount: displayAmount, displayDenom })
          : null;
        const base = normalized?.base || {
          amount: String(displayAmount || "0"),
          denom: String(props?.nft?.data?.current_bid?.denom || ""),
        };
        return {
          amount: String(base.amount || "0"),
          denom: String(base.denom || ""),
        };
      })(),
    };
    const res = await sendMsg({
      msg,
      executorAddress: props.ownerAddress,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    emit("success");
  } catch (e) {
    err.value.reject = e?.message || "Failed to reject bid";
  } finally {
    busy.value = "";
  }
}

async function sendNft() {
  if (!sendTo.value) return;
  busy.value = "send";
  err.value.send = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nft.v1beta1.MsgSend",
      class_id: props.classId,
      id: props.tokenId,
      sender: props.ownerAddress,
      receiver: String(sendTo.value),
    };
    const res = await sendMsg({
      msg,
      executorAddress: props.ownerAddress,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    emit("success");
  } catch (e) {
    err.value.send = e?.message || "Failed to send NFT";
  } finally {
    busy.value = "";
  }
}

async function setListed() {
  busy.value = "listed";
  err.value.listed = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgSetListed",
      nft_owner: props.ownerAddress,
      nft_class_id: props.classId,
      nft_id: props.tokenId,
      listed: Boolean(isListed.value),
    };
    const res = await sendMsg({
      msg,
      executorAddress: props.ownerAddress,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    emit("success");
  } catch (e) {
    err.value.listed = e?.message || "Failed to set listed status";
  } finally {
    busy.value = "";
  }
}

async function renew() {
  busy.value = "renew";
  err.value.renew = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgRenew",
      payer: String(payer.value || ""),
      nft_class_id: props.classId,
      nft_id: props.tokenId,
    };
    const res = await sendMsg({
      msg,
      executorAddress: payer.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    emit("success");
  } catch (e) {
    err.value.renew = e?.message || "Failed to renew";
  } finally {
    busy.value = "";
  }
}
</script>
