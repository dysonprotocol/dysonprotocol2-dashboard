<template>
  <div class="w-full">
    <!-- Message Type Header -->
    <div class="flex items-center justify-between mb-2">
      <div class="badge badge-primary badge-outline text-xs">
        {{ messageType }}
      </div>
      <button
        v-if="isLargeMessage"
        @click="isCollapsed = !isCollapsed"
        class="btn btn-xs btn-ghost"
      >
        {{ isCollapsed ? "Expand" : "Collapse" }}
      </button>
    </div>

    <!-- Message Content -->
    <div
      v-if="!isCollapsed"
      class="bg-base-200 text-base-content overflow-x-auto"
      :class="{ 'max-h-64 overflow-y-auto': isLargeMessage }"
    >
      <pre><code>{{ yamlMessage }}</code></pre>
    </div>

    <!-- Collapsed State -->
    <div v-else class="bg-base-200 text-base-content overflow-hidden">
      <pre><code>{{ truncatedYaml }}</code></pre>
      <div class="text-center py-2 text-base-content/60 text-sm">
        ... {{ messageLines - 3 }} more lines
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import yaml from "js-yaml";
import { decodeJsonStringsDeep } from "@/utils/jsonDecode";

const props = defineProps({ msgData: { type: Object, required: true } });

const isCollapsed = ref(false);

const messageType = computed(() => {
  const type = props.msgData["@type"] || "Unknown";
  // Extract just the message name from the full path
  return type.split(".").pop() || type;
});

const yamlMessage = computed(() => {
  try {
    const decoded = decodeJsonStringsDeep(props.msgData);
    return yaml.dump(decoded, {
      skipInvalid: true,
      lineWidth: 80,
      noRefs: true,
    });
  } catch (error) {
    console.warn("Failed to convert message to YAML:", error);
    return JSON.stringify(props.msgData, null, 2);
  }
});

const messageLines = computed(() => {
  return yamlMessage.value.split("\n").length;
});

const isLargeMessage = computed(() => {
  return messageLines.value > 10;
});

const truncatedYaml = computed(() => {
  if (!isLargeMessage.value) return yamlMessage.value;

  const lines = yamlMessage.value.split("\n");
  return lines.slice(0, 3).join("\n") + "\n...";
});

// Auto-collapse large messages by default
if (isLargeMessage.value) {
  isCollapsed.value = true;
}
</script>
