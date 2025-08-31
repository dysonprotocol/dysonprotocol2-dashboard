<template>
  <div>
    <!-- Mint NFT form -->
    <div class="card bg-base-200 mb-4">
      <div class="card-body gap-3">
        <div class="flex items-center justify-between">
          <div class="text-lg font-medium">
            Mint NFT
          </div>
          <button
            class="btn btn-sm btn-primary"
            :disabled="!canMint || isLoading"
            @click="$emit('mint-nft')"
          >
            Mint
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            v-model.trim="mintForm.nftId"
            class="input input-bordered w-full"
            placeholder="nft id"
            :disabled="false"
          >
          <input
            v-model.trim="mintForm.uri"
            class="input input-bordered w-full"
            placeholder="uri (optional)"
            :disabled="false"
          >
          <input
            v-model.trim="mintForm.uriHash"
            class="input input-bordered w-full"
            placeholder="uri hash (optional)"
            :disabled="false"
          >
        </div>
        <div class="text-xs opacity-70">
          Owner: <span class="font-mono">{{ rootNameOwner }}</span>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <h2 class="text-xl font-medium">
        Class: <span class="font-mono">{{ classId }}</span>
      </h2>
    </div>
    <div
      v-if="isLoading"
      class="text-base-content/70 mt-2"
    >
      Loading…
    </div>
    <div
      v-else-if="error"
      class="text-error mt-2"
    >
      {{ error }}
    </div>
    <div
      v-else
      class="mt-2"
    >
      <div
        v-if="classNFTs.length === 0"
        class="text-base-content/70"
      >
        No NFTs in this class.
      </div>
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="table">
          <thead>
            <tr>
              <th>NFT ID</th>
              <th>Listed</th>
              <th>Valuation</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="n in classNFTs"
              :key="n.id"
            >
              <td class="font-mono">
                <router-link
                  :to="`/names/${encodeURIComponent(
                    (classId || '').split('/')[0] || ''
                  )}/nfts/${encodeURIComponent(classId)}/${encodeURIComponent(
                    n.id
                  )}`"
                  class="link"
                >
                  {{ n.id }}
                </router-link>
              </td>
              <td>
                <div
                  v-if="n.data?.listed"
                  class="badge badge-success"
                >
                  listed
                </div>
                <span v-else>—</span>
              </td>
              <td>
                <span v-if="formatValuation(n).label">
                  {{ formatValuation(n).amount }} {{ formatValuation(n).label }}
                </span>
                <span v-else>—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, reactive, inject } from "vue";
import { useRoute } from "vue-router";
import { useWallet } from "@/composables/useWallet";
import { useDenom } from "@/composables/useDenom";

const route = useRoute();
const chainInfo = inject("chainInfo", { restUrl: "" });
const { unlockedWallets, localCosmJsWallets, sendMsg } = useWallet();
const {
  getDisplayOptions,
  getDisplayInfoForBase,
  baseToDisplay,
  loadDenomMetadata,
} = useDenom();

const classId = computed(() => String(route.params.class || ""));
const isLoading = ref(false);
const error = ref("");
const classNFTs = ref([]);

const mintForm = reactive({ nftId: "", uri: "", uriHash: "" });
const rootName = computed(() =>
  String((classId.value || "").split("/")[0] || "")
);
const rootNameOwner = ref("");
const canMint = computed(() => String(mintForm.nftId || "").trim().length > 0);

function formatValuation(obj) {
  const coin = obj?.data?.valuation || { amount: "0", denom: "" };
  const denom = String(coin?.denom || "");
  if (!denom) return { amount: "0", label: "" };
  const amount = String(coin?.amount || "0");
  const { display } = getDisplayInfoForBase(denom);
  return { amount: baseToDisplay(amount, denom), label: display };
}

async function loadClassNFTs() {
  isLoading.value = true;
  error.value = "";
  classNFTs.value = [];
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
    // sort locally by valuation desc then id
    collected.sort((a, b) => {
      const aa = BigInt(a?.data?.valuation?.amount || "0");
      const bb = BigInt(b?.data?.valuation?.amount || "0");
      if (aa === bb)
        return String(a?.id || "").localeCompare(String(b?.id || ""));
      return aa > bb ? -1 : 1;
    });
    classNFTs.value = collected;
  } catch (e) {
    error.value = e?.message || "Failed to load NFTs for class";
  } finally {
    isLoading.value = false;
  }
}

async function loadRootOwner() {
  try {
    rootNameOwner.value = "";
    const url = `${
      chainInfo.restUrl
    }/dysonprotocol/nameservice/v1/resolve_name/${encodeURIComponent(
      rootName.value
    )}`;
    const resp = await fetch(url);
    if (!resp.ok) return;
    const json = await resp.json();
    rootNameOwner.value = String(json?.address || "");
  } catch {}
}

async function mintNft() {
  if (!canMint.value) return;
  isLoading.value = true;
  error.value = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgMintNFT",
      owner: rootNameOwner.value,
      class_id: classId.value,
      nft_id: String(mintForm.nftId || ""),
      uri: String(mintForm.uri || ""),
      uri_hash: String(mintForm.uriHash || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: rootNameOwner.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    mintForm.nftId = "";
    mintForm.uri = "";
    mintForm.uriHash = "";
    await loadClassNFTs();
  } catch (e) {
    error.value = e?.message || "Failed to mint NFT";
  } finally {
    isLoading.value = false;
  }
}

async function reload() {
  await loadDenomMetadata();
  await Promise.all([loadClassNFTs(), loadRootOwner()]);
}

defineExpose({ reload, isLoading });

onMounted(reload);

watch(
  () => classId.value,
  () => reload()
);
</script>
