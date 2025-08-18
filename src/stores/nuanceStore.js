import { defineStore } from "pinia";
import { computed, ref } from "vue";

const OWNER = "nuance.dys";

function padId(id) {
  const n = Number(id);
  if (!Number.isFinite(n)) return String(id);
  return String(Math.trunc(n)).padStart(15, "0");
}

export const useNuanceStore = defineStore("nuance", () => {
  function getRestUrl() {
    if (typeof window !== "undefined" && typeof window.resolveRestUrl === "function")
      return window.resolveRestUrl();
    return "";
  }

  // Per list key `${tag}:${rating}`: { items: [{id, score, metadata}], nextKey, loading, error }
  const lists = ref(new Map());
  // Post cache by paddedId: { post_id, author, content, created_time }
  const posts = ref(new Map());
  // Votes cache by `${tag}:${paddedId}`: { up, down }
  const votes = ref(new Map());

  function getListKey(tag, rating) {
    return `${String(tag)}:${String(rating)}`;
  }

  function ensureList(tag, rating) {
    const key = getListKey(tag, rating);
    if (!lists.value.has(key))
      lists.value.set(key, { items: [], nextKey: "", loading: false, error: "" });
    return lists.value.get(key);
  }

  async function fetchRatingsPage(tag, rating, pageKey = "", limit = 50) {
    const u = new URL(`${getRestUrl()}/dysonprotocol/storage/v1/storage_list`);
    u.searchParams.set("owner", OWNER);
    u.searchParams.set("index_prefix", `rate/tags/${tag}/${rating}/`);
    u.searchParams.set("pagination.limit", String(limit));
    u.searchParams.set("pagination.reverse", "true");
    if (pageKey) u.searchParams.set("pagination.key", pageKey);
    const r = await fetch(u.toString());
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const j = await r.json();
    const entries = Array.isArray(j?.entries) ? j.entries : [];
    const out = entries
      .map((e) => {
        try {
          const d = JSON.parse(String(e?.data || "{}"));
          const id = Number(d?.id);
          if (!Number.isFinite(id)) return null;
          const score = rating === "hot" ? Number(d?.hot_rating) : Number(d?.best_rating);
          return { id, score: Number.isFinite(score) ? score : 0, metadata: d?.metadata || {} };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return { items: out, nextKey: String(j?.pagination?.next_key || "") };
  }

  async function fetchPostByPaddedId(paddedId) {
    if (posts.value.has(paddedId)) return posts.value.get(paddedId);
    const u = new URL(`${getRestUrl()}/dysonprotocol/storage/v1/storage_get`);
    u.searchParams.set("owner", OWNER);
    u.searchParams.set("index", `posts/${paddedId}`);
    const r = await fetch(u.toString());
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const j = await r.json();
    const raw = j?.entry?.data || "";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { content: String(raw) };
    }
    const post = {
      post_id: parsed.post_id ?? Number(paddedId),
      author: String(parsed.author || ""),
      content: String(parsed.content || ""),
      created_time: String(parsed.created_time || ""),
    };
    posts.value.set(paddedId, post);
    return post;
  }

  async function fetchVotes(tag, paddedId) {
    const key = `${tag}:${paddedId}`;
    if (votes.value.has(key)) return votes.value.get(key);
    const u = new URL(`${getRestUrl()}/dysonprotocol/storage/v1/storage_get`);
    u.searchParams.set("owner", OWNER);
    u.searchParams.set("index", `rate_tags/tags/${tag}/${paddedId}`);
    const r = await fetch(u.toString());
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const j = await r.json();
    let up = 0, down = 0;
    try {
      const raw = j?.entry?.data || "{}";
      const d = JSON.parse(raw);
      up = Number(d?.up || 0);
      down = Number(d?.down || 0);
    } catch {}
    const v = { up, down };
    votes.value.set(key, v);
    return v;
  }

  async function loadInitial(tag, rating, limit = 20) {
    const state = ensureList(tag, rating);
    if (state.loading) return;
    state.loading = true;
    state.error = "";
    state.items = [];
    state.nextKey = "";
    try {
      const { items, nextKey } = await fetchRatingsPage(tag, rating, "", limit);
      state.items = items;
      state.nextKey = nextKey;
      // prefetch posts in parallel
      await Promise.all(
        items.map((i) => fetchPostByPaddedId(padId(i.id)).catch(() => null))
      );
      await Promise.all(
        items.map((i) => fetchVotes(tag, padId(i.id)).catch(() => null))
      );
    } catch (e) {
      state.error = e?.message || "Failed to load";
      throw e;
    } finally {
      state.loading = false;
    }
  }

  async function loadMore(tag, rating, limit = 20) {
    const state = ensureList(tag, rating);
    if (state.loading || !state.nextKey) return;
    state.loading = true;
    state.error = "";
    try {
      const { items, nextKey } = await fetchRatingsPage(tag, rating, state.nextKey, limit);
      state.items = state.items.concat(items);
      state.nextKey = nextKey;
      await Promise.all(
        items.map((i) => fetchPostByPaddedId(padId(i.id)).catch(() => null))
      );
      await Promise.all(
        items.map((i) => fetchVotes(tag, padId(i.id)).catch(() => null))
      );
    } catch (e) {
      state.error = e?.message || "Failed to load more";
      throw e;
    } finally {
      state.loading = false;
    }
  }

  const getList = computed(
    () => (tag, rating) => ensureList(tag, rating)
  );

  const getViewItems = computed(() => (tag, rating) => {
    const state = ensureList(tag, rating);
    return state.items.map((i) => {
      const padded = padId(i.id);
      const v = votes.value.get(`${tag}:${padded}`) || { up: 0, down: 0 };
      return {
        tag,
        rating,
        id: i.id,
        paddedId: padded,
        score: i.score,
        metadata: i.metadata,
        post: posts.value.get(padded) || null,
        up: v.up,
        down: v.down,
      };
    });
  });

  return {
    // state-like
    lists: computed(() => lists.value),
    posts: computed(() => posts.value),
    votes: computed(() => votes.value),

    // getters
    getList,
    getViewItems,

    // actions
    loadInitial,
    loadMore,
  };
});


