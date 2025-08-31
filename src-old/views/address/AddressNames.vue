<template>
  <div class="max-w-5xl">
    <div class="m-2">
      <h2 class="text-lg font-medium">
        Names resolving to this address
      </h2>
      <div
        v-if="isLoadingDest"
        class="text-base-content/70"
      >
        Loading…
      </div>
      <div
        v-else-if="destError"
        class="text-error"
      >
        {{ destError }}
      </div>
      <div v-else>
        <div
          v-if="destNames.length === 0"
          class="text-base-content/70"
        >
          No names resolve to this address.
        </div>
        <ul
          v-else
          class="flex flex-wrap gap-2"
        >
          <li
            v-for="n in destNames"
            :key="n"
            class="badge badge-ghost"
          >
            <router-link
              :to="`/names/${n}`"
              class="link"
            >
              {{ n }}
            </router-link>
          </li>
        </ul>
      </div>
    </div>

    <div class="m-2">
      <h2 class="text-lg font-medium">
        Owned by address
      </h2>
      <div
        v-if="isLoadingOwned"
        class="text-base-content/70"
      >
        Loading…
      </div>
      <div
        v-else-if="ownedError"
        class="text-error"
      >
        {{ ownedError }}
      </div>
      <div v-else>
        <div
          v-if="ownedView.length === 0"
          class="text-base-content/70"
        >
          No names owned by this address.
        </div>
        <div
          v-else
          class="overflow-x-auto"
        >
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Valuation</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="nft in ownedView"
                :key="nft.id"
              >
                <td class="font-mono">
                  <router-link
                    :to="`/names/${nft.id}`"
                    class="link"
                  >
                    {{
                      nft.id
                    }}
                  </router-link>
                </td>
                <td>
                  <span v-if="formatValuation(nft).label">
                    {{ formatValuation(nft).amount }}
                    {{ formatValuation(nft).label }}
                  </span>
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
const chainInfo = inject("chainInfo", { restUrl: "" });
const address = computed(() =>
  String(route.meta?.resolvedAddress || route.params.address || "")
);

const { loadDenomMetadata, getDisplayOptions } = useWallet();

// Owned NFTs
const isLoadingOwned = ref(false);
const ownedError = ref("");
const ownedNfts = ref([]);

// Names by destination
const isLoadingDest = ref(false);
const destError = ref("");
const destNames = ref([]);

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
      }/dysonprotocol/nft/v1beta1/nfts?class_id=nameservice.dys&owner=${encodeURIComponent(
        base
      )}&pagination.limit=200${
        nextKey ? `&pagination.key=${encodeURIComponent(nextKey)}` : ""
      }`;
      const resp = await fetch(q);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
      const json = await resp.json();
      const page = (json?.nfts || []).filter(
        (n) => n?.class_id === "nameservice.dys" && n?.id
        //&&
        //n.id !== "nameservice.dys"
      );
      collected.push(...page);
      nextKey = json?.pagination?.next_key || "";
    } while (nextKey);
    ownedNfts.value = collected;
  } catch (e) {
    ownedError.value = e?.message || "Failed to load owned names";
  } finally {
    isLoadingOwned.value = false;
  }
}

async function loadDestination() {
  isLoadingDest.value = true;
  destError.value = "";
  destNames.value = [];
  try {
    const base = route.meta?.resolvedAddress || address.value;
    const url = `${
      chainInfo.restUrl
    }/dysonprotocol/nameservice/v1/names_by_destination/${encodeURIComponent(
      base
    )}?pagination.limit=200`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    const json = await resp.json();
    destNames.value = Array.isArray(json?.names) ? json.names : [];
  } catch (e) {
    destError.value = e?.message || "Failed to load names by destination";
  } finally {
    isLoadingDest.value = false;
  }
}

const ownedView = computed(() => {
  const arr = Array.isArray(ownedNfts.value) ? [...ownedNfts.value] : [];
  arr.sort((a, b) => {
    const aa = coinAmountBigInt(a?.data?.valuation);
    const bb = coinAmountBigInt(b?.data?.valuation);
    if (aa === bb)
      return String(a?.id || "").localeCompare(String(b?.id || ""));
    return aa > bb ? -1 : 1;
  });
  return arr;
});

async function reload() {
  await Promise.all([loadDenomMetadata(), loadOwned(), loadDestination()]);
}

onMounted(reload);

watch(
  () => address.value,
  () => {
    reload();
  }
);
</script>
