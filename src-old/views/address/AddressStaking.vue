<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-2">
      Staking
    </h2>
    <p class="text-sm opacity-70 mb-4">
      Delegator: <AddressDisplay :address="address" />
    </p>

    <!-- Delegate / Undelegate Forms -->
    <div class="card bg-base-200 mb-6">
      <div class="card-body grid md:grid-cols-2 gap-4">
        <form
          class="grid gap-2"
          @submit.prevent="submitDelegate"
        >
          <h3 class="font-semibold">
            Delegate
          </h3>
          <div class="grid gap-2 sm:grid-cols-2 items-end">
            <div>
              <label class="label">
                <span class="label-text">validator_address</span>
              </label>
              <select
                v-model="delegateForm.validator"
                class="select select-bordered w-full"
              >
                <option value="">
                  Select validator…
                </option>
                <option
                  v-for="v in validators"
                  :key="v.operator_address"
                  :value="v.operator_address"
                >
                  {{
                    (v.description?.moniker || v.operator_address) +
                      " (" +
                      v.status +
                      ")"
                  }}
                </option>
              </select>
            </div>
            <div>
              <AmountDenomSelector
                :base-denoms="stakingAllowedBases"
                :default-base-denom="bondDenom"
                :disabled="isDelegating"
                @update:base="onDelegateBaseUpdate"
              />
            </div>
          </div>
          <button
            class="btn btn-primary btn-sm"
            type="submit"
            :disabled="isDelegating"
          >
            {{ isDelegating ? "Delegating…" : "Delegate" }}
          </button>
          <span
            v-if="delegateError"
            class="text-error text-xs"
          >{{
            delegateError
          }}</span>
        </form>

        <form
          class="grid gap-2"
          @submit.prevent="submitUndelegate"
        >
          <h3 class="font-semibold">
            Undelegate
          </h3>
          <div class="grid gap-2 sm:grid-cols-2 items-end">
            <div>
              <label class="label">
                <span class="label-text">validator_address</span>
              </label>
              <select
                v-model="undelegateForm.validator"
                class="select select-bordered w-full"
              >
                <option value="">
                  Select validator…
                </option>
                <option
                  v-for="v in validators"
                  :key="v.operator_address"
                  :value="v.operator_address"
                >
                  {{
                    (v.description?.moniker || v.operator_address) +
                      " (" +
                      v.status +
                      ")"
                  }}
                </option>
              </select>
            </div>
            <div>
              <AmountDenomSelector
                :base-denoms="stakingAllowedBases"
                :default-base-denom="bondDenom"
                :disabled="isUndelegating"
                @update:base="onUndelegateBaseUpdate"
              />
            </div>
          </div>
          <button
            class="btn btn-primary btn-sm"
            type="submit"
            :disabled="isUndelegating"
          >
            {{ isUndelegating ? "Undelegating…" : "Undelegate" }}
          </button>
          <span
            v-if="undelegateError"
            class="text-error text-xs"
          >{{
            undelegateError
          }}</span>
        </form>
      </div>
    </div>
    <!-- Delegations -->
    <div class="card bg-base-200 mb-6">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <h3 class="card-title">
            Current Delegations
          </h3>
          <div class="card-actions">
            <button
              class="btn btn-xs"
              @click="loadDelegations"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
      <div class="card-body pt-0 text-sm">
        <span
          v-if="delegationsError"
          class="text-error"
        >{{
          delegationsError
        }}</span>
        <span v-else-if="isLoadingDelegations">Loading…</span>
        <span
          v-else
          class="opacity-70"
        >{{ delegations.length }} delegation(s)</span>
      </div>
      <div class="card-body pt-0 overflow-x-auto">
        <table class="table table-zebra table-sm w-full">
          <thead>
            <tr>
              <th>validator</th>
              <th>amount</th>
              <th>shares</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="d in delegations"
              :key="d.delegation?.validator_address"
            >
              <td class="font-mono break-all">
                <AddressDisplay
                  :address="d.delegation?.validator_address || ''"
                />
              </td>
              <td class="font-mono">
                <span v-if="d.balance && d.balance.denom">
                  {{
                    baseToDisplay(
                      String(d.balance.amount || "0"),
                      d.balance.denom
                    )
                  }}
                  {{ getDisplayInfoForBase(d.balance.denom).display }}
                </span>
              </td>
              <td class="font-mono">
                {{ d.delegation?.shares }}
              </td>
            </tr>
            <tr
              v-if="
                !isLoadingDelegations &&
                  !delegationsError &&
                  delegations.length === 0
              "
            >
              <td
                colspan="3"
                class="text-center opacity-70"
              >
                No delegations
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Rewards -->
    <div class="card bg-base-200 mb-6">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <h3 class="card-title">
            Rewards
          </h3>
          <div class="card-actions">
            <button
              class="btn btn-xs"
              @click="loadRewards"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
      <div class="card-body pt-0 text-sm">
        <span
          v-if="rewardsError"
          class="text-error"
        >{{ rewardsError }}</span>
        <span v-else-if="isLoadingRewards">Loading…</span>
        <span
          v-else
          class="opacity-70"
        >{{ rewards.length }} validator(s)</span>
      </div>
      <div class="card-body pt-0 overflow-x-auto">
        <table class="table table-zebra table-sm w-full">
          <thead>
            <tr>
              <th>validator</th>
              <th>rewards</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in rewards"
              :key="r.validator_address"
            >
              <td class="font-mono break-all">
                <AddressDisplay :address="r.validator_address || ''" />
              </td>
              <td class="font-mono">
                <span v-if="r.reward && r.reward.length">
                  {{
                    r.reward
                      .map(
                        (c) =>
                          decBaseToDisplay(String(c.amount || "0"), c.denom) +
                          " " +
                          getDisplayInfoForBase(c.denom).display
                      )
                      .join(", ")
                  }}
                </span>
              </td>
              <td class="text-right">
                <button
                  class="btn btn-xs"
                  :disabled="isWithdrawing"
                  @click="withdrawReward(r.validator_address)"
                >
                  Withdraw
                </button>
              </td>
            </tr>
            <tr
              v-if="!isLoadingRewards && !rewardsError && rewards.length === 0"
            >
              <td
                colspan="3"
                class="text-center opacity-70"
              >
                No rewards
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Unbonding Delegations -->
    <div class="card bg-base-200 mb-6">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <h3 class="card-title">
            Unbonding Delegations
          </h3>
          <div class="card-actions">
            <button
              class="btn btn-xs"
              @click="loadUnbondings"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
      <div class="card-body pt-0 text-sm">
        <span
          v-if="unbondingsError"
          class="text-error"
        >{{
          unbondingsError
        }}</span>
        <span v-else-if="isLoadingUnbondings">Loading…</span>
        <span
          v-else
          class="opacity-70"
        >{{ unbondingCount }} entry(ies)</span>
      </div>
      <div class="card-body pt-0 overflow-x-auto">
        <table class="table table-zebra table-sm w-full">
          <thead>
            <tr>
              <th>validator</th>
              <th>creation_height</th>
              <th>completion_time</th>
              <th>initial_balance</th>
              <th>balance</th>
            </tr>
          </thead>
          <tbody>
            <template
              v-for="u in unbondings"
              :key="u.validator_address"
            >
              <tr
                v-for="e in u.entries || []"
                :key="`${u.validator_address}-${e.creation_height}-${e.completion_time}`"
              >
                <td class="font-mono break-all">
                  <AddressDisplay :address="u.validator_address || ''" />
                </td>
                <td class="font-mono">
                  {{ e.creation_height }}
                </td>
                <td class="font-mono">
                  {{ e.completion_time }}
                </td>
                <td class="font-mono">
                  <span v-if="bondDenom">
                    {{
                      baseToDisplay(String(e.initial_balance || "0"), bondDenom)
                    }}
                    {{ getDisplayInfoForBase(bondDenom).display }}
                  </span>
                  <span v-else>{{ e.initial_balance }}</span>
                </td>
                <td class="font-mono">
                  <span v-if="bondDenom">
                    {{ baseToDisplay(String(e.balance || "0"), bondDenom) }}
                    {{ getDisplayInfoForBase(bondDenom).display }}
                  </span>
                  <span v-else>{{ e.balance }}</span>
                </td>
              </tr>
            </template>
            <tr
              v-if="
                !isLoadingUnbondings && !unbondingsError && unbondingCount === 0
              "
            >
              <td
                colspan="5"
                class="text-center opacity-70"
              >
                No unbonding entries
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useWallet } from "@/composables/useWallet";
import { useDenom } from "@/composables/useDenom";
import AddressDisplay from "@/components/AddressDisplay.vue";
import AmountDenomSelector from "@/components/AmountDenomSelector.vue";

const route = useRoute();
const address = computed(
  () => route.meta?.resolvedAddress || route.params.address
);

const CHAIN_INFO = inject("chainInfo", {
  restUrl: "",
});

const { ensureDenomsLoaded, baseToDisplay, getDisplayInfoForBase } = useDenom();
const bondDenom = ref("");
const stakingAllowedBases = computed(() =>
  bondDenom.value ? [bondDenom.value] : []
);
async function loadParams() {
  const u = `${CHAIN_INFO.restUrl}/cosmos/staking/v1beta1/params`;
  const r = await fetch(u);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
  const json = await r.json();
  bondDenom.value = String(json?.params?.bond_denom || "");
}

// Rewards return DecCoins (decimal base amounts). Convert to display by shifting
// decimal left by the display exponent in addition to existing fractional digits.
function decBaseToDisplay(amountStr, baseDenom) {
  const info = getDisplayInfoForBase(baseDenom);
  const exp = Number(info.exponent || 0);
  let s = String(amountStr || "0").trim();
  if (!/^[0-9]+(?:\.[0-9]+)?$/.test(s)) return s;
  const parts = s.split(".");
  const intPart = parts[0] || "0";
  const fracPart = parts[1] || "";
  let digits = (intPart + fracPart).replace(/^0+/, "");
  if (digits.length === 0) digits = "0";
  const totalFrac = fracPart.length + exp;
  if (totalFrac <= 0) {
    // Shift decimal to the right (unlikely for positive exp), pad zeros
    return digits + "0".repeat(Math.abs(totalFrac));
  }
  let out = "";
  if (digits.length <= totalFrac) {
    const pad = totalFrac - digits.length;
    out = "0." + "0".repeat(pad) + digits;
  } else {
    const idx = digits.length - totalFrac;
    out = digits.slice(0, idx) + "." + digits.slice(idx);
  }
  out = out.replace(/\.0+$/, "");
  if (out.startsWith(".")) out = "0" + out;
  if (out.endsWith(".")) out = out.slice(0, -1);
  return out;
}

// Validators for selects
const validators = ref([]);
async function loadValidators() {
  try {
    const u = new URL(
      `${CHAIN_INFO.restUrl}/cosmos/staking/v1beta1/validators`
    );
    u.searchParams.set("pagination.limit", "200");
    const r = await fetch(u.toString());
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const json = await r.json();
    validators.value = Array.isArray(json?.validators) ? json.validators : [];
  } catch {
    validators.value = [];
  }
}

// Delegations
const delegations = ref([]);
const isLoadingDelegations = ref(false);
const delegationsError = ref("");
async function loadDelegations() {
  if (!address.value) return;
  isLoadingDelegations.value = true;
  delegationsError.value = "";
  delegations.value = [];
  try {
    const u = new URL(
      `${
        CHAIN_INFO.restUrl
      }/cosmos/staking/v1beta1/delegations/${encodeURIComponent(
        String(address.value)
      )}`
    );
    u.searchParams.set("pagination.limit", "200");
    const r = await fetch(u.toString());
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

// Rewards
const rewards = ref([]);
const isLoadingRewards = ref(false);
const rewardsError = ref("");
async function loadRewards() {
  if (!address.value) return;
  isLoadingRewards.value = true;
  rewardsError.value = "";
  rewards.value = [];
  try {
    const u = `${
      CHAIN_INFO.restUrl
    }/cosmos/distribution/v1beta1/delegators/${encodeURIComponent(
      String(address.value)
    )}/rewards`;
    const r = await fetch(u);
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const json = await r.json();
    rewards.value = Array.isArray(json?.rewards) ? json.rewards : [];
  } catch (e) {
    rewardsError.value = e?.message || "Failed to load rewards";
  } finally {
    isLoadingRewards.value = false;
  }
}

// Unbonding delegations
const unbondings = ref([]);
const isLoadingUnbondings = ref(false);
const unbondingsError = ref("");
const unbondingCount = computed(() =>
  Array.isArray(unbondings.value)
    ? unbondings.value.reduce(
        (acc, u) => acc + (Array.isArray(u?.entries) ? u.entries.length : 0),
        0
      )
    : 0
);
async function loadUnbondings() {
  if (!address.value) return;
  isLoadingUnbondings.value = true;
  unbondingsError.value = "";
  unbondings.value = [];
  try {
    const u = new URL(
      `${
        CHAIN_INFO.restUrl
      }/cosmos/staking/v1beta1/delegators/${encodeURIComponent(
        String(address.value)
      )}/unbonding_delegations`
    );
    u.searchParams.set("pagination.limit", "200");
    const r = await fetch(u.toString());
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const json = await r.json();
    unbondings.value = Array.isArray(json?.unbonding_responses)
      ? json.unbonding_responses
      : [];
  } catch (e) {
    unbondingsError.value = e?.message || "Failed to load unbondings";
  } finally {
    isLoadingUnbondings.value = false;
  }
}

watch(
  () => address.value,
  () => {
    ensureDenomsLoaded();
    loadParams();
    loadDelegations();
    loadRewards();
    loadUnbondings();
    loadValidators();
  },
  { immediate: true }
);

// TX helpers
const { sendMsg } = useWallet();

const isWithdrawing = ref(false);
async function withdrawReward(validatorAddress) {
  if (!validatorAddress) return;
  isWithdrawing.value = true;
  try {
    const msg = {
      "@type": "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
      delegator_address: String(address.value),
      validator_address: String(validatorAddress),
    };
    const res = await sendMsg({
      msg,
      executorAddress: String(address.value),
      gasLimit: undefined,
      memo: "",
    });
    if (!res?.success) throw new Error(res?.rawLog || "Withdraw failed");
    await loadRewards();
  } catch (e) {
    alert(e?.message || "Failed to withdraw rewards");
  } finally {
    isWithdrawing.value = false;
  }
}

// Delegate / Undelegate
const isDelegating = ref(false);
const delegateError = ref("");
const delegateForm = ref({ validator: "", amount: "", denom: "udys" });
function onDelegateBaseUpdate(payload) {
  delegateForm.value.amount = String(payload?.amount || "");
  delegateForm.value.denom = String(payload?.denom || "");
}
async function submitDelegate() {
  delegateError.value = "";
  isDelegating.value = true;
  try {
    const msg = {
      "@type": "/cosmos.staking.v1beta1.MsgDelegate",
      delegator_address: String(address.value),
      validator_address: String(delegateForm.value.validator || ""),
      amount: {
        denom: String(delegateForm.value.denom || "udys"),
        amount: String(delegateForm.value.amount || "0"),
      },
    };
    if (!msg.validator_address) throw new Error("validator is required");
    const res = await sendMsg({
      msg,
      executorAddress: String(address.value),
      gasLimit: undefined,
      memo: "",
    });
    if (!res?.success) throw new Error(res?.rawLog || "Delegate failed");
    await loadDelegations();
  } catch (e) {
    delegateError.value = e?.message || "Failed to delegate";
  } finally {
    isDelegating.value = false;
  }
}

const isUndelegating = ref(false);
const undelegateError = ref("");
const undelegateForm = ref({ validator: "", amount: "", denom: "udys" });
function onUndelegateBaseUpdate(payload) {
  undelegateForm.value.amount = String(payload?.amount || "");
  undelegateForm.value.denom = String(payload?.denom || "");
}
async function submitUndelegate() {
  undelegateError.value = "";
  isUndelegating.value = true;
  try {
    const msg = {
      "@type": "/cosmos.staking.v1beta1.MsgUndelegate",
      delegator_address: String(address.value),
      validator_address: String(undelegateForm.value.validator || ""),
      amount: {
        denom: String(undelegateForm.value.denom || "udys"),
        amount: String(undelegateForm.value.amount || "0"),
      },
    };
    if (!msg.validator_address) throw new Error("validator is required");
    const res = await sendMsg({
      msg,
      executorAddress: String(address.value),
      gasLimit: undefined,
      memo: "",
    });
    if (!res?.success) throw new Error(res?.rawLog || "Undelegate failed");
    await loadDelegations();
    await loadRewards();
  } catch (e) {
    undelegateError.value = e?.message || "Failed to undelegate";
  } finally {
    isUndelegating.value = false;
  }
}
</script>
