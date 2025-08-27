import { useRouter } from "vue-router";
import { useRouteContext } from "./useRouteContext";

export function useSmartNavigation() {
  const router = useRouter();
  const { isAddressContext, currentAddress } = useRouteContext();

  // Navigate to address-specific or general view based on context
  const navigateToAddress = (address) => {
    router.push(`/address/${address}`);
  };

  const navigateToName = (name) => {
    router.push(`/names/${name}`);
  };

  const navigateToTransaction = (hash) => {
    router.push(`/txs/${hash}`);
  };

  const navigateToNFT = (classId, tokenId = null) => {
    const root = String(classId || "").split("/")[0] || "";
    if (tokenId)
      return router.push(
        `/names/${encodeURIComponent(root)}/nfts/${encodeURIComponent(
          classId
        )}/${encodeURIComponent(tokenId)}`
      );
    return router.push(
      `/names/${encodeURIComponent(root)}/nfts/${encodeURIComponent(classId)}`
    );
  };

  // Navigate within address context
  const navigateToAddressSection = (section) => {
    if (currentAddress.value) {
      router.push(`/address/${currentAddress.value}/${section}`);
    }
  };

  const navigateToAddressScript = (functionName = null, args = null) => {
    if (currentAddress.value) {
      let path = `/address/${currentAddress.value}/script`;
      if (functionName) {
        path += `/${functionName}`;
        if (args) {
          path += `?args=${encodeURIComponent(args)}`;
        }
      }
      router.push(path);
    }
  };

  const navigateToAddressStorage = (storagePath = null) => {
    if (currentAddress.value) {
      let path = `/address/${currentAddress.value}/storage`;
      if (storagePath) {
        path += `/${storagePath}`;
      }
      router.push(path);
    }
  };

  // Copy to clipboard with feedback
  const copyToClipboard = async (text, type = "text") => {
    try {
      await navigator.clipboard.writeText(text);
      // TODO: Add toast notification for successful copy
      console.log(`${type} copied to clipboard: ${text}`);
      return true;
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      return false;
    }
  };

  return {
    navigateToAddress,
    navigateToName,
    navigateToTransaction,
    navigateToNFT,
    navigateToAddressSection,
    navigateToAddressScript,
    navigateToAddressStorage,
    copyToClipboard,
  };
}
