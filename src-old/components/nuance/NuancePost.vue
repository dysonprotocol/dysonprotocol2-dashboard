<template>
  <article
    class="m-4 p-4 break-words overflow-hidden border border-base-content/20 rounded-lg bg-base-200"
  >
    <header
      class="mb-1 text-xs opacity-70 border-b border-base-content/20 pb-2"
    >
      <span>
        Post
        <a
          :href="`${restBase}/redirect-to-dwapp/nuance.dys/${postId}`"
          class="link"
        >#{{ postId }}</a>
        by
        <a
          :href="`${restBase}/redirect-to-dwapp/nuance.dys/authors/${enc(
            safeAuthor
          )}`"
          class="link"
        >{{ safeAuthor }}</a>
        on {{ formattedTime }} has earned {{ earnedDys }} DYS | Topic:
        <a
          :href="`${restBase}/redirect-to-dwapp/nuance.dys/topics/${enc(
            topicTag
          )}`"
          class="link"
        >#{{ topicTag }}</a>
      </span>
    </header>

    <div
      class="nuance markdown prose"
      v-html="safeHtml"
    />
  </article>
</template>

<script setup>
import { computed } from "vue";
import { renderMarkdownToSafeHtml } from "@/composables/useSafeMarkdown";

const props = defineProps({
  post: { type: Object, required: true },
  postId: { type: [String, Number], required: true },
  tag: { type: String, default: "" },
});

import { inject } from "vue";
const chainInfo = inject("chainInfo", { restUrl: "" });
const restBase = chainInfo.restUrl;

const safeAuthor = computed(() => (props.post?.author || "").toString());
const topicTag = computed(() => (props.tag || "").toString());

function enc(v) {
  try {
    return encodeURIComponent(String(v));
  } catch {
    return String(v);
  }
}

function formatTime(raw) {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleString();
}

const formattedTime = computed(() =>
  formatTime(props.post?.created_time || "")
);

function calcEarnedDys(post) {
  try {
    const udys = Number(post?.claimed?.udys || 0);
    if (!Number.isFinite(udys)) return 0;
    return Math.floor(udys / 1_000_000);
  } catch {
    return 0;
  }
}

const earnedDys = computed(() => calcEarnedDys(props.post));

const safeHtml = computed(() =>
  renderMarkdownToSafeHtml(props.post?.content || "")
);
</script>
