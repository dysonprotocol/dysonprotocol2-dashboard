<template>
  <fieldset class="fieldset bg-base-200 border-base-300 border p-4">
    <legend class="fieldset-legend">
      Name destination address actions
    </legend>

    <div class="text-xs opacity-70 mb-2">
      Root name destination:
      <AddressDisplay
        :address="nameDestination"
        :truncate="0"
      />
    </div>

    <!-- Burn -->
    <form
      class="mb-3"
      @submit.prevent="burnNft"
    >
      <fieldset class="fieldset bg-base-200 border-base-300 border p-3">
        <legend class="fieldset-legend">
          Burn NFT
        </legend>
        <button
          class="btn btn-error btn-sm"
          :disabled="busy === 'burn'"
        >
          burn
        </button>
        <div
          v-if="err.burn"
          class="alert alert-error alert-soft mt-2"
        >
          {{ err.burn }}
        </div>
      </fieldset>
    </form>

    <!-- Move -->
    <form
      class="mb-3"
      @submit.prevent="moveNft"
    >
      <fieldset class="fieldset bg-base-200 border-base-300 border p-3">
        <legend class="fieldset-legend">
          Force Move NFT
        </legend>
        <p class="text-xs opacity-70 mb-2">
          MsgMoveNft force moves an NFT to a new account.
        </p>
        <div class="join w-full">
          <input
            v-model.trim="moveTo"
            class="input join-item w-full"
            placeholder="to address"
            :disabled="busy === 'move'"
          >
          <button
            class="btn join-item btn-primary"
            :disabled="busy === 'move' || !moveTo"
          >
            move
          </button>
        </div>
        <div
          v-if="err.move"
          class="alert alert-error alert-soft mt-2"
        >
          {{ err.move }}
        </div>
      </fieldset>
    </form>

    <!-- Metadata -->
    <form @submit.prevent="setMetadata">
      <fieldset class="fieldset bg-base-200 border-base-300 border p-3">
        <legend class="fieldset-legend">
          Set metadata
        </legend>
        <div class="grid grid-cols-1 gap-2">
          <textarea
            v-model.trim="meta.metadata"
            class="textarea textarea-bordered w-full"
            placeholder="metadata (text/json)"
            :disabled="busy === 'metadata'"
          />
          <input
            v-model.trim="meta.uri"
            class="input input-bordered w-full"
            placeholder="uri (optional)"
            :disabled="busy === 'metadata'"
          >
          <input
            v-model.trim="meta.uriHash"
            class="input input-bordered w-full"
            placeholder="uri hash (optional)"
            :disabled="busy === 'metadata'"
          >
        </div>
        <button
          class="btn btn-primary btn-sm"
          :disabled="busy === 'metadata'"
        >
          save
        </button>
        <div
          v-if="err.metadata"
          class="alert alert-error alert-soft mt-2"
        >
          {{ err.metadata }}
        </div>
      </fieldset>
    </form>
  </fieldset>
</template>

<script setup>
import { ref, inject } from "vue";
import { useWallet } from "@/composables/useWallet";
import AddressDisplay from "@/components/AddressDisplay.vue";

const emit = defineEmits(["success"]);

const props = defineProps({
  classId: { type: String, required: true },
  tokenId: { type: String, required: true },
  nameDestination: { type: String, required: true },
  nft: { type: Object, default: null },
});

const chainInfo = inject("chainInfo", { restUrl: "" });
const { sendMsg } = useWallet();

const busy = ref("");
const err = ref({ burn: "", move: "", metadata: "" });
const moveTo = ref("");
const meta = ref({ metadata: "", uri: "", uriHash: "" });

// initialize defaults from current nft
if (props.nft) {
  meta.value.metadata = String(props.nft?.data?.metadata || "");
  meta.value.uri = String(props.nft?.uri || "");
  meta.value.uriHash = String(props.nft?.uri_hash || "");
}

async function burnNft() {
  busy.value = "burn";
  err.value.burn = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgBurnNFT",
      name_destination: props.nameDestination,
      class_id: props.classId,
      nft_id: props.tokenId,
    };
    const res = await sendMsg({
      msg,
      executorAddress: props.nameDestination,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    emit("success");
  } catch (e) {
    err.value.burn = e?.message || "Failed to burn NFT";
  } finally {
    busy.value = "";
  }
}

async function moveNft() {
  if (!moveTo.value) return;
  busy.value = "move";
  err.value.move = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgMoveNft",
      name_destination: props.nameDestination,
      class_id: props.classId,
      nft_id: props.tokenId,
      to_address: String(moveTo.value),
    };
    const res = await sendMsg({
      msg,
      executorAddress: props.nameDestination,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    emit("success");
  } catch (e) {
    err.value.move = e?.message || "Failed to move NFT";
  } finally {
    busy.value = "";
  }
}

async function setMetadata() {
  busy.value = "metadata";
  err.value.metadata = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgSetNFTMetadata",
      name_destination: props.nameDestination,
      class_id: props.classId,
      nft_id: props.tokenId,
      metadata: String(meta.value.metadata || ""),
      uri: String(meta.value.uri || ""),
      uri_hash: String(meta.value.uriHash || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: props.nameDestination,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    emit("success");
  } catch (e) {
    err.value.metadata = e?.message || "Failed to set metadata";
  } finally {
    busy.value = "";
  }
}
</script>
