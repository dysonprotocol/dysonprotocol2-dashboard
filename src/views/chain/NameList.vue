<template>
  <div class="max-w-5xl mx-auto p-4 space-y-4">
    <!-- Register Name Component -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <div class="lg:col-span-2 space-y-3">
        <RegisterName />
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
                <th>View details</th>
                <th>Go to dwapp</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="nft in nftsView" :key="nft.id">
                <td class="font-mono">{{ nft.id }}</td>
                <td>
                  <span v-if="formatValuation(nft).label">
                    {{ formatValuation(nft).amount }}
                    {{ formatValuation(nft).label }}
                  </span>
                  <span v-else>—</span>
                </td>
                <td>
                  <router-link :to="`/names/${nft.id}`" class="link"
                    >View details</router-link
                  >
                </td>
                <td>
                  <a
                    :href="`${chainInfo.restUrl}/redirect-to-dwapp/${nft.id}`"
                    class="link inline-flex items-center"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ nft.id }}
                    <ArrowTopRightOnSquareIcon
                      class="w-4 h-4 inline-block ml-1"
                    />
                  </a>
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
import { ref, inject, computed, onMounted } from "vue";
import { useWallet } from "@/composables/useWallet";
import RegisterName from "@/components/nameservice/RegisterName.vue";
import { ArrowTopRightOnSquareIcon } from "@heroicons/vue/24/outline";

const chainInfo = inject("chainInfo", { restUrl: "" });

// removed search state
const isLoadingAll = ref(false);
const allError = ref("");
const allNames = ref([]);
const allNfts = ref([]); // full NFT objects
const selectedExecutor = ref("");
const hasExecutor = computed(() => !!selectedExecutor.value);

const { loadDenomMetadata, getDisplayOptions } = useWallet();

// Nameservice params (allowed denoms)
const allowedDenoms = ref([]);
const allowedDisplayOptions = ref([]); // [{ display: string, name: string, base: string }]
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
}

onMounted(() => {
  loadNameserviceParams();
  loadDenomMetadata();
});

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
