import { defineStore } from "pinia";
import { ref, computed, inject } from "vue";

export const useExplorerStore = defineStore("explorer", () => {
  // Inject chain info from App.vue
  const chainInfo = inject("chainInfo", {
    restUrl: "http://localhost:1317", // Fallback
    bech32Prefix: "dys2",
  });
  // State
  const blocks = ref(new Map()); // Store blocks by height
  const blocksList = ref([]); // Recent blocks list
  const transactions = ref(new Map()); // Store transactions by hash
  const loading = ref(false);
  const error = ref(null);

  // No automatic retries; surface errors immediately

  // REST API base URL (uses chain info from App.vue)
  const apiUrl = ref(chainInfo.restUrl); // Default from chain config

  // Getters
  const isLoading = computed(() => loading.value);
  const hasError = computed(() => error.value !== null);
  const errorMessage = computed(() => error.value?.message || "Unknown error");

  // Helper functions (none needed for retry since retries are disabled)

  // SHA256 hash function for transaction hashes
  const sha256 = async (data) => {
    const encoder = new TextEncoder();
    const dataBuffer = typeof data === "string" ? encoder.encode(data) : data;
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  };

  const apiRequest = async (endpoint) => {
    const response = await fetch(`${apiUrl.value}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  };

  // Actions
  const setApiUrl = (url) => {
    apiUrl.value = url.replace(/\/$/, ""); // Remove trailing slash
  };

  const clearData = () => {
    blocks.value.clear();
    blocksList.value = [];
    transactions.value.clear();
  };

  const fetchBlocks = async (page = 1, limit = 20) => {
    loading.value = true;
    error.value = null;

    try {
      // First get the current height from status
      const statusResponse = await apiRequest(
        `/cosmos/base/node/v1beta1/status`
      );

      const currentHeight = parseInt(statusResponse.height || 0);
      if (currentHeight === 0) {
        throw new Error("Could not get current block height");
      }

      // Calculate which blocks to fetch (most recent first)
      const startHeight = Math.max(
        1,
        currentHeight - (page - 1) * limit - limit + 1
      );
      const endHeight = Math.max(1, currentHeight - (page - 1) * limit);

      // Fetch individual blocks
      const blockPromises = [];
      for (let height = endHeight; height >= startHeight; height--) {
        blockPromises.push(
          apiRequest(`/cosmos/base/tendermint/v1beta1/blocks/${height}`)
            .then((response) => ({
              height: parseInt(response.block?.header?.height || height),
              timestamp:
                response.block?.header?.time || new Date().toISOString(),
              txCount: response.block?.data?.txs?.length || 0,
              proposer: response.block?.header?.proposer_address || "",
              hash: response.block_id?.hash || "",
            }))
            .catch((err) => {
              console.warn(`Failed to fetch block ${height}:`, err);
              return null; // Return null for failed blocks
            })
        );
      }

      const blocksData = await Promise.all(blockPromises);
      const processedBlocks = blocksData.filter((block) => block !== null);

      // Store individual blocks
      processedBlocks.forEach((block) => {
        blocks.value.set(block.height, block);
      });

      blocksList.value = processedBlocks;
      return processedBlocks;
    } catch (err) {
      console.error("Failed to fetch blocks:", err);
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchBlockByHeight = async (height) => {
    const heightNum = parseInt(height);
    if (isNaN(heightNum) || heightNum <= 0) {
      throw new Error("Invalid block height");
    }

    loading.value = true;
    error.value = null;

    try {
      // First get the raw block data
      const blockResponse = await apiRequest(
        `/cosmos/base/tendermint/v1beta1/blocks/${heightNum}`
      );

      const block = blockResponse.block;
      if (!block) {
        throw new Error(`Block ${height} not found`);
      }

      // Get transactions using our improved method
      const processedTxs = await fetchTxsByBlock(heightNum);

      const blockData = {
        height: heightNum,
        header: block.header,
        data: block.data,
        block_id: blockResponse.block_id,
        txs: processedTxs,
      };

      // Store the block
      blocks.value.set(heightNum, blockData);

      return blockData;
    } catch (err) {
      console.error(`Failed to fetch block ${height}:`, err);
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Recursively decode JSON strings
  const decodeJsonStrings = (obj, depth = 0) => {
    // Prevent infinite recursion
    if (depth > 10) return obj;

    if (typeof obj === "string") {
      let current = obj;
      let attempts = 0;

      // Try multiple decoding attempts for doubly-encoded JSON
      while (attempts < 5) {
        try {
          const parsed = JSON.parse(current);
          // Replace with parsed value if it's an object/array or if it's a different string
          if (typeof parsed === "object" && parsed !== null) {
            return decodeJsonStrings(parsed, depth + 1);
          } else if (typeof parsed === "string" && parsed !== current) {
            // String was decoded to a different string, try again
            current = parsed;
            attempts++;
          } else {
            // Primitive value or same string, stop here
            return parsed;
          }
        } catch {
          // Not valid JSON, return current value
          return current;
        }
      }
      return current;
    } else if (Array.isArray(obj)) {
      return obj.map((item) => decodeJsonStrings(item, depth + 1));
    } else if (obj !== null && typeof obj === "object") {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = decodeJsonStrings(value, depth + 1);
      }
      return result;
    }
    return obj;
  };

  const fetchTxByHash = async (hash) => {
    if (!hash || typeof hash !== "string") {
      throw new Error("Invalid transaction hash");
    }

    loading.value = true;
    error.value = null;

    try {
      // Fetch transaction from Cosmos SDK endpoint
      const response = await apiRequest(`/cosmos/tx/v1beta1/txs/${hash}`);

      const tx = response.tx_response;
      if (!tx) {
        throw new Error(`Transaction ${hash} not found`);
      }

      // Decode JSON strings in the entire response
      const decodedResponse = decodeJsonStrings(response);
      const decodedTx = decodedResponse.tx_response;

      // Parse transaction data using decoded response
      const txData = {
        hash: decodedTx.txhash || hash,
        height: parseInt(decodedTx.height || 0),
        code: decodedTx.code || 0,
        gas_used: decodedTx.gas_used,
        gas_wanted: decodedTx.gas_wanted,
        raw_log: decodedTx.raw_log,
        timestamp: decodedTx.timestamp,
        memo: decodedResponse.tx?.body?.memo || "",
        fee: decodedResponse.tx?.auth_info?.fee?.amount || [],
        messages: decodedResponse.tx?.body?.messages || [],
        events: decodedTx.events || [],
      };

      // Store the transaction
      transactions.value.set(hash, txData);

      return txData;
    } catch (err) {
      console.error(`Failed to fetch transaction ${hash}:`, err);
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchTxsByBlock = async (height) => {
    loading.value = true;
    error.value = null;

    try {
      // First get the raw block data with transaction hashes
      const blockResponse = await apiRequest(
        `/cosmos/base/tendermint/v1beta1/blocks/${height}`
      );

      const rawTxs = blockResponse.block?.data?.txs || [];

      if (rawTxs.length === 0) {
        return [];
      }

      // Calculate transaction hashes and fetch individual transactions
      const txPromises = rawTxs.map(async (txRaw) => {
        try {
          // Calculate transaction hash from raw transaction data
          const txBytes = Uint8Array.from(atob(txRaw), (c) => c.charCodeAt(0));
          const txHash = await sha256(txBytes);

          // Fetch the complete transaction data using the hash
          return await fetchTxByHash(txHash);
        } catch (err) {
          console.warn(
            `Failed to process transaction in block ${height}:`,
            err
          );
          return null;
        }
      });

      const processedTxs = await Promise.all(txPromises);
      return processedTxs.filter((tx) => tx !== null);
    } catch (err) {
      console.error(`Failed to fetch transactions for block ${height}:`, err);
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const searchTransactions = async ({
    query,
    orderBy = "ORDER_BY_DESC",
    limit = 25,
    page = 1,
  }) => {
    loading.value = true;
    error.value = null;

    try {
      // Build base params
      const buildParams = (q) => {
        const p = new window.URLSearchParams();
        if (q) p.append("query", q);
        if (orderBy) p.append("order_by", orderBy);
        if (limit) p.append("limit", limit.toString());
        if (page) p.append("page", page.toString());
        return p;
      };

      const endpoint = (p) => `/cosmos/tx/v1beta1/txs?${p.toString()}`;

      // First request
      const initialParams = buildParams(query);
      const initialRes = await fetch(
        `${apiUrl.value}${endpoint(initialParams)}`
      );

      // Success path
      if (initialRes.ok) {
        const json = await initialRes.json();
        return {
          txs: json.txs || [],
          tx_responses: json.tx_responses || [],
          pagination: json.pagination || null,
          total: json.total || null,
        };
      }

      // Attempt to parse structured error
      let errorBody = null;
      try {
        errorBody = await initialRes.json();
      } catch {
        // No JSON body; throw generic HTTP error
        throw new Error(`HTTP ${initialRes.status}: ${initialRes.statusText}`);
      }

      // Handle Cosmos SDK error code 13 (height pruned/not available)
      const isCode13 = errorBody && Number(errorBody.code) === 13;
      const message = String(errorBody?.message || "");
      if (isCode13 && message.includes("lowest height is")) {
        const match = message.match(/lowest height is\s*(\d+)/i);
        const lowestHeight = match ? parseInt(match[1], 10) : NaN;

        if (Number.isFinite(lowestHeight)) {
          // Adjust query to ensure tx.height>=lowestHeight
          let adjustedQuery = query || "";

          const heightRegex = /tx\.height\s*>=\s*(\d+)/i;
          const existing = adjustedQuery.match(heightRegex);
          if (existing) {
            const existingVal = parseInt(existing[1], 10);
            if (!Number.isFinite(existingVal) || existingVal < lowestHeight) {
              adjustedQuery = adjustedQuery.replace(
                heightRegex,
                `tx.height>=${lowestHeight}`
              );
            }
          } else {
            adjustedQuery =
              adjustedQuery.trim().length > 0
                ? `${adjustedQuery} AND tx.height>=${lowestHeight}`
                : `tx.height>=${lowestHeight}`;
          }

          const retryParams = buildParams(adjustedQuery);
          const retryRes = await fetch(
            `${apiUrl.value}${endpoint(retryParams)}`
          );
          if (!retryRes.ok) {
            // If retry also fails, surface the original structured error
            throw new Error(
              message || `HTTP ${retryRes.status}: ${retryRes.statusText}`
            );
          }
          const retryJson = await retryRes.json();
          return {
            txs: retryJson.txs || [],
            tx_responses: retryJson.tx_responses || [],
            pagination: retryJson.pagination || null,
            total: retryJson.total || null,
            limitedFromHeight: lowestHeight,
            adjustedQuery,
          };
        }
      }

      // Non-code-13 or unparseable cases: throw message
      throw new Error(
        message || `HTTP ${initialRes.status}: ${initialRes.statusText}`
      );
    } catch (err) {
      console.error("Failed to search transactions:", err);
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Clear error state
  const clearError = () => {
    error.value = null;
  };

  return {
    // State
    blocks: computed(() => blocks.value),
    blocksList: computed(() => blocksList.value),
    transactions: computed(() => transactions.value),
    isLoading,
    hasError,
    errorMessage,
    apiUrl: computed(() => apiUrl.value),

    // Actions
    setApiUrl,
    clearData,
    clearError,
    fetchBlocks,
    fetchBlockByHeight,
    fetchTxByHash,
    fetchTxsByBlock,
    searchTransactions,
  };
});
