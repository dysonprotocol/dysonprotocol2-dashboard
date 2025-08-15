<template>
  <div class="max-w-3xl mx-auto p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">Denom: {{ denom }}</h1>
      <div class="flex items-center gap-2">
        <router-link
          :to="`/names/${encodeURIComponent(
            routeName
          )}/denoms/${encodeURIComponent(denom)}/owners`"
          class="btn btn-xs"
          >Owners</router-link
        >
        <button class="btn btn-sm" @click="reload">Refresh</button>
      </div>
    </div>

    <fieldset class="fieldset bg-base-200 border-base-300 border p-4">
      <legend class="fieldset-legend">Denom details</legend>
      <div class="text-sm opacity-70 mb-2">Root name</div>
      <div class="font-mono">{{ routeName }}</div>
      <div class="text-sm opacity-70 mt-2">Destination</div>
      <AddressDisplay :address="resolvedAddress" :truncate="0" />
      <div class="divider my-3"></div>
      <div class="text-sm opacity-70 mb-2">Metadata</div>
      <div v-if="isLoadingMeta" class="text-base-content/70">Loading…</div>
      <div v-else-if="metaError" class="text-error">{{ metaError }}</div>
      <div v-else-if="denomMeta && Object.keys(denomMeta).length">
        <table class="table">
          <tbody>
            <tr v-if="denomMeta && denomMeta.base">
              <th class="w-48">Base</th>
              <td class="font-mono break-all">{{ denomMeta.base }}</td>
            </tr>
            <tr v-if="denomMeta && denomMeta.display">
              <th>Display</th>
              <td class="font-mono break-all">{{ denomMeta.display }}</td>
            </tr>
            <tr v-if="denomMeta && denomMeta.name">
              <th>Name</th>
              <td>{{ denomMeta.name }}</td>
            </tr>
            <tr v-if="denomMeta && denomMeta.symbol">
              <th>Symbol</th>
              <td>{{ denomMeta.symbol }}</td>
            </tr>
            <tr v-if="denomMeta && denomMeta.description">
              <th>Description</th>
              <td class="break-words whitespace-pre-wrap">
                {{ denomMeta.description }}
              </td>
            </tr>
            <tr
              v-if="
                denomMeta &&
                Array.isArray(denomMeta.denom_units) &&
                denomMeta.denom_units.length
              "
            >
              <th>Denom Units</th>
              <td>
                <ul class="list-disc list-inside space-y-1">
                  <li v-for="(u, i) in denomMeta.denom_units" :key="i">
                    <span class="font-mono">{{ u.denom }}</span> — exponent
                    {{ u.exponent }}
                    <span v-if="u.aliases && u.aliases.length">
                      , aliases: {{ u.aliases.join(", ") }}
                    </span>
                  </li>
                </ul>
              </td>
            </tr>
            <tr v-if="denomMeta && denomMeta.uri">
              <th>URI</th>
              <td class="font-mono break-all">{{ denomMeta.uri }}</td>
            </tr>
            <tr v-if="denomMeta && denomMeta.uri_hash">
              <th>URI Hash</th>
              <td class="font-mono break-all">{{ denomMeta.uri_hash }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="text-base-content/70">No metadata.</div>
    </fieldset>

    <fieldset class="fieldset bg-base-200 border-base-300 border p-4">
      <legend class="fieldset-legend">Set Denom URI</legend>
      <div class="text-xs opacity-70 mb-2">
        Only <span class="font-mono">{{ routeName }}</span> name destination
        <span class="font-mono">{{ resolvedAddress }}</span> can set the denom
        URI and URI hash.
      </div>
      <form @submit.prevent="saveDenomURI">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            v-model.trim="denomURI"
            class="input input-bordered w-full"
            placeholder="uri (optional)"
            :disabled="busy === 'setUri'"
          />
          <input
            v-model.trim="denomURIHash"
            class="input input-bordered w-full"
            placeholder="uri hash (optional)"
            :disabled="busy === 'setUri'"
          />
        </div>
        <button
          class="btn btn-primary btn-sm mt-2"
          :disabled="busy === 'setUri'"
        >
          save
        </button>
        <div v-if="errURI" class="alert alert-error alert-soft mt-2">
          {{ errURI }}
        </div>
      </form>
    </fieldset>

    <fieldset class="fieldset bg-base-200 border-base-300 border p-4">
      <legend class="fieldset-legend">Set Description</legend>
      <div class="text-xs opacity-70 mb-2">
        Only <span class="font-mono">{{ routeName }}</span> name destination
        <span class="font-mono">{{ resolvedAddress }}</span> can set the denom
        description.
      </div>
      <form @submit.prevent="saveDenomDescription">
        <div class="join w-full">
          <input
            v-model.trim="denomDescription"
            class="input join-item w-full"
            placeholder="description"
            :disabled="busy === 'setDesc'"
          />
          <button
            class="btn join-item btn-primary"
            :disabled="busy === 'setDesc' || !denomDescription"
          >
            save
          </button>
        </div>
        <div v-if="errDescription" class="alert alert-error alert-soft mt-2">
          {{ errDescription }}
        </div>
      </form>
    </fieldset>

    <fieldset class="fieldset bg-base-200 border-base-300 border p-4">
      <legend class="fieldset-legend">Mint</legend>
      <form @submit.prevent="mint">
        <fieldset class="fieldset bg-base-200 border-base-300 border p-3">
          <legend class="fieldset-legend">Mint {{ denom }}</legend>
          <div class="text-xs opacity-70 mb-2">
            Only <span class="font-mono">{{ routeName }}</span> name destination
            <span class="font-mono">{{ resolvedAddress }}</span> can mint coins
            for this denom.
          </div>
          <div class="join w-full">
            <input
              v-model.trim="mintAmount"
              class="input join-item w-full"
              placeholder="amount (base)"
              :disabled="busy === 'mint'"
            />
            <button
              class="btn join-item btn-primary"
              :disabled="busy === 'mint' || !mintAmount"
            >
              mint
            </button>
          </div>
          <div v-if="errMint" class="alert alert-error alert-soft mt-2">
            {{ errMint }}
          </div>
        </fieldset>
      </form>
    </fieldset>

    <fieldset class="fieldset bg-base-200 border-base-300 border p-4">
      <legend class="fieldset-legend">Burn</legend>
      <form @submit.prevent="burn">
        <fieldset class="fieldset bg-base-200 border-base-300 border p-3">
          <legend class="fieldset-legend">Burn {{ denom }}</legend>
          <div class="text-xs opacity-70 mb-2">
            Only <span class="font-mono">{{ routeName }}</span> name destination
            <span class="font-mono">{{ resolvedAddress }}</span> can burn coins
            for this denom.
          </div>
          <div class="join w-full">
            <input
              v-model.trim="burnAmount"
              class="input join-item w-full"
              placeholder="amount (base)"
              :disabled="busy === 'burn'"
            />
            <button
              class="btn join-item btn-primary"
              :disabled="busy === 'burn' || !burnAmount"
            >
              burn
            </button>
          </div>
          <div v-if="errBurn" class="alert alert-error alert-soft mt-2">
            {{ errBurn }}
          </div>
        </fieldset>
      </form>
    </fieldset>

    <fieldset class="fieldset bg-base-200 border-base-300 border p-4">
      <legend class="fieldset-legend">Move coins</legend>
      <form @submit.prevent="moveCoins">
        <fieldset class="fieldset bg-base-200 border-base-300 border p-3">
          <legend class="fieldset-legend">Force move {{ denom }}</legend>
          <div class="text-xs opacity-70 mb-2">
            Only <span class="font-mono">{{ routeName }}</span> name destination
            <span class="font-mono">{{ resolvedAddress }}</span> can force-move
            coins between two accounts.
          </div>
          <div class="join w-full mb-2">
            <input
              v-model.trim="fromAddress"
              class="input join-item w-full"
              placeholder="from address"
              :disabled="busy === 'move'"
            />
            <input
              v-model.trim="fromAmount"
              class="input join-item w-40"
              placeholder="amount (base)"
              :disabled="busy === 'move'"
            />
          </div>
          <div class="join w-full mb-2">
            <input
              v-model.trim="toAddress"
              class="input join-item w-full"
              placeholder="to address"
              :disabled="busy === 'move'"
            />
          </div>
          <button
            class="btn btn-primary btn-sm"
            :disabled="busy === 'move' || !canMove"
          >
            move
          </button>
          <div v-if="errMove" class="alert alert-error alert-soft mt-2">
            {{ errMove }}
          </div>
        </fieldset>
      </form>
    </fieldset>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from "vue";
import { useRoute } from "vue-router";
import { useWallet } from "@/composables/useWallet";
import AddressDisplay from "@/components/AddressDisplay.vue";

const route = useRoute();
const routeName = computed(() => String(route.params.name || ""));
const denom = computed(() => String(route.params.denom || ""));
const chainInfo = inject("chainInfo", { restUrl: "http://localhost:1317" });
const { sendMsg } = useWallet();

const resolvedAddress = ref("");
const busy = ref("");
const errMint = ref("");
const errBurn = ref("");
const errMove = ref("");
const errURI = ref("");
const errDescription = ref("");

const mintAmount = ref("");
const burnAmount = ref("");
const fromAddress = ref("");
const fromAmount = ref("");
const toAddress = ref("");
const denomURI = ref("");
const denomURIHash = ref("");
const denomDescription = ref("");

// Clear errors on input change
watch(denomURI, () => (errURI.value = ""));
watch(denomURIHash, () => (errURI.value = ""));
watch(denomDescription, () => (errDescription.value = ""));

// Denom metadata state
const isLoadingMeta = ref(false);
const metaError = ref("");
const denomMeta = ref({});

async function loadMeta() {
  isLoadingMeta.value = true;
  metaError.value = "";
  denomMeta.value = {};
  try {
    const url = `${
      chainInfo.restUrl
    }/cosmos/bank/v1beta1/denoms_metadata_by_query_string?denom=${encodeURIComponent(
      denom.value
    )}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const m = j?.metadata || {};
    denomMeta.value = m;
    if (!denomURI.value) denomURI.value = String(m?.uri || "");
    if (!denomURIHash.value) denomURIHash.value = String(m?.uri_hash || "");
    if (!denomDescription.value)
      denomDescription.value = String(m?.description || "");
  } catch (e) {
    metaError.value = e?.message || "Failed to load denom metadata";
  } finally {
    isLoadingMeta.value = false;
  }
}
const canMove = computed(
  () =>
    Boolean(fromAddress.value) &&
    Boolean(toAddress.value) &&
    Boolean(fromAmount.value)
);

async function reload() {
  await Promise.all([resolveDest(), loadMeta()]);
}

async function resolveDest() {
  resolvedAddress.value = "";
  try {
    const url = `${
      chainInfo.restUrl
    }/dysonprotocol/nameservice/v1/resolve_name/${encodeURIComponent(
      routeName.value
    )}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    resolvedAddress.value = String(j?.address || "");
  } catch {}
}

async function mint() {
  busy.value = "mint";
  errMint.value = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgMintCoins",
      name_destination: resolvedAddress.value,
      amount: [{ denom: denom.value, amount: String(mintAmount.value || "0") }],
    };
    const res = await sendMsg({
      msg,
      executorAddress: resolvedAddress.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  } catch (e) {
    errMint.value = e?.message || "Failed to mint";
  } finally {
    busy.value = "";
  }
}

async function burn() {
  busy.value = "burn";
  errBurn.value = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgBurnCoins",
      name_destination: resolvedAddress.value,
      amount: [{ denom: denom.value, amount: String(burnAmount.value || "0") }],
    };
    const res = await sendMsg({
      msg,
      executorAddress: resolvedAddress.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  } catch (e) {
    errBurn.value = e?.message || "Failed to burn";
  } finally {
    busy.value = "";
  }
}

async function moveCoins() {
  busy.value = "move";
  errMove.value = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgMoveCoins",
      name_destination: resolvedAddress.value,
      inputs: [
        {
          address: String(fromAddress.value || ""),
          coins: [
            { denom: denom.value, amount: String(fromAmount.value || "0") },
          ],
        },
      ],
      outputs: [
        {
          address: String(toAddress.value || ""),
          coins: [
            { denom: denom.value, amount: String(fromAmount.value || "0") },
          ],
        },
      ],
    };
    const res = await sendMsg({
      msg,
      executorAddress: resolvedAddress.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  } catch (e) {
    errMove.value = e?.message || "Failed to move coins";
  } finally {
    busy.value = "";
  }
}

async function saveDenomURI() {
  busy.value = "setUri";
  errURI.value = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgSetDenomURI",
      name_destination: resolvedAddress.value,
      denom: denom.value,
      uri: String(denomURI.value || ""),
      uri_hash: String(denomURIHash.value || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: resolvedAddress.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  } catch (e) {
    errURI.value = e?.message || "Failed to set denom URI";
  } finally {
    busy.value = "";
  }
}

async function saveDenomDescription() {
  busy.value = "setDesc";
  errDescription.value = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgSetDenomDescription",
      name_destination: resolvedAddress.value,
      denom: denom.value,
      description: String(denomDescription.value || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: resolvedAddress.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
  } catch (e) {
    errDescription.value = e?.message || "Failed to set description";
  } finally {
    busy.value = "";
  }
}

reload();
</script>
