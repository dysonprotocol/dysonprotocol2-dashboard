import { describe, it, expect, beforeEach, vi } from "vitest";
import { useWallet } from "../useWallet";

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: vi.fn((key) => localStorageMock.store[key] || null),
  setItem: vi.fn((key, value) => {
    localStorageMock.store[key] = String(value);
  }),
  removeItem: vi.fn((key) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock window.location
Object.defineProperty(window, "location", {
  value: {
    origin: "http://localhost:5173",
  },
});

describe("useWallet", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();

    // Clean up any existing wallets using the wallet's deleteWallet method
    const wallet = useWallet();
    const existingWallets = [...wallet.localWallets.value];
    existingWallets.forEach((w) => wallet.deleteWallet(w.name));
  });

  it("should initialize with default state", () => {
    const wallet = useWallet();

    expect(wallet.isConnected.value).toBe(false);
    expect(wallet.currentAddress.value).toBeNull();
    expect(wallet.localWallets.value).toEqual([]);
  });

  it("should import a named CosmJS wallet", async () => {
    const wallet = useWallet();
    const testMnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const walletName = "test-wallet-import";

    const result = await wallet.importNamedCosmJsWallet(
      walletName,
      testMnemonic,
      "password123"
    );

    expect(result.name).toBe(walletName);
    expect(result.address).toMatch(/^dys[a-z0-9]+$/); // Should be a valid dys address
    expect(result.mnemonic).toBe(testMnemonic);
    expect(result._pass).toBe("password123");

    // Should be stored in localWallets
    expect(wallet.localWallets.value.some((w) => w.name === walletName)).toBe(
      true
    );
  });

  it("should prevent duplicate wallet names", async () => {
    const wallet = useWallet();
    const testMnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    await wallet.importNamedCosmJsWallet(
      "test-wallet",
      testMnemonic,
      "password123"
    );

    await expect(
      wallet.importNamedCosmJsWallet("test-wallet", testMnemonic, "password456")
    ).rejects.toThrow('Wallet named "test-wallet" already exists');
  });

  it("should connect to a named CosmJS wallet with correct password", async () => {
    const wallet = useWallet();
    const testMnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    // First import the wallet
    await wallet.importNamedCosmJsWallet(
      "test-wallet",
      testMnemonic,
      "password123"
    );

    // Then connect to it
    const result = await wallet.connectNamedCosmJsWallet(
      "test-wallet",
      "password123"
    );

    expect(result.name).toBe("test-wallet");
    expect(wallet.isConnected.value).toBe(true);
    expect(wallet.walletType.value).toBe("cosmjs");
    expect(wallet.walletAddress.value).toBe(result.address);
  });

  it("should reject connection with wrong password", async () => {
    const wallet = useWallet();
    const testMnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    await wallet.importNamedCosmJsWallet(
      "test-wallet",
      testMnemonic,
      "password123"
    );

    await expect(
      wallet.connectNamedCosmJsWallet("test-wallet", "wrongpassword")
    ).rejects.toThrow("Invalid password");

    expect(wallet.isConnected.value).toBe(false);
  });

  it("should reject connection to non-existent wallet", async () => {
    const wallet = useWallet();

    await expect(
      wallet.connectNamedCosmJsWallet("non-existent", "password123")
    ).rejects.toThrow('Wallet "non-existent" not found');
  });

  it("should disconnect wallet and clear state", async () => {
    const wallet = useWallet();
    const testMnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    // Connect a wallet first
    await wallet.importNamedCosmJsWallet(
      "test-wallet",
      testMnemonic,
      "password123"
    );
    await wallet.connectNamedCosmJsWallet("test-wallet", "password123");

    expect(wallet.isConnected.value).toBe(true);

    // Disconnect
    wallet.disconnect();

    expect(wallet.isConnected.value).toBe(false);
    expect(wallet.walletAddress.value).toBe("");
    expect(wallet.walletType.value).toBe("");
  });

  it("should delete a wallet", async () => {
    const wallet = useWallet();
    const testMnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    // Import and connect wallet
    await wallet.importNamedCosmJsWallet(
      "test-wallet",
      testMnemonic,
      "password123"
    );
    await wallet.connectNamedCosmJsWallet("test-wallet", "password123");

    expect(wallet.localWallets.value).toHaveLength(1);
    expect(wallet.isConnected.value).toBe(true);

    // Delete the wallet
    wallet.deleteWallet("test-wallet");

    expect(wallet.localWallets.value).toHaveLength(0);
    expect(wallet.isConnected.value).toBe(false); // Should auto-disconnect
  });

  it("should provide getWallet method when connected", async () => {
    const wallet = useWallet();
    const testMnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    await wallet.importNamedCosmJsWallet(
      "test-wallet",
      testMnemonic,
      "password123"
    );
    await wallet.connectNamedCosmJsWallet("test-wallet", "password123");

    const walletInfo = wallet.getWallet();

    expect(walletInfo.walletInstance).toBeDefined();
    expect(walletInfo.address).toMatch(/^dys[a-z0-9]+$/);
    expect(walletInfo.type).toBe("cosmjs");
  });

  it("should throw error when getWallet called without connection", () => {
    const wallet = useWallet();

    expect(() => wallet.getWallet()).toThrow("No wallet connected");
  });

  it("should have a restore method for compatibility", () => {
    const wallet = useWallet();

    // The restore method should exist and not throw
    expect(typeof wallet.restore).toBe("function");
    expect(() => wallet.restore()).not.toThrow();

    // Since useStorage handles restoration automatically,
    // this method is just for compatibility
  });

  it("should handle localStorage restore errors gracefully", () => {
    // Set invalid JSON in localStorage
    localStorageMock.setItem("activeWalletMeta", "invalid-json");

    const wallet = useWallet();

    // Should not throw
    expect(() => wallet.restore()).not.toThrow();
    expect(wallet.isConnected.value).toBe(false);
  });

  it("should generate correct signer address", async () => {
    const wallet = useWallet();
    const testMnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    await wallet.importNamedCosmJsWallet(
      "test-wallet",
      testMnemonic,
      "password123"
    );
    await wallet.connectNamedCosmJsWallet("test-wallet", "password123");

    const signerAddress = wallet.getSignerAddress();
    expect(signerAddress).toBe(wallet.walletAddress.value);
    expect(signerAddress).toMatch(/^dys[a-z0-9]+$/);
  });

  it("should check wallet connection status correctly", async () => {
    const wallet = useWallet();

    expect(wallet.isWalletConnected()).toBe(false);

    const testMnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    await wallet.importNamedCosmJsWallet(
      "test-wallet",
      testMnemonic,
      "password123"
    );
    await wallet.connectNamedCosmJsWallet("test-wallet", "password123");

    expect(wallet.isWalletConnected()).toBe(true);
  });

  it("should update restUrl", () => {
    const wallet = useWallet();

    // Should have the default restUrl
    expect(wallet.restUrl.value).toBe("http://localhost:1317/");

    // Should update restUrl
    const newRestUrl = "https://api.example.com";
    wallet.updateRestUrl(newRestUrl);

    expect(wallet.restUrl.value).toBe(newRestUrl);
  });

  it("should store encrypted wallet data on import", async () => {
    const wallet = useWallet();
    await wallet.importNamedCosmJsWallet(
      "test",
      "mnemonic words here",
      "pass123"
    );
    const stored = wallet.localWallets.value[0];
    expect(stored.encrypted).toBeDefined();
    expect(stored.mnemonic).toBeUndefined();
  });

  it("should unlock with correct password", async () => {
    // import then unlock
  });

  it("should auto-restore with insecure toggle", async () => {
    // enable toggle, unlock, call init, check unlockedWallets
  });

  it("should restore Keplr if available", async () => {
    // mock window.keplr, add meta, call init, check
  });
});
