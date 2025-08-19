import { defineStore } from "pinia";
import { ref, computed, inject } from "vue";

export const useAddressStore = defineStore("address", () => {
  const chainInfo = inject("chainInfo", { restUrl: "" });
  const currentAddress = ref("");
  // const addressCache = ref(new Map());
  const nameCache = ref(new Map());

  // Address validation regex (bech32 format for Cosmos chains)
  // Prefix aligns with App.vue CHAIN_INFO.bech32Prefix
  const BECH32_PREFIX = "dys2";
  const BECH32_REGEX = new RegExp(`^${BECH32_PREFIX}1[0-9a-z]{38,87}$`, "i");

  // Check if string is a valid bech32 address
  const isValidAddress = (address) => BECH32_REGEX.test(address);

  // Check if string looks like a name (not an address)
  const isName = (input) =>
    !isValidAddress(input) && /^[a-z0-9.-]+$/i.test(input);

  // Resolve address or name to an actual address
  const resolveAddressOrName = async (input) => {
    if (!input) return null;

    // If it's already a valid address, return it
    if (isValidAddress(input)) return input;

    // If it looks like a name, try to resolve it
    if (isName(input)) {
      // Check cache first
      if (nameCache.value.has(input)) return nameCache.value.get(input);

      try {
        const url = `${
          chainInfo.restUrl
        }/dysonprotocol/nameservice/v1/resolve_name/${encodeURIComponent(
          input
        )}`;
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const json = await resp.json();
        const addr = String(json?.address || "");
        if (!isValidAddress(addr)) return null;
        nameCache.value.set(input, addr);
        return addr;
      } catch (error) {
        console.error("Name resolution failed:", error);
        return null;
      }
    }

    // Invalid format
    return null;
  };

  // Set current address
  const setCurrentAddress = (address) => {
    currentAddress.value = address;
  };

  // Get current address
  const getCurrentAddress = computed(() => currentAddress.value);

  // Truncate address for display
  const truncateAddress = (address, chars = 5) => {
    if (!address) return "";
    const startChars = chars + 5;
    const endChars = chars;
    if (address.length <= startChars + endChars) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  };

  // Cache resolved addresses
  const cacheAddress = (input, resolvedAddress) => {
    if (isName(input)) {
      nameCache.value.set(input, resolvedAddress);
    }
  };

  return {
    currentAddress,
    isValidAddress,
    isName,
    resolveAddressOrName,
    setCurrentAddress,
    getCurrentAddress,
    truncateAddress,
    cacheAddress,
  };
});
