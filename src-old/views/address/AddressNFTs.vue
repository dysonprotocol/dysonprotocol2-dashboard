<template>
  <div class="max-w-5xl mx-auto p-4 space-y-4">
    <div class="space-y-2">
      <h3 class="text-lg font-medium">Owned by address</h3>
      <div v-if="isLoadingOwned" class="text-base-content/70">Loading…</div>
      <div v-else-if="ownedError" class="text-error">{{ ownedError }}</div>
      <div v-else>
        <div v-if="ownedView.length === 0" class="text-base-content/70">
          No NFTs owned by this address.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Token ID</th>
                <th>Valuation</th>
                <th>Listed</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="nft in ownedView" :key="`${nft.class_id}:${nft.id}`">
                <td class="font-mono">
                  <router-link
                    :to="`/names/${encodeURIComponent(
                      (nft.class_id || '').split('/')[0] || ''
                    )}/nfts/${encodeURIComponent(nft.class_id)}`"
                    class="link"
                  >
                    {{ nft.class_id }}
                  </router-link>
                </td>
                <td class="font-mono">
                  <router-link
                    v-if="nft.class_id === 'nameservice.dys'"
                    :to="`/names/${nft.id}`"
                    class="link"
                  >
                    {{ nft.id }}
                  </router-link>
                  <router-link
                    v-else
                    :to="`/names/${encodeURIComponent(
                      (nft.class_id || '').split('/')[0] || ''
                    )}/nfts/${encodeURIComponent(
                      nft.class_id
                    )}/${encodeURIComponent(nft.id)}`"
                    class="link"
                  >
                    {{ nft.id }}
                  </router-link>
                </td>
                <td>
                  <span v-if="formatValuation(nft).label">
                    {{ formatValuation(nft).amount }}
                    {{ formatValuation(nft).label }}
                  </span>
                  <span v-else>—</span>
                </td>
                <td>
                  <div v-if="nft.data?.listed" class="badge badge-success">
                    listed
                  </div>
                  <span v-else>—</span>
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
import { ref, computed, onMounted, watch, inject } from "vue";
import { useRoute } from "vue-router";
import { useWallet } from "@/composables/useWallet";

const route = useRoute();
const address = computed(() =>
  String(route.meta?.resolvedAddress || route.params.address || "")
);

const { loadDenomMetadata, getDisplayOptions } = useWallet();
const chainInfo = inject("chainInfo", { restUrl: "" });

// Owned NFTs
const isLoadingOwned = ref(false);
const ownedError = ref("");
const ownedNfts = ref([]);

function getDisplayInfoForBase(baseDenom) {
  const opts = getDisplayOptions({ allowedBases: [String(baseDenom || "")] });
  const first = Array.isArray(opts) && opts.length ? opts[0] : null;
  return {
    display: first?.display || String(baseDenom || ""),
    exponent: Number(first?.exponent || 0),
  };
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
  const { display } = getDisplayInfoForBase(denom);
  return { amount: baseToDisplayFor(amount, denom), label: display };
}

async function loadOwned() {
  isLoadingOwned.value = true;
  ownedError.value = "";
  ownedNfts.value = [];
  try {
    const base = route.meta?.resolvedAddress || address.value;
    const collected = [];
    let nextKey = "";
    do {
      const q = `${
        chainInfo.restUrl
      }/dysonprotocol/nft/v1beta1/nfts?owner=${encodeURIComponent(
        base
      )}&pagination.limit=200${
        nextKey ? `&pagination.key=${encodeURIComponent(nextKey)}` : ""
      }`;
      const resp = await fetch(q);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
      const json = await resp.json();
      const page = Array.isArray(json?.nfts) ? json.nfts : [];
      collected.push(...page);
      nextKey = json?.pagination?.next_key || "";
    } while (nextKey);
    ownedNfts.value = collected;
  } catch (e) {
    ownedError.value = e?.message || "Failed to load owned NFTs";
  } finally {
    isLoadingOwned.value = false;
  }
}

const ownedView = computed(() => {
  const arr = Array.isArray(ownedNfts.value) ? [...ownedNfts.value] : [];
  arr.sort((a, b) => {
    const aa = coinAmountBigInt(a?.data?.valuation);
    const bb = coinAmountBigInt(b?.data?.valuation);
    if (aa === bb) {
      const aKey = `${String(a?.class_id || "")}:${String(a?.id || "")}`;
      const bKey = `${String(b?.class_id || "")}:${String(b?.id || "")}`;
      return aKey.localeCompare(bKey);
    }
    return aa > bb ? -1 : 1;
  });
  return arr;
});

async function reload() {
  await Promise.all([loadDenomMetadata(), loadOwned()]);
}

onMounted(reload);

watch(
  () => address.value,
  () => {
    reload();
  }
);
</script>
