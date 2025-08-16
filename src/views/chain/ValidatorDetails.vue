<template>
  <div class="p-4 max-w-5xl mx-auto">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold">Validator Details</h1>
        <div class="text-sm text-base-content/60 mt-1 font-mono break-all">
          <AddressDisplay :address="valAddress" />
        </div>
      </div>
    </div>

    <div class="mt-4">
      <div v-if="isLoading" class="text-base-content/70">Loading…</div>
      <div v-else-if="error" class="alert alert-error">{{ error }}</div>

      <div v-else class="space-y-4">
        <div class="card bg-base-200 shadow">
          <div class="card-body">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="grid grid-cols-3 items-center gap-2">
                <div class="opacity-70">moniker</div>
                <div class="sm:col-span-2 font-medium">
                  {{ validator?.description?.moniker || "" }}
                </div>
              </div>
              <div class="grid grid-cols-3 items-center gap-2">
                <div class="opacity-70">operator</div>
                <div class="sm:col-span-2 font-mono break-all">
                  <AddressDisplay
                    :address="validator?.operator_address || ''"
                  />
                </div>
              </div>
              <div class="grid grid-cols-3 items-center gap-2">
                <div class="opacity-70">status</div>
                <div class="sm:col-span-2">{{ validator?.status }}</div>
              </div>
              <div class="grid grid-cols-3 items-center gap-2">
                <div class="opacity-70">jailed</div>
                <div class="sm:col-span-2">
                  {{ validator?.jailed ? "true" : "false" }}
                </div>
              </div>
              <div class="grid grid-cols-3 items-center gap-2">
                <div class="opacity-70">tokens</div>
                <div class="sm:col-span-2 font-mono">
                  <span v-if="bondDenom">
                    {{
                      baseToDisplay(String(validator?.tokens || "0"), bondDenom)
                    }}
                    {{ getDisplayInfoForBase(bondDenom).display }}
                  </span>
                  <span v-else>
                    {{ validator?.tokens || "" }}
                  </span>
                </div>
              </div>
              <div class="grid grid-cols-3 items-center gap-2">
                <div class="opacity-70">delegator_shares</div>
                <div class="sm:col-span-2 font-mono">
                  {{ validator?.delegator_shares }}
                </div>
              </div>
              <div class="grid grid-cols-3 items-center gap-2">
                <div class="opacity-70">commission</div>
                <div class="sm:col-span-2 font-mono">
                  {{ validator?.commission?.commission_rates?.rate || "" }}
                </div>
              </div>
              <div class="grid grid-cols-3 items-center gap-2">
                <div class="opacity-70">min_self_delegation</div>
                <div class="sm:col-span-2 font-mono">
                  <span v-if="bondDenom">
                    {{
                      baseToDisplay(
                        String(validator?.min_self_delegation || "0"),
                        bondDenom
                      )
                    }}
                    {{ getDisplayInfoForBase(bondDenom).display }}
                  </span>
                  <span v-else>
                    {{ validator?.min_self_delegation || "" }}
                  </span>
                </div>
              </div>
              <div class="grid grid-cols-3 items-center gap-2">
                <div class="opacity-70">unbonding_height</div>
                <div class="sm:col-span-2 font-mono">
                  {{ validator?.unbonding_height || "" }}
                </div>
              </div>
              <div class="grid grid-cols-3 items-center gap-2">
                <div class="opacity-70">unbonding_time</div>
                <div class="sm:col-span-2 font-mono">
                  {{ validator?.unbonding_time || "" }}
                </div>
              </div>
              <div class="grid grid-cols-3 items-center gap-2">
                <div class="opacity-70">consensus_pubkey</div>
                <div class="sm:col-span-2 font-mono break-all">
                  {{ validator?.consensus_pubkey?.key || "" }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-base-200 shadow">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <h2 class="card-title">Delegations</h2>
              <div class="text-sm opacity-70">
                {{ delegations.length }} delegation(s)
              </div>
            </div>
            <div v-if="isLoadingDelegations" class="text-base-content/70">
              Loading…
            </div>
            <div v-else-if="delegationsError" class="text-error">
              {{ delegationsError }}
            </div>
            <div v-else class="overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>delegator</th>
                    <th class="text-right">shares</th>
                    <th class="text-right">balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="d in delegations"
                    :key="
                      d?.delegation?.delegator_address +
                      ':' +
                      d?.delegation?.validator_address
                    "
                  >
                    <td class="font-mono break-all">
                      <AddressDisplay
                        :address="d?.delegation?.delegator_address || ''"
                      />
                    </td>
                    <td class="text-right font-mono">
                      {{ d?.delegation?.shares || "" }}
                    </td>
                    <td class="text-right font-mono">
                      <span v-if="d?.balance?.denom">
                        {{
                          baseToDisplay(
                            String(d?.balance?.amount || "0"),
                            d?.balance?.denom
                          )
                        }}
                        {{ getDisplayInfoForBase(d?.balance?.denom).display }}
                      </span>
                      <span v-else>
                        {{ d?.balance?.amount || "" }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="delegations.length === 0">
                    <td colspan="3" class="opacity-70">No delegations</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card bg-base-200 shadow">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <h2 class="card-title">Unbonding Delegations</h2>
              <div class="text-sm opacity-70">
                {{ unbondingsCount }} entry/entries
              </div>
            </div>
            <div v-if="isLoadingUnbondings" class="text-base-content/70">
              Loading…
            </div>
            <div v-else-if="unbondingsError" class="text-error">
              {{ unbondingsError }}
            </div>
            <div v-else class="overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>delegator</th>
                    <th>entries</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="u in unbondings" :key="u?.delegator_address">
                    <td class="font-mono break-all">
                      <AddressDisplay :address="u?.delegator_address || ''" />
                    </td>
                    <td>
                      <div class="flex flex-col gap-1">
                        <div
                          v-for="(e, idx) in u?.entries || []"
                          :key="u?.delegator_address + ':' + idx"
                          class="text-xs font-mono"
                        >
                          <span v-if="bondDenom">
                            {{
                              baseToDisplay(
                                String(e?.balance || "0"),
                                bondDenom
                              )
                            }}
                            {{ getDisplayInfoForBase(bondDenom).display }}
                          </span>
                          <span v-else>{{ e?.balance || "" }}</span>
                          at {{ e?.completion_time || "" }}
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="unbondings.length === 0">
                    <td colspan="2" class="opacity-70">
                      No unbonding delegations
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject, ref, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useDenom } from "@/composables/useDenom";
import AddressDisplay from "@/components/AddressDisplay.vue";

const route = useRoute();
const valAddress = computed(() => String(route.params.valAddress || ""));

const CHAIN_INFO = inject("chainInfo", {
  restUrl: "",
});

const { ensureDenomsLoaded, baseToDisplay, getDisplayInfoForBase } = useDenom();

const validator = ref(null);
const isLoading = ref(false);
const error = ref("");

const bondDenom = ref("");
async function loadParams() {
  const u = `${CHAIN_INFO.restUrl}/cosmos/staking/v1beta1/params`;
  const r = await fetch(u);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
  const json = await r.json();
  bondDenom.value = String(json?.params?.bond_denom || "");
}

async function loadValidator() {
  if (!valAddress.value) return;
  isLoading.value = true;
  error.value = "";
  validator.value = null;
  try {
    const u = `${
      CHAIN_INFO.restUrl
    }/cosmos/staking/v1beta1/validators/${encodeURIComponent(
      valAddress.value
    )}`;
    const r = await fetch(u);
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const json = await r.json();
    validator.value = json?.validator || null;
  } catch (e) {
    error.value = e?.message || "Failed to load validator";
  } finally {
    isLoading.value = false;
  }
}

const delegations = ref([]);
const isLoadingDelegations = ref(false);
const delegationsError = ref("");
async function loadDelegations() {
  if (!valAddress.value) return;
  isLoadingDelegations.value = true;
  delegationsError.value = "";
  delegations.value = [];
  try {
    const url = new URL(
      `${
        CHAIN_INFO.restUrl
      }/cosmos/staking/v1beta1/validators/${encodeURIComponent(
        valAddress.value
      )}/delegations`
    );
    url.searchParams.set("pagination.limit", "200");
    const r = await fetch(url.toString());
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const json = await r.json();
    delegations.value = Array.isArray(json?.delegation_responses)
      ? json.delegation_responses
      : [];
  } catch (e) {
    delegationsError.value = e?.message || "Failed to load delegations";
  } finally {
    isLoadingDelegations.value = false;
  }
}

const unbondings = ref([]);
const isLoadingUnbondings = ref(false);
const unbondingsError = ref("");
const unbondingsCount = computed(() =>
  Array.isArray(unbondings.value)
    ? unbondings.value.reduce(
        (acc, u) => acc + (Array.isArray(u?.entries) ? u.entries.length : 0),
        0
      )
    : 0
);
async function loadUnbondings() {
  if (!valAddress.value) return;
  isLoadingUnbondings.value = true;
  unbondingsError.value = "";
  unbondings.value = [];
  try {
    const url = new URL(
      `${
        CHAIN_INFO.restUrl
      }/cosmos/staking/v1beta1/validators/${encodeURIComponent(
        valAddress.value
      )}/unbonding_delegations`
    );
    url.searchParams.set("pagination.limit", "200");
    const r = await fetch(url.toString());
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const json = await r.json();
    unbondings.value = Array.isArray(json?.unbonding_delegations)
      ? json.unbonding_delegations
      : [];
  } catch (e) {
    unbondingsError.value = e?.message || "Failed to load unbondings";
  } finally {
    isLoadingUnbondings.value = false;
  }
}

watch(
  () => valAddress.value,
  () => {
    ensureDenomsLoaded();
    loadParams();
    loadValidator();
    loadDelegations();
    loadUnbondings();
  },
  { immediate: true }
);
</script>
