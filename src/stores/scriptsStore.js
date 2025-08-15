import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useWallet } from "@/composables/useWallet";
import { parseScriptFunctions, extractDocstring } from "@/utils/pythonParser";

// Constants
const SCRIPT_API_PATH = "/dysonprotocol/script/v1/script_info";
const MSG_TYPE_UPDATE_SCRIPT = "/dysonprotocol.script.v1.MsgUpdateScript";
const DEFAULT_VERSION = "1.0.0";

// Error classes
export class ScriptStoreError extends Error {
  constructor(message, code = null) {
    super(message);
    this.name = "ScriptStoreError";
    this.code = code;
  }
}

export class WalletNotConnectedError extends ScriptStoreError {
  constructor() {
    super("Wallet not connected", "WALLET_NOT_CONNECTED");
  }
}

export class ScriptNotFoundError extends ScriptStoreError {
  constructor(address) {
    super(`Script not found: ${address}`, "SCRIPT_NOT_FOUND");
    this.address = address;
  }
}

export const useScriptsStore = defineStore("scripts", () => {
  // State
  const scripts = ref(new Map());
  const loading = ref(false);
  const error = ref(null);

  // Dependencies
  const wallet = useWallet();

  // Computed
  const getScriptByAddress = computed(
    () => (address) => scripts.value.get(address)
  );
  const getFunctionsByAddress = computed(() => (address) => {
    const script = scripts.value.get(address);
    return script?.functions || [];
  });
  const isLoading = computed(() => loading.value);
  const getError = computed(() => error.value);

  /**
   * Fetch script from blockchain or cache
   * @param {string} address - Script address
   * @returns {Promise<Object|null>} Script object or null if not found
   */
  async function fetchScript(address) {
    if (!address) {
      throw new ScriptStoreError("Address is required");
    }

    // Return cached version if available
    if (scripts.value.has(address)) {
      return scripts.value.get(address);
    }

    loading.value = true;
    error.value = null;

    try {
      const url = `${wallet.restUrl.value}${SCRIPT_API_PATH}/${address}`;
      const response = await globalThis.fetch(url);

      let scriptData;

      if (response.ok) {
        const json = await response.json();
        scriptData = {
          code: json.script?.code || "",
          version: json.script?.version || DEFAULT_VERSION,
        };
      } else if (response.status === 404) {
        // Script doesn't exist yet, return empty template
        scriptData = {
          code: "",
          version: 0,
        };
      } else {
        throw new ScriptStoreError(
          `API error: ${response.status}`,
          "API_ERROR"
        );
      }

      const script = await createScriptObject(address, scriptData);
      scripts.value.set(address, script);

      return script;
    } catch (err) {
      const errorMessage =
        err instanceof ScriptStoreError
          ? err.message
          : `Failed to fetch script: ${err.message}`;
      error.value = errorMessage;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Save script to blockchain
   * @param {string} address - Script address
   * @param {string} source - Script source code
   * @param {Object} [walletOverride] - Optional wallet override
   * @returns {Promise<boolean>} Success status
   */
  async function saveScript(address, source, walletOverride = null) {
    if (!address || source === undefined) {
      throw new ScriptStoreError("Address and source are required");
    }

    const activeWallet = walletOverride || wallet;

    if (!activeWallet.isWalletConnected.value) {
      throw new WalletNotConnectedError();
    }

    loading.value = true;
    error.value = null;

    try {
      const message = {
        "@type": MSG_TYPE_UPDATE_SCRIPT,
        address,
        code: source,
      };

      const result = await activeWallet.sendMsg({
        msg: message,
        memo: "Update script",
        gasLimit: "auto",
      });

      if (!result.success) {
        throw new ScriptStoreError(
          result.rawLog || "Failed to save script",
          "TRANSACTION_FAILED"
        );
      }

      // Refresh script data after successful save
      scripts.value.delete(address); // Clear cache to force refetch
      await fetchScript(address);

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof ScriptStoreError
          ? err.message
          : `Failed to save script: ${err.message}`;
      error.value = errorMessage;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Execute a function from a script
   * @param {string} address - Script address
   * @param {string} functionName - Function name to execute
   * @param {Array} args - Function arguments
   * @param {boolean} simulate - Whether to simulate or execute
   * @returns {Promise<Object>} Execution result
   */
  async function executeFunction(
    address,
    functionName,
    args = [],
    simulate = false
  ) {
    if (!address || !functionName) {
      throw new ScriptStoreError("Address and function name are required");
    }

    if (!wallet.isWalletConnected.value) {
      throw new WalletNotConnectedError();
    }

    loading.value = true;
    error.value = null;

    try {
      const argsString = args.length > 0 ? JSON.stringify(args) : "";

      const result = await wallet.runDysonScript({
        scriptAddress: address,
        functionName,
        args: argsString,
        kwargs: "",
        extraCode: "",
        attachedMsg: [],
        memo: simulate ? `Simulate ${functionName}` : `Execute ${functionName}`,
        gasLimit: "auto",
        simulate,
      });

      if (!result.success) {
        throw new ScriptStoreError(
          result.rawSendMsgsResponse?.rawLog || "Script execution failed",
          "EXECUTION_FAILED"
        );
      }

      return {
        returnValue: result.scriptResponse,
        txHash: result.rawSendMsgsResponse?.raw?.tx_response?.txhash,
        gasUsed: result.rawSendMsgsResponse?.raw?.tx_response?.gas_used,
        gasWanted: result.rawSendMsgsResponse?.raw?.tx_response?.gas_wanted,
        fee: result.rawSendMsgsResponse?.raw?.tx_response?.fee,
        logs: result.rawSendMsgsResponse?.raw?.tx_response?.logs || [],
      };
    } finally {
      loading.value = false;
    }
  }

  /**
   * Clear all cached scripts
   */
  function clearCache() {
    scripts.value.clear();
    error.value = null;
  }

  // Private helper functions
  async function createScriptObject(address, scriptData) {
    let functions = [];

    try {
      functions = parseScriptFunctions(scriptData.code);
    } catch (err) {
      globalThis.console?.warn(
        `Failed to parse functions for script ${address}:`,
        err
      );
      // Continue with empty functions array rather than failing
    }

    return {
      address,
      code: scriptData.code,
      version: scriptData.version,
      docstring: extractDocstring(scriptData.code),
      functions,
      lastUpdated: new Date().toISOString(),
    };
  }

  return {
    // State
    scripts: computed(() => scripts.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),

    // Getters
    getScriptByAddress,
    getFunctionsByAddress,
    isLoading,
    getError,

    // Actions
    fetchScript,
    saveScript,
    executeFunction,
    clearCache,
  };
});
