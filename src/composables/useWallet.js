import { computed, reactive, inject } from "vue";
import {
  DirectSecp256k1HdWallet,
  makeSignDoc,
  makeSignBytes,
  executeKdf,
  extractKdfConfiguration,
} from "@cosmjs/proto-signing";
import { useStorage } from "@vueuse/core";
import { getChainInfo, sendMsgs, runScript } from "../utils/dysonTxUtils";
import { useDenom } from "./useDenom";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx.js";
import { toBase64, fromBase64 } from "@cosmjs/encoding";

const COSMJS_WALLET_TYPE = "cosmjs";

// Global event listener state to prevent multiple listeners
let globalKeplrListenerSet = false;
let globalHandleKeplrAccountChange = null;

export function useWallet() {
  // Inject chain info from App.vue
  const DEFAULT_CHAIN_INFO = inject("chainInfo", {
    restUrl: "http://localhost:1317", // Fallback
    bech32Prefix: "dys2",
  });

  // Persisted state
  const restUrl = computed(() => DEFAULT_CHAIN_INFO.restUrl);
  const chainId = useStorage("chainId", "");
  const rpcUrl = useStorage("rpcUrl", "");
  const nodeInfo = useStorage("nodeInfo", null);
  const localCosmJsWallets = useStorage("localCosmJsWallets", []);
  const gasPrice = useStorage("gasPrice", 0.0);

  const selectedAuthorIdentity = useStorage("selectedAuthorIdentity", null);
  const txHistory = useStorage("txHistory", []);

  // New unlocked wallets management
  const unlockedWallets = useStorage("unlockedWallets", []);
  const selectedWalletIndex = useStorage("selectedWalletIndex", 0);

  // Ephemeral state
  const state = reactive({
    activeWalletInstance: null,
    isLoading: true,
    addressNames: {},
  });

  // Computed
  const selectedWallet = computed(
    () => unlockedWallets.value[selectedWalletIndex.value] || null
  );
  const isWalletConnected = computed(() => !!selectedWallet.value?.address);

  // INITIALIZATION
  const init = async () => {
    console.log("useWallet init");
    await loadChainIdFromApi();

    // Set up Keplr account change listener globally (only once)
    if (!globalKeplrListenerSet) {
      globalHandleKeplrAccountChange = handleKeplrAccountChange;
      window.addEventListener(
        "keplr_keystorechange",
        globalHandleKeplrAccountChange
      );
      globalKeplrListenerSet = true;
      console.log("Keplr event listener set up globally");
    }

    if (selectedWallet.value) {
      if (selectedWallet.value.type === "keplr") {
        const provider = window.keplr;
        if (!provider) {
          console.error("Keplr extension not found, please install it.");
          disconnectWallet();
        } else {
          const offlineSigner = provider.getOfflineSigner(chainId.value);
          state.activeWalletInstance = offlineSigner;
          await restoreAuthorIdentity();
        }
      } else if (selectedWallet.value.type === COSMJS_WALLET_TYPE) {
        const walletData = localCosmJsWallets.value.find(
          (w) => w.name === selectedWallet.value.name
        );
        if (walletData && walletData._pass && walletData._pass.trim() !== "") {
          try {
            await connectNamedCosmJsWallet(walletData.name, walletData._pass);
            await restoreAuthorIdentity();
          } catch (error) {
            console.error(
              "Auto reconnection failed for wallet",
              walletData.name,
              error
            );
          }
        }
      }
    }

    // TODO: remove this development helper
    if (localCosmJsWallets.value.length === 0 && chainId.value === "cahin-a") {
      const seed =
        "public feature teach face federal matrix throw legend bridge brass diary beach typical doll evoke weapon among crane regret trust enact swarm brother outside";
      console.log("creating default wallet");
      await importNamedCosmJsWallet("alice", seed, "password");
      await connectNamedCosmJsWallet("alice", "password");
    }

    state.isLoading = false;
  };

  // KEPLR ACCOUNT CHANGE HANDLER
  const handleKeplrAccountChange = async () => {
    console.log("Keplr account changed, updating wallet state");
    console.log("Current selectedWallet:", selectedWallet.value);
    console.log("Current unlockedWallets:", unlockedWallets.value);

    // Immediately invalidate cached signer to force refresh
    state.activeWalletInstance = null;

    if (selectedWallet.value?.type !== "keplr" || !window.keplr) {
      console.log("Skipping: not a Keplr wallet or Keplr not available");
      console.log(
        "Condition details: type =",
        selectedWallet.value?.type,
        "window.keplr =",
        !!window.keplr
      );
      return;
    }

    try {
      // Ensure chain is enabled and get new account info
      await window.keplr.enable(chainId.value);
      const key = await window.keplr.getKey(chainId.value);
      console.log("New Keplr key:", key);

      // Clone unlockedWallets to ensure reactivity and storage persistence
      let wallets = [...unlockedWallets.value];
      const keplrIndex = wallets.findIndex((w) => w.type === "keplr");
      console.log("Keplr index in wallets:", keplrIndex);

      const newKeplrWallet = {
        name: key.name,
        address: key.bech32Address,
        type: "keplr",
      };

      if (keplrIndex === -1) {
        // First time seeing this Keplr account - add it
        console.log("Adding new Keplr wallet:", newKeplrWallet);
        wallets.push(newKeplrWallet);
        selectedWalletIndex.value = wallets.length - 1;
      } else {
        // Replace existing Keplr wallet (prevents duplicates)
        console.log(
          "Replacing existing Keplr wallet at index",
          keplrIndex,
          "with:",
          newKeplrWallet
        );
        wallets.splice(keplrIndex, 1, newKeplrWallet);
        selectedWalletIndex.value = keplrIndex;
      }

      console.log("Before update - unlockedWallets:", unlockedWallets.value);
      console.log("About to set unlockedWallets to:", wallets);

      // Assign the new array to trigger reactivity and persistence
      unlockedWallets.value = wallets;

      console.log("After update - unlockedWallets:", unlockedWallets.value);
      console.log("selectedWalletIndex:", selectedWalletIndex.value);

      // Update offline signer
      state.activeWalletInstance = window.keplr.getOfflineSigner(chainId.value);

      // Clear cached address names since they're invalid now
      state.addressNames = {};

      // Restore author identity for new account
      await restoreAuthorIdentity();

      console.log(
        "✅ Wallet state update complete for new account:",
        key.bech32Address
      );
    } catch (error) {
      console.error(
        "Failed to update wallet state after Keplr account change:",
        error
      );
    }
  };

  // UNLOCKED WALLETS MANAGEMENT
  const unlockWallet = async (name, password) => {
    const walletData = localCosmJsWallets.value.find((w) => w.name === name);
    if (!walletData) throw new Error(`No local wallet named "${name}".`);
    if (!password.trim())
      throw new Error("Password required to unlock wallet.");

    const kdfConf = extractKdfConfiguration(walletData.encrypted);
    const encryptionKey = await executeKdf(password, kdfConf);
    const wallet = await DirectSecp256k1HdWallet.deserializeWithEncryptionKey(
      walletData.encrypted,
      encryptionKey
    );
    const address = (await wallet.getAccounts())[0].address;

    const existingIndex = unlockedWallets.value.findIndex(
      (w) => w.name === name
    );
    if (existingIndex === -1) {
      unlockedWallets.value.push({
        name,
        address,
        type: COSMJS_WALLET_TYPE,
        _pass: password,
      });
    } else {
      unlockedWallets.value[existingIndex]._pass = password;
    }
  };

  const lockWallet = (name) => {
    const index = unlockedWallets.value.findIndex((w) => w.name === name);
    if (index !== -1) {
      unlockedWallets.value.splice(index, 1);
      if (selectedWalletIndex.value >= unlockedWallets.value.length) {
        selectedWalletIndex.value = Math.max(
          0,
          unlockedWallets.value.length - 1
        );
      }
      if (selectedWallet.value?.name === name) {
        disconnectWallet();
      }
    }
  };

  const selectWallet = (index) => {
    console.log("🔀 selectWallet() called", {
      index,
      unlockedWalletsLength: unlockedWallets.value.length,
      validIndex: index >= 0 && index < unlockedWallets.value.length,
      currentSelectedWalletIndex: selectedWalletIndex.value,
    });

    if (index >= 0 && index < unlockedWallets.value.length) {
      selectedWalletIndex.value = index;
      // Clear active wallet instance to force re-initialization
      state.activeWalletInstance = null;
      console.log("✅ Wallet selected:", unlockedWallets.value[index]);
    } else {
      console.error("❌ Invalid wallet index:", {
        index,
        unlockedWalletsLength: unlockedWallets.value.length,
      });
    }
  };

  // SIGNER METHODS
  const getSignerAddress = () => {
    console.log("📧 getSignerAddress() called", {
      selectedWallet: selectedWallet.value,
      hasAddress: !!selectedWallet.value?.address,
    });

    if (!selectedWallet.value?.address) {
      console.error("❌ No wallet connected - selectedWallet address missing");
      throw new Error("No wallet connected.");
    }

    const address = selectedWallet.value.address;
    console.log("✉️ Returning signer address:", address);
    return address;
  };

  // AUTHOR IDENTITY METHODS
  const getAuthorIdentity = () => {
    if (!isWalletConnected.value) {
      throw new Error("No wallet connected.");
    }
    return selectedAuthorIdentity.value || getSignerAddress();
  };

  const setAuthorIdentity = async (identity) => {
    if (!isWalletConnected.value) {
      throw new Error("No wallet connected.");
    }

    if (identity !== getSignerAddress()) {
      const isValid = await validateNameForCurrentWallet(identity);
      if (!isValid) {
        throw new Error(
          `Identity "${identity}" does not resolve to current wallet address.`
        );
      }
    }

    selectedAuthorIdentity.value = identity;
  };

  const getAvailableAuthorIdentities = async () => {
    if (!isWalletConnected.value) {
      return [];
    }

    const address = getSignerAddress();
    const names = await fetchNamesByDestination(address);

    const identities = [address];
    names.forEach((name) => {
      if (name !== address && !identities.includes(name)) {
        identities.push(name);
      }
    });

    return identities;
  };

  const getDisplayTextForIdentity = (identity) => {
    const address = getSignerAddress();

    if (identity === address) {
      if (identity.length <= 13) return identity;
      return identity.slice(0, 10) + "..." + identity.slice(-5);
    }

    return identity;
  };

  const restoreAuthorIdentity = async () => {
    if (selectedAuthorIdentity.value) {
      try {
        if (selectedAuthorIdentity.value !== getSignerAddress()) {
          const isValid = await validateNameForCurrentWallet(
            selectedAuthorIdentity.value
          );
          if (!isValid) {
            console.warn(
              "Stored author identity is no longer valid for current wallet, resetting to wallet address"
            );
            selectedAuthorIdentity.value = getSignerAddress();
            return;
          }
        }
      } catch (error) {
        console.warn(
          "Error validating stored author identity, resetting to wallet address:",
          error
        );
        selectedAuthorIdentity.value = getSignerAddress();
      }
    } else {
      selectedAuthorIdentity.value = getSignerAddress();
    }
  };

  const validateNameForCurrentWallet = async (name) => {
    if (!isWalletConnected.value) {
      return false;
    }

    try {
      const address = getSignerAddress();
      const names = await fetchNamesByDestination(address);
      return names.includes(name);
    } catch (error) {
      console.error("Error validating name:", error);
      return false;
    }
  };

  const disconnectWallet = () => {
    unlockedWallets.value = [];
    selectedWalletIndex.value = 0;
    state.activeWalletInstance = null;
    selectedAuthorIdentity.value = null;
    state.addressNames = {};
  };

  // NAME RESOLUTION METHODS
  const fetchNamesByDestination = async (address) => {
    if (state.addressNames[address]) {
      return state.addressNames[address];
    }

    try {
      const url = `${restUrl.value}/dysonprotocol/nameservice/v1/names_by_destination/${address}`;

      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn(
          `[useWallet] Failed to fetch names for address ${address}: ${resp.status} ${resp.statusText}`
        );
        state.addressNames[address] = [];
        return [];
      }

      const json = await resp.json();
      const names = json.names || [];
      state.addressNames[address] = names;

      return names;
    } catch (error) {
      console.error(
        `[useWallet] Error fetching names for address ${address}:`,
        error
      );
      state.addressNames[address] = [];
      return [];
    }
  };

  // WALLET CONNECTION METHODS
  const connectNamedCosmJsWallet = async (name, password) => {
    const walletData = localCosmJsWallets.value.find((w) => w.name === name);
    if (!walletData) throw new Error(`No local wallet named "${name}".`);
    if (!password.trim())
      throw new Error("Password required to unlock wallet.");

    const kdfConf = extractKdfConfiguration(walletData.encrypted);
    const encryptionKey = await executeKdf(password, kdfConf);
    const wallet = await DirectSecp256k1HdWallet.deserializeWithEncryptionKey(
      walletData.encrypted,
      encryptionKey
    );
    state.activeWalletInstance = wallet;

    await unlockWallet(name, password);

    // Set the newly connected wallet as the selected wallet
    const walletIndex = unlockedWallets.value.findIndex((w) => w.name === name);
    if (walletIndex !== -1) {
      selectedWalletIndex.value = walletIndex;
    }

    state.addressNames = {};
    await restoreAuthorIdentity();
  };

  const connectExtension = async (type) => {
    const provider = type === "keplr" ? window.keplr : null;
    if (!provider) {
      throw new Error(`Extension not found: ${type}`);
    }
    await loadChainIdFromApi();
    await suggestChainIfNeeded(provider);

    const offlineSigner = provider.getOfflineSigner(chainId.value);
    let { name, bech32Address: address } = await provider.getKey(chainId.value);

    // Check if this wallet is already in unlockedWallets
    const existingIndex = unlockedWallets.value.findIndex(
      (w) => w.address === address
    );

    state.activeWalletInstance = offlineSigner;

    if (existingIndex === -1) {
      // Add new wallet if not already present
      unlockedWallets.value.push({
        name: String(name),
        address: String(address),
        type: String(type),
      });
      // Set as selected wallet
      selectedWalletIndex.value = unlockedWallets.value.length - 1;
    } else {
      // Set existing wallet as selected
      selectedWalletIndex.value = existingIndex;
    }

    state.addressNames = {};
    await restoreAuthorIdentity();
  };

  // UTILITIES
  const loadChainIdFromApi = async () => {
    if (!restUrl.value) throw new Error("REST URL is empty.");
    const url = `${restUrl.value}/cosmos/base/tendermint/v1beta1/node_info`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch node_info: ${await resp.text()}`);
    }
    const json = await resp.json();

    // Persist full node_info with build_deps removed to avoid huge payloads
    const sanitized = { ...json };
    if (
      sanitized &&
      typeof sanitized === "object" &&
      sanitized.application_version &&
      typeof sanitized.application_version === "object" &&
      "build_deps" in sanitized.application_version
    ) {
      delete sanitized.application_version.build_deps;
    }
    nodeInfo.value = sanitized;
    const discovered = json?.default_node_info?.network;
    if (!discovered) {
      throw new Error("No chainId found in node_info response.");
    }
    chainId.value = discovered;

    const rawRpcAddr = json?.default_node_info?.other?.rpc_address || "";
    const normalizedRpc = String(rawRpcAddr)
      .trim()
      .replace(/^tcp:\/\//, "http://");
    if (normalizedRpc) rpcUrl.value = normalizedRpc;
  };

  const suggestChainIfNeeded = async (provider) => {
    const name = chainId.value.includes("mainnet")
      ? "DysonProtocol2"
      : `DysonProtocol2 (${chainId.value})`;
    if (!restUrl.value) throw new Error("REST URL is empty.");
    if (!rpcUrl.value) throw new Error("RPC URL is empty.");
    const chainInfo = {
      chainId: chainId.value,
      chainName: name,
      rpc: rpcUrl.value,
      rest: restUrl.value,
      bip44: { coinType: 118 },
      bech32Config: {
        bech32PrefixAccAddr: "dys2",
        bech32PrefixAccPub: "dys2pub",
        bech32PrefixValAddr: "dys2valoper",
        bech32PrefixValPub: "dys2valoperpub",
        bech32PrefixConsAddr: "dys2valcons",
        bech32PrefixConsPub: "dys2valconspub",
      },
      currencies: [
        { coinDenom: "DYS", coinMinimalDenom: "udys", coinDecimals: 0 },
      ],
      feeCurrencies: [
        {
          coinDenom: "DYS",
          coinMinimalDenom: "udys",
          coinDecimals: 0,
          gasPriceStep: { low: 0.0, average: 0.00001, high: 0.00002 },
        },
      ],
      stakeCurrency: {
        coinDenom: "DYS",
        coinMinimalDenom: "udys",
        coinDecimals: 6,
      },
    };

    try {
      await provider.enable(chainId.value);
    } catch {
      await provider.experimentalSuggestChain(chainInfo);
      await provider.enable(chainId.value);
    }
  };

  const buildFee = (gasLimit) => {
    const limit = Number(gasLimit) || 200000;
    const price = Number(gasPrice.value) || 0;
    const totalAmount = Math.floor(limit * price);

    return {
      amount: [{ denom: "udys", amount: String(totalAmount) }],
      gas_limit: String(limit),
    };
  };

  // LOCAL WALLET METHODS
  const listLocalCosmJsWallets = () => [...localCosmJsWallets.value];

  const generateMnemonic = async (length = 24) => {
    const wallet = await DirectSecp256k1HdWallet.generate(length);
    return wallet.mnemonic;
  };

  const importNamedCosmJsWallet = async (name, mnemonic, password) => {
    if (!name.trim()) throw new Error("Wallet name is required.");
    if (!mnemonic.trim()) throw new Error("Mnemonic is empty.");
    if (!password.trim()) throw new Error("Password is required.");

    if (localCosmJsWallets.value.find((w) => w.name === name.trim())) {
      throw new Error(`Wallet "${name}" already exists.`);
    }

    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: DEFAULT_CHAIN_INFO.bech32Prefix,
    });
    const kdfConfig = {
      algorithm: "argon2id",
      params: { outputLength: 32, opsLimit: 24, memLimitKib: 12 * 1024 },
    };
    const encryptionKey = await executeKdf(password, kdfConfig);
    const encrypted = await wallet.serializeWithEncryptionKey(
      encryptionKey,
      kdfConfig
    );
    const address = (await wallet.getAccounts())[0].address;

    localCosmJsWallets.value.push({
      name: name.trim(),
      encrypted,
      _pass: password,
      address,
    });
  };

  const removeNamedCosmJsWallet = (name) => {
    const idx = localCosmJsWallets.value.findIndex((w) => w.name === name);
    if (idx === -1) throw new Error(`Wallet "${name}" not found.`);

    if (selectedWallet.value?.name === name) {
      disconnectWallet();
    }
    lockWallet(name);
    localCosmJsWallets.value.splice(idx, 1);
  };

  const getWallet = async (overrideAddress) => {
    console.log("🔍 getWallet() called", {
      selectedWalletType: selectedWallet.value?.type,
      selectedWalletAddress: selectedWallet.value?.address,
      hasActiveInstance: !!state.activeWalletInstance,
      overrideAddress,
    });

    const effective = (() => {
      if (overrideAddress) {
        const w = unlockedWallets.value.find(
          (u) => u.address === overrideAddress
        );
        if (!w) throw new Error("Requested wallet is not unlocked.");
        return w;
      }
      if (!selectedWallet.value?.address) {
        throw new Error("No wallet connected.");
      }
      return selectedWallet.value;
    })();

    const address = effective.address;

    if (effective.type === "keplr") {
      const provider = window.keplr;
      if (!provider) throw new Error("Keplr extension not found.");
      await suggestChainIfNeeded(provider);
      const offlineSigner = provider.getOfflineSigner(chainId.value);

      // Verify the signer matches the requested address
      const [{ address: signerAddr }] = await offlineSigner.getAccounts();
      if (signerAddr !== address) {
        throw new Error(
          `Address mismatch: requested address (${address}) is not active in Keplr. Switch account in Keplr or reconnect the wallet.`
        );
      }
      state.activeWalletInstance = offlineSigner;
    } else if (effective.type === COSMJS_WALLET_TYPE) {
      const unlocked = unlockedWallets.value.find((u) => u.address === address);
      if (!unlocked || !unlocked._pass) {
        throw new Error(
          "Wallet session expired. Please unlock the wallet again."
        );
      }
      const walletData = localCosmJsWallets.value.find(
        (w) => w.name === effective.name
      );
      if (!walletData) {
        throw new Error("Wallet data not found. Please reconnect your wallet.");
      }
      const kdfConf = extractKdfConfiguration(walletData.encrypted);
      const encryptionKey = await executeKdf(unlocked._pass, kdfConf);
      const wallet = await DirectSecp256k1HdWallet.deserializeWithEncryptionKey(
        walletData.encrypted,
        encryptionKey
      );
      state.activeWalletInstance = wallet;
    }

    if (!state.activeWalletInstance) {
      throw new Error("Wallet session expired. Please reconnect your wallet.");
    }

    return {
      ...effective,
      walletInstance: state.activeWalletInstance,
    };
  };

  const getAccountInfo = async () => {
    const { address } = await getWallet();
    return getChainInfo({ apiUrl: restUrl.value, address });
  };

  const sendMsg = async ({
    msg,
    gasLimit,
    memo = "",
    executorAddress = undefined,
  }) => {
    if (!executorAddress) {
      // enforce explicit executor for clarity and consistency
      throw new Error("executorAddress is required in sendMsg()");
    }
    console.log("💸 useWallet.sendMsg() called", {
      msg: {
        type: msg["@type"],
        creator: msg.creator,
        address: msg.address,
        path: msg.path,
        codeLength: msg.code?.length,
        contentLength: msg.content?.length,
        metadata: msg.metadata,
      },
      gasLimit,
      memo,
    });

    const { walletInstance, address, type } = await getWallet(executorAddress);
    console.log("👛 Retrieved wallet info:", {
      address,
      type,
      hasWalletInstance: !!walletInstance,
    });

    let finalGasLimit = gasLimit;

    // Skip gas estimation for Keplr wallets to avoid double signing.
    // If caller requests auto, use a generous default to prevent under-gassing.
    if (type === "keplr") {
      console.log(
        "⛽ Skipping simulation for Keplr. Using fallback gas when auto/null."
      );
      if (gasLimit === "auto" || gasLimit == null || gasLimit == undefined) {
        finalGasLimit = 100000000;
      } else {
        finalGasLimit = gasLimit;
      }
    } else if (gasLimit == null || gasLimit == undefined) {
      console.log("⛽ No gas limit provided, running simulation...");
      const simulationResult = await sendMsgs({
        apiUrl: restUrl.value,
        wallet: walletInstance,
        walletType: type,
        address,
        msgs: [msg],
        memo,
        fee: buildFee(200000),
        simulate: true,
      });

      console.log("🧪 Simulation result:", {
        success: simulationResult.success,
        code: simulationResult.code,
        rawLog: simulationResult.rawLog,
        gasUsed:
          simulationResult?.raw?.gas_info?.gas_used ||
          simulationResult?.gasUsed,
      });

      if (!simulationResult.success) {
        const errorMsg =
          simulationResult.rawLog ||
          simulationResult.raw?.message ||
          "Simulation failed";
        console.error("❌ Gas estimation failed:", {
          code: simulationResult.code,
          errorMsg,
        });
        throw new Error(
          `Gas estimation failed, code: [${simulationResult.code}] ${errorMsg}`
        );
      }

      let gasUsed = 0;
      if (simulationResult?.raw?.gas_info?.gas_used) {
        gasUsed = parseInt(simulationResult.raw.gas_info.gas_used);
      } else if (simulationResult?.gasUsed) {
        gasUsed = parseInt(simulationResult.gasUsed);
      }

      finalGasLimit = gasUsed > 0 ? Math.ceil(gasUsed * 1.5) : 200000;
      console.log("⛽ Calculated gas limit:", {
        gasUsed,
        finalGasLimit,
      });
    } else if (gasLimit === "auto") {
      console.log("⛽ Auto gas limit requested...");
      const simulationResult = await sendMsgs({
        apiUrl: restUrl.value,
        wallet: walletInstance,
        walletType: type,
        address,
        msgs: [msg],
        memo,
        fee: buildFee(100000000),
        simulate: true,
      });

      console.log("🧪 Auto gas simulation result:", {
        success: simulationResult.success,
        code: simulationResult.code,
        rawLog: simulationResult.rawLog,
        gasUsed:
          simulationResult?.raw?.gas_info?.gas_used ||
          simulationResult?.gasUsed,
      });

      if (!simulationResult.success) {
        const errorMsg =
          simulationResult.rawLog ||
          simulationResult.raw?.message ||
          "Simulation failed";
        console.error("❌ Auto gas estimation failed:", {
          code: simulationResult.code,
          errorMsg,
        });
        throw new Error(
          `Gas estimation failed, code: [${simulationResult.code}] ${errorMsg}`
        );
      }

      let gasUsed = 0;
      if (simulationResult?.raw?.gas_info?.gas_used) {
        gasUsed = parseInt(simulationResult.raw.gas_info.gas_used);
      } else if (simulationResult?.gasUsed) {
        gasUsed = parseInt(simulationResult.gasUsed);
      }

      finalGasLimit = gasUsed > 0 ? Math.ceil(gasUsed * 1.5) : 100000000;
      console.log("⛽ Auto calculated gas limit:", {
        gasUsed,
        finalGasLimit,
      });
    }

    const fee = buildFee(finalGasLimit);
    console.log("💰 Built fee:", fee);

    console.log("📡 Sending transaction...");
    const result = await sendMsgs({
      apiUrl: restUrl.value,
      wallet: walletInstance,
      walletType: type,
      address,
      msgs: [msg],
      memo,
      fee,
      simulate: false,
    });

    console.log("📨 Send transaction result:", {
      success: result.success,
      code: result.code,
      rawLog: result.rawLog,
      transactionHash: result.rawSendMsgsResponse?.raw?.tx_response?.txhash,
      gasUsed: result.rawSendMsgsResponse?.raw?.tx_response?.gas_used,
      gasWanted: result.rawSendMsgsResponse?.raw?.tx_response?.gas_wanted,
      fullResult: result,
    });

    return result;
  };

  const runDysonScript = async ({
    scriptAddress,
    functionName = "",
    args = "",
    kwargs = "",
    extraCode = "",
    attachedMsg = [],
    memo = "",
    gasLimit = 100000000,
    simulate = false,
    executorAddress = undefined,
  }) => {
    const { walletInstance, address, type } = await getWallet(executorAddress);
    if (!scriptAddress) {
      throw new Error("scriptAddress is required.");
    }

    let finalGasLimit = gasLimit;
    if (gasLimit === "auto" && !simulate) {
      if (type === COSMJS_WALLET_TYPE) {
        const simulationResult = await runScript({
          apiUrl: restUrl.value,
          wallet: walletInstance,
          walletType: type,
          executorAddress: address,
          scriptAddress,
          functionName,
          args,
          kwargs,
          extraCode,
          attachedMsg,
          memo,
          fee: buildFee(100000000),
          simulate: true,
        });

        if (!simulationResult.success) {
          return simulationResult;
        }

        const gasUsed = parseInt(
          simulationResult.rawSendMsgsResponse?.gasUsed || "0"
        );
        finalGasLimit = gasUsed > 0 ? Math.round(gasUsed * 1.5) : 100000000;
      } else {
        // Skip gas estimation for Keplr wallets to avoid double signing
        console.log(
          "⛽ Skipping gas estimation for Keplr wallet to avoid double signing"
        );
        finalGasLimit = 100000000;
      }
    }

    const fee = buildFee(finalGasLimit);

    return runScript({
      apiUrl: restUrl.value,
      wallet: walletInstance,
      walletType: type,
      executorAddress: address,
      scriptAddress,
      functionName,
      args,
      kwargs,
      extraCode,
      attachedMsg,
      memo,
      fee,
      simulate,
    });
  };

  // SIGNING METHODS
  const signArbitraryData = async ({ data }) => {
    const { walletInstance, address } = await getWallet();
    const apiUrl = restUrl.value;

    let transaction = {
      body: {
        messages: [
          {
            "@type": "/offchain.MsgSignArbitraryData",
            app_domain: "dysond",
            signer: address,
            data: data,
          },
        ],
        memo: "",
        timeout_height: "0",
        unordered: false,
        timeout_timestamp: "0001-01-01T00:00:00Z",
        extension_options: [],
        non_critical_extension_options: [],
      },
      auth_info: {
        signer_infos: [],
        fee: { amount: [], gas_limit: "0", payer: "", granter: "" },
        tip: null,
      },
      signatures: [],
    };

    const [{ pubkey }] = await state.activeWalletInstance.getAccounts();
    transaction.auth_info.signer_infos = [
      {
        public_key: {
          "@type": "/cosmos.crypto.secp256k1.PubKey",
          key: toBase64(pubkey),
        },
        mode_info: { single: { mode: "SIGN_MODE_DIRECT" } },
        sequence: "0",
      },
    ];

    console.log("transaction", transaction);
    const encodeRes = await fetch(`${apiUrl}/cosmos/tx/v1beta1/encode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tx: transaction }),
    });
    if (!encodeRes.ok) {
      throw new Error(`Failed to encode: ${await encodeRes.text()}`);
    }
    const encodedTx = await encodeRes.json();
    console.log("encodedTx", encodedTx);

    const tx = TxRaw.decode(fromBase64(encodedTx.tx_bytes));
    console.log("tx", tx);
    const chainIdForSign = "";
    const accountNumber = "0";

    const signDoc = makeSignDoc(
      tx.bodyBytes,
      tx.authInfoBytes,
      chainIdForSign,
      accountNumber
    );
    const debugSignBytes = makeSignBytes(signDoc);
    console.log("debugSignBytes", toBase64(debugSignBytes));
    const sig = await walletInstance.signDirect(address, signDoc);
    console.log("sig", sig);
    transaction.signatures = [sig.signature.signature];
    return transaction;
  };

  // DENOMINATION METADATA METHODS
  const loadDenomMetadata = async () => {
    // Backwards-compatible adapter to new useDenom()
    await denom.ensureDenomsLoaded();
  };

  // Denom helpers
  const denom = useDenom();
  const getDisplayOptions = ({ allowedBases }) =>
    denom.getDisplayOptions({ allowedBases });

  const normalizeFromDisplay = (args) => denom.normalizeFromDisplay(args);

  const normalizeCoin = (args) => denom.normalizeCoin(args);

  // TRANSACTION HISTORY METHODS
  const addTransaction = (txMetadata) => {
    const transaction = {
      txHash: txMetadata.txHash,
      timestamp: txMetadata.timestamp || Date.now(),
      type: txMetadata.type || "unknown",
      fromAddress: txMetadata.fromAddress,
      toAddress: txMetadata.toAddress,
      amount: txMetadata.amount,
      status: txMetadata.status || "pending",
    };

    // Add to beginning of array (most recent first)
    txHistory.value.unshift(transaction);

    // Keep only last 100 transactions to prevent storage bloat
    if (txHistory.value.length > 100) {
      txHistory.value = txHistory.value.slice(0, 100);
    }
  };

  return {
    // State
    restUrl,
    rpcUrl,
    chainId,
    localCosmJsWallets,
    gasPrice,
    selectedAuthorIdentity,
    unlockedWallets,
    selectedWalletIndex,
    txHistory,
    state,

    // Computed
    selectedWallet,
    isWalletConnected,

    // Methods
    init,
    unlockWallet,
    lockWallet,
    selectWallet,
    getSignerAddress,
    getAuthorIdentity,
    setAuthorIdentity,
    getAvailableAuthorIdentities,
    getDisplayTextForIdentity,
    restoreAuthorIdentity,
    validateNameForCurrentWallet,
    fetchNamesByDestination,
    connectNamedCosmJsWallet,
    connectExtension,
    disconnectWallet,
    loadChainIdFromApi,
    suggestChainIfNeeded,
    buildFee,
    listLocalCosmJsWallets,
    generateMnemonic,
    importNamedCosmJsWallet,
    removeNamedCosmJsWallet,
    getWallet,
    getAccountInfo,
    sendMsg,
    runDysonScript,
    signArbitraryData,
    loadDenomMetadata,
    getDisplayOptions,
    normalizeFromDisplay,
    normalizeCoin,
    addTransaction,

    // Cleanup function
    cleanup: () => {
      if (globalKeplrListenerSet && globalHandleKeplrAccountChange) {
        window.removeEventListener(
          "keplr_keystorechange",
          globalHandleKeplrAccountChange
        );
        globalKeplrListenerSet = false;
        console.log("Keplr event listener removed");
      }
    },
  };
}
