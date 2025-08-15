<template>
  <div class="max-w-3xl mx-auto p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">Owners: {{ denom }}</h1>
      <button class="btn btn-sm" @click="reload">Refresh</button>
    </div>

    <div class="card bg-base-200 shadow">
      <div class="card-body">
        <div v-if="isLoading" class="text-base-content/70">Loading…</div>
        <div v-else-if="error" class="text-error">{{ error }}</div>
        <div v-else>
          <div v-if="owners.length === 0" class="text-base-content/70">
            No owners.
          </div>
          <table v-else class="table">
            <thead>
              <tr>
                <th>Address</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in owners" :key="o.address">
                <td class="font-mono break-all">{{ o.address }}</td>
                <td class="font-mono">{{ o.amount }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const denom = computed(() => String(route.params.denom || ""));
const chainInfo = inject("chainInfo", { restUrl: "http://localhost:1317" });

const isLoading = ref(false);
const error = ref("");
const owners = ref([]);

async function reload() {
  isLoading.value = true;
  error.value = "";
  owners.value = [];
  try {
    // Suggested endpoint: /cosmos/bank/v1beta1/denom_owners_by_query?denom=... (query mode supported in dyson)
    const url = `${
      chainInfo.restUrl
    }/cosmos/bank/v1beta1/denom_owners_by_query?denom=${encodeURIComponent(
      denom.value
    )}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const list = Array.isArray(j?.denom_owners) ? j.denom_owners : [];
    owners.value = list.map((it) => ({
      address: String(it?.address || ""),
      amount: String(it?.balance?.amount || "0"),
    }));
  } catch (e) {
    error.value = e?.message || "Failed to load owners";
  } finally {
    isLoading.value = false;
  }
}

reload();
</script>
