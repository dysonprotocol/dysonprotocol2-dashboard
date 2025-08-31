<template>
  <div>
    <!-- Create Class (when browsing via /names/:name/nfts) -->
    <div
      v-if="nameParam && showClassForm"
      class="card bg-base-200 mb-4"
    >
      <div class="card-body gap-3">
        <div class="flex items-center justify-between">
          <div class="text-lg font-medium">
            Create NFT Class
          </div>
          <button
            class="btn btn-sm btn-primary"
            :disabled="!canSaveClass || isLoading"
            @click="saveClass"
          >
            Create
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            v-model.trim="classForm.classId"
            class="input input-bordered w-full"
            :placeholder="`class id (e.g. ${nameParam}/foo)`"
            :disabled="false"
          >
          <input
            v-model.trim="classForm.name"
            class="input input-bordered w-full"
            placeholder="name (optional)"
            :disabled="false"
          >
          <input
            v-model.trim="classForm.symbol"
            class="input input-bordered w-full"
            placeholder="symbol (optional)"
            :disabled="false"
          >
          <input
            v-model.trim="classForm.uri"
            class="input input-bordered w-full"
            placeholder="uri (optional)"
            :disabled="false"
          >
        </div>
        <textarea
          v-model.trim="classForm.description"
          class="textarea textarea-bordered w-full"
          placeholder="description (optional)"
          :disabled="false"
        />
        <div class="text-xs opacity-70">
          Owner: <span class="font-mono">{{ destAddress }}</span>
          <span
            v-if="isDestImported && !isDestUnlocked"
            class="text-warning"
          >(unlock this wallet to enable)</span>
        </div>
      </div>
    </div>

    <div
      v-if="isLoading"
      class="text-base-content/70"
    >
      Loading…
    </div>
    <div
      v-else-if="error"
      class="text-error"
    >
      {{ error }}
    </div>
    <div v-else>
      <div
        v-if="classesView.length === 0"
        class="text-base-content/70"
      >
        No classes found.
      </div>
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="table">
          <thead>
            <tr>
              <th>Class</th>
              <th>Name</th>
              <th>Symbol</th>
              <th>Description</th>
              <th>Supply</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in classesView"
              :key="c.id"
            >
              <td class="font-mono">
                <router-link
                  :to="`/names/${encodeURIComponent(
                    nameParam || ''
                  )}/nfts/${encodeURIComponent(c.id)}`"
                  class="link"
                >
                  {{ c.id }}
                </router-link>
              </td>
              <td>{{ c.name || "—" }}</td>
              <td>{{ c.symbol || "—" }}</td>
              <td class="whitespace-pre-wrap break-words">
                {{ c.description || "—" }}
              </td>
              <td class="font-mono">
                {{ supplyMap[c.id] || "—" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, inject } from "vue";
import { useRoute } from "vue-router";
import { useWallet } from "@/composables/useWallet";

const route = useRoute();
const chainInfo = inject("chainInfo", { restUrl: "" });

const { unlockedWallets, localCosmJsWallets, sendMsg } = useWallet();

const isLoading = ref(false);
const error = ref("");
const classes = ref([]);
const supplyMap = ref({});

const nameParam = computed(() => String(route.params.name || ""));
const destAddress = computed(() => String(route.meta?.resolvedAddress || ""));

const isDestImported = computed(() => true);

const isDestUnlocked = computed(() => true);

const showClassForm = computed(() => !!nameParam.value);

const classForm = reactive({
  classId: "",
  name: "",
  symbol: "",
  description: "",
  uri: "",
  uriHash: "",
});

watch(
  () => nameParam.value,
  () => {
    classForm.classId = nameParam.value || "";
  },
  { immediate: true }
);

const canSaveClass = computed(() => {
  const id = String(classForm.classId || "");
  if (!id || !nameParam.value) return false;
  return id === nameParam.value || id.startsWith(`${nameParam.value}/`);
});

async function saveClass() {
  if (!canSaveClass.value) return;
  isLoading.value = true;
  error.value = "";
  try {
    const msg = {
      "@type": "/dysonprotocol.nameservice.v1.MsgSaveClass",
      name_destination: destAddress.value,
      class_id: String(classForm.classId || ""),
      name: String(classForm.name || ""),
      symbol: String(classForm.symbol || ""),
      description: String(classForm.description || ""),
      uri: String(classForm.uri || ""),
      uri_hash: String(classForm.uriHash || ""),
    };
    const res = await sendMsg({
      msg,
      executorAddress: destAddress.value,
      gasLimit: "auto",
    });
    if (!res.success) throw new Error(res.rawLog || `code=${res.code}`);
    await loadClasses();
  } catch (e) {
    error.value = e?.message || "Failed to create class";
  } finally {
    isLoading.value = false;
  }
}

async function loadClasses() {
  isLoading.value = true;
  error.value = "";
  classes.value = [];
  supplyMap.value = {};
  try {
    const collected = [];
    let nextKey = "";
    do {
      const url = `${
        chainInfo.restUrl
      }/dysonprotocol/nft/v1beta1/classes?pagination.limit=200${
        nextKey ? `&pagination.key=${encodeURIComponent(nextKey)}` : ""
      }`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
      const json = await resp.json();
      collected.push(...(json?.classes || []));
      nextKey = json?.pagination?.next_key || "";
    } while (nextKey);
    classes.value = collected;

    const results = await Promise.all(
      collected.slice(0, 50).map(async (c) => {
        try {
          const r = await fetch(
            `${
              chainInfo.restUrl
            }/dysonprotocol/nft/v1beta1/supply?class_id=${encodeURIComponent(
              c.id
            )}`
          );
          if (!r.ok) return [c.id, "-"];
          const j = await r.json();
          return [c.id, String(j?.amount || "0")];
        } catch {
          return [c.id, "-"];
        }
      })
    );
    const map = {};
    for (const [id, amount] of results) map[id] = amount;
    supplyMap.value = map;
  } catch (e) {
    error.value = e?.message || "Failed to load classes";
  } finally {
    isLoading.value = false;
  }
}

const classesView = computed(() => {
  const all = Array.isArray(classes.value) ? classes.value : [];
  const np = String(route.params.name || "");
  if (!np) return all;
  return all.filter((c) => String(c?.id || "").startsWith(`${np}`));
});

async function reload() {
  await loadClasses();
}

defineExpose({ reload });

onMounted(loadClasses);
</script>
