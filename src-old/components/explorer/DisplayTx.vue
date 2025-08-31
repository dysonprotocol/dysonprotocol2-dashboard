<template>
  <section class="w-full p-4 border border-base-300 bg-base-100">
    <!-- Transaction Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <h3 class="text-lg font-semibold">
          Transaction
        </h3>
        <div
          class="badge"
          :class="
            txStatus === 'success'
              ? 'badge-success'
              : txStatus === 'failed'
                ? 'badge-error'
                : 'badge-warning'
          "
        >
          {{ txStatus.toUpperCase() }}
        </div>
      </div>
      <div
        v-if="txData.hash"
        class="text-sm"
      >
        <router-link
          :to="`/txs/${txData.hash}`"
          class="link link-primary"
        >
          <TxHashDisplay
            :hash="txData.hash"
            :truncate="8"
          />
        </router-link>
      </div>
    </div>

    <!-- Transaction Metadata as YAML -->
    <div class="mb-6">
      <h4 class="text-md font-medium mb-2">
        Metadata
      </h4>
      <div class="bg-base-200 text-base-content overflow-x-auto">
        <pre><code>{{ yamlMetadata }}</code></pre>
      </div>
    </div>

    <!-- Gas and Fee Information -->
    <div
      v-if="hasGasInfo"
      class="mb-6"
    >
      <h4 class="text-md font-medium mb-2">
        Gas & Fees
      </h4>
      <div class="stats stats-horizontal shadow bg-base-200 w-full">
        <div class="stat">
          <div class="stat-title">
            Gas Used
          </div>
          <div class="stat-value text-sm">
            {{ formatNumber(gasUsed) }}
          </div>
        </div>
        <div class="stat">
          <div class="stat-title">
            Gas Wanted
          </div>
          <div class="stat-value text-sm">
            {{ formatNumber(gasWanted) }}
          </div>
        </div>
        <div class="stat">
          <div class="stat-title">
            Gas Efficiency
          </div>
          <div class="stat-value text-sm">
            {{ gasEfficiency }}%
          </div>
        </div>
        <div
          v-if="feeAmount"
          class="stat"
        >
          <div class="stat-title">
            Fee
          </div>
          <div class="stat-value text-sm">
            {{ feeAmount }}
          </div>
        </div>
      </div>
    </div>

    <!-- Messages -->
    <div v-if="hasMessages">
      <h4 class="text-md font-medium mb-3">
        Messages ({{ messages.length }})
      </h4>
      <div class="flex flex-col gap-4">
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="border border-base-300 p-3 bg-base-50"
        >
          <div class="text-xs text-base-content/60 mb-2">
            Message {{ index + 1 }}
          </div>
          <DisplayMsg :msg-data="message" />
        </div>
      </div>
    </div>

    <!-- No Messages State -->
    <div
      v-else
      class="text-base-content/60 italic text-center py-4"
    >
      No messages in this transaction.
    </div>

    <!-- Events -->
    <div
      v-if="hasEvents"
      class="mt-6 collapse collapse-arrow bg-base-200"
    >
      <input type="checkbox">
      <div class="collapse-title text-md font-medium">
        Events ({{ events.length }})
      </div>
      <div class="collapse-content">
        <div class="space-y-3">
          <div
            v-for="(event, index) in events"
            :key="index"
            class="card bg-base-200 shadow-sm"
          >
            <div class="card-body p-4">
              <div class="flex items-center justify-between mb-3">
                <h5 class="font-semibold text-sm">
                  {{ event.type }}
                </h5>
                <div class="badge badge-outline">
                  Event {{ index + 1 }}
                </div>
              </div>

              <div
                v-if="event.attributes?.length > 0"
                class="space-y-2"
              >
                <div class="text-xs font-medium text-base-content/70 mb-2">
                  Attributes:
                </div>
                <div class="overflow-x-auto">
                  <table class="table table-xs table-zebra">
                    <thead>
                      <tr>
                        <th>Key</th>
                        <th>Value</th>
                        <th>Indexed</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(attr, attrIndex) in event.attributes"
                        :key="attrIndex"
                      >
                        <td class="font-mono text-xs">
                          {{ attr.key }}
                        </td>
                        <td class="font-mono text-xs break-all max-w-xs">
                          <pre
                            class="text-xs overflow-x-auto bg-base-300 p-2 rounded"
                          ><code>{{ formatAttributeValueAsYaml(attr.value) }}</code></pre>
                        </td>
                        <td>
                          <div
                            class="badge badge-xs"
                            :class="
                              attr.index ? 'badge-success' : 'badge-ghost'
                            "
                          >
                            {{ attr.index ? "Yes" : "No" }}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                v-else
                class="text-xs text-base-content/60 italic"
              >
                No attributes
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import yaml from "js-yaml";
import DisplayMsg from "./DisplayMsg.vue";
import TxHashDisplay from "@/components/TxHashDisplay.vue";
import { decodeJsonStringsDeep } from "@/utils/jsonDecode";

const props = defineProps({ txData: { type: Object, required: true } });

const txStatus = computed(() => {
  const code = props.txData.code;
  if (code === undefined || code === null) return "unknown";
  return code === 0 ? "success" : "failed";
});

const yamlMetadata = computed(() => {
  const { messages, gas_used, gas_wanted, fee, events, ...metadata } =
    props.txData;

  const cleanMetadata = {
    ...metadata,
    hash: props.txData.hash || "N/A",
    height: props.txData.height || "N/A",
    timestamp: props.txData.timestamp || "N/A",
    memo: props.txData.memo || "",
  };

  const decodedMetadata = decodeJsonStringsDeep(cleanMetadata);

  try {
    return yaml.dump(decodedMetadata, {
      skipInvalid: true,
      lineWidth: 80,
      noRefs: true,
    });
  } catch (error) {
    console.warn("Failed to convert tx metadata to YAML:", error);
    return JSON.stringify(decodedMetadata, null, 2);
  }
});

const hasGasInfo = computed(() => {
  return (
    props.txData.gas_used !== undefined || props.txData.gas_wanted !== undefined
  );
});

const gasUsed = computed(() => {
  return parseInt(String(props.txData.gas_used || 0));
});

const gasWanted = computed(() => {
  return parseInt(String(props.txData.gas_wanted || 0));
});

const gasEfficiency = computed(() => {
  if (!gasWanted.value || gasWanted.value === 0) return 0;
  return Math.round((gasUsed.value / gasWanted.value) * 100);
});

const feeAmount = computed(() => {
  const fees = props.txData.fee;
  if (!fees || !Array.isArray(fees) || fees.length === 0) return null;

  return fees.map((f) => `${f.amount} ${f.denom}`).join(", ");
});

const messages = computed(() => {
  const list = Array.isArray(props.txData.messages)
    ? props.txData.messages
    : [];
  return decodeJsonStringsDeep(list);
});

const hasMessages = computed(() => {
  return messages.value.length > 0;
});

const events = computed(() => {
  const list = Array.isArray(props.txData.events) ? props.txData.events : [];
  return decodeJsonStringsDeep(list);
});

const hasEvents = computed(() => {
  return events.value.length > 0;
});

const formatNumber = (num) => {
  return new Intl.NumberFormat().format(num);
};

const formatAttributeValue = (value) => {
  // Try to format JSON strings nicely
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "object") {
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // Not JSON, return as-is
  }

  // Truncate very long values
  if (value.length > 100) {
    return value.substring(0, 100) + "...";
  }

  return value;
};

const formatAttributeValueAsYaml = (value) => {
  const processedValue = decodeJsonStringsDeep(value);
  try {
    return yaml
      .dump(processedValue, {
        skipInvalid: true,
        lineWidth: 120,
        noRefs: true,
        indent: 2,
      })
      .trim();
  } catch (error) {
    try {
      return JSON.stringify(processedValue, null, 2);
    } catch {
      return String(processedValue);
    }
  }
};
</script>
