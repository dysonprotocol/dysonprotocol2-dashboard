<template>
  <section class="">
    <!-- Block Metadata as YAML -->
    <div class="bg-base-200 text-base-content overflow-x-auto">
      <pre><code>{{ yamlBlock }}</code></pre>
    </div>

    <!-- Transactions List -->
    <div>
      <h2 class="text-lg font-semibold mb-2">Transactions</h2>
      <div v-if="hasTxs" class="flex flex-col gap-4">
        <DisplayTx
          v-for="(tx, idx) in blockData.txs"
          :key="tx.hash || idx"
          :txData="tx"
        />
      </div>
      <div v-else class="text-base-content/60 italic">
        No transactions in this block.
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, toRefs } from "vue";
import yaml from "js-yaml";
import DisplayTx from "./DisplayTx.vue";

const props = defineProps({ blockData: { type: Object, required: true } });

const { blockData } = toRefs(props);

const yamlBlock = computed(() => {
  // Exclude txs from YAML, show header and metadata only
  const { txs, ...meta } = blockData.value || {};
  return yaml.dump(meta, { skipInvalid: true });
});

const hasTxs = computed(
  () => Array.isArray(blockData.value.txs) && blockData.value.txs.length > 0
);
</script>
