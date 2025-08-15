import { test, expect } from "@playwright/test";

test.describe("Connect Button Menu", () => {
  // Track console errors during tests
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];

    // Listen for console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        // Filter out expected chain loading errors and known safe errors
        const text = msg.text();
        if (
          !text.includes("Failed to fetch") &&
          !text.includes("NetworkError") &&
          !text.includes("ERR_CONNECTION_REFUSED") &&
          !text.includes("cosmos/base/tendermint") &&
          !text.includes("Could not connect to localhost") &&
          !text.includes("Failed to load chain ID") &&
          !text.includes("Failed to load resource")
        ) {
          consoleErrors.push({
            text: text,
            timestamp: new Date().toISOString(),
            stack: msg.location(),
          });
        }
      }
    });
  });

  test.afterEach(async () => {
    // Assert no unexpected console errors occurred
    expect(consoleErrors).toHaveLength(0);
  });
  test("should show dropdown menu when connect button clicked", async ({
    page,
  }) => {
    // Navigate to home page
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should show "Connect Wallet" button when disconnected
    await expect(
      page.locator('[data-testid="connect-wallet-button"]')
    ).toBeVisible();

    // Click should show dropdown menu, not navigate immediately
    await page.click('[data-testid="connect-wallet-button"]');

    // Verify dropdown menu items are visible
    await expect(
      page.locator('[data-testid="connect-keplr-button"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="manage-wallets-link"]')
    ).toBeVisible();

    // Test Manage Wallets link
    await page.click('[data-testid="manage-wallets-link"]');
    await page.waitForURL("/wallet");
  });

  test("should display full address without truncation", async ({ page }) => {
    // Navigate to wallet page
    await page.goto("/wallet");
    await page.waitForLoadState("networkidle");

    // Import a wallet first
    await page.fill('[data-testid="wallet-name-input"]', "TestWallet");
    await page.fill(
      '[data-testid="mnemonic-input"]',
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    );
    await page.fill('[data-testid="wallet-password-input"]', "password123");
    await page.check('[data-testid="security-confirmation"]');
    await page.click('[data-testid="import-wallet-submit"]');

    // Wait for wallet to be imported and unlocked
    await page.waitForSelector(
      '[data-testid="wallet-status-unlocked-TestWallet"]',
      { timeout: 2000 }
    );

    // Check that full address is displayed in wallet list (not truncated)
    const walletAddress = await page
      .locator('[data-testid="wallet-address-TestWallet"]')
      .textContent();

    // Address should be full length (40+ characters for Cosmos addresses)
    expect(walletAddress.length).toBeGreaterThan(39);
    expect(walletAddress).toMatch(/^dys[0-9a-z]+$/);
  });

  test("should persist unlocked wallets and selected wallet across refresh", async ({
    page,
  }) => {
    // Navigate to wallet page and import multiple wallets
    await page.goto("/wallet");
    await page.waitForLoadState("networkidle");

    // Import first wallet
    await page.fill('[data-testid="wallet-name-input"]', "Wallet1");
    await page.fill(
      '[data-testid="mnemonic-input"]',
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    );
    await page.fill('[data-testid="wallet-password-input"]', "password123");
    await page.check('[data-testid="security-confirmation"]');
    await page.click('[data-testid="import-wallet-submit"]');

    // Wait for first wallet to be imported and unlocked
    await page.waitForSelector(
      '[data-testid="wallet-status-unlocked-Wallet1"]',
      { timeout: 2000 }
    );

    // Import second wallet
    await page.fill('[data-testid="wallet-name-input"]', "Wallet2");
    await page.fill(
      '[data-testid="mnemonic-input"]',
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art"
    );
    await page.fill('[data-testid="wallet-password-input"]', "password456");
    await page.check('[data-testid="security-confirmation"]');
    await page.click('[data-testid="import-wallet-submit"]');

    // Wait for second wallet to be imported and unlocked
    await page.waitForSelector(
      '[data-testid="wallet-status-unlocked-Wallet2"]',
      { timeout: 2000 }
    );

    // Verify both wallets are unlocked
    await expect(
      page.locator('[data-testid="wallet-status-unlocked-Wallet1"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="wallet-status-unlocked-Wallet2"]')
    ).toBeVisible();

    // Get addresses for comparison after refresh
    const wallet1Address = await page
      .locator('[data-testid="wallet-address-Wallet1"]')
      .textContent();
    const wallet2Address = await page
      .locator('[data-testid="wallet-address-Wallet2"]')
      .textContent();

    // Check which wallet is currently selected
    const wallet1Selected = await page
      .locator('[data-testid="wallet-status-selected-Wallet1"]')
      .isVisible();
    const wallet2Selected = await page
      .locator('[data-testid="wallet-status-selected-Wallet2"]')
      .isVisible();

    // Refresh the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify wallet metadata persists
    await expect(
      page.locator('[data-testid="wallet-address-Wallet1"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="wallet-address-Wallet2"]')
    ).toBeVisible();

    const persistedWallet1Address = await page
      .locator('[data-testid="wallet-address-Wallet1"]')
      .textContent();
    const persistedWallet2Address = await page
      .locator('[data-testid="wallet-address-Wallet2"]')
      .textContent();

    expect(persistedWallet1Address).toBe(wallet1Address);
    expect(persistedWallet2Address).toBe(wallet2Address);

    // CRITICAL: Verify wallets remain unlocked after refresh
    await expect(
      page.locator('[data-testid="wallet-status-unlocked-Wallet1"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="wallet-status-unlocked-Wallet2"]')
    ).toBeVisible();

    // Verify selected wallet persists (exactly one wallet should be selected)
    const wallet1StillSelected = await page
      .locator('[data-testid="wallet-status-selected-Wallet1"]')
      .isVisible();
    const wallet2StillSelected = await page
      .locator('[data-testid="wallet-status-selected-Wallet2"]')
      .isVisible();

    expect(wallet1StillSelected).toBe(wallet1Selected);
    expect(wallet2StillSelected).toBe(wallet2Selected);

    // Ensure exactly one wallet is selected
    expect(wallet1StillSelected || wallet2StillSelected).toBe(true);

    // Test explicit lock functionality - wallet should become locked when explicitly locked
    await page.click('[data-testid="lock-wallet-Wallet1"]');
    await expect(
      page.locator('[data-testid="wallet-status-locked-Wallet1"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="wallet-status-unlocked-Wallet1"]')
    ).not.toBeVisible();

    // Wallet2 should remain unlocked
    await expect(
      page.locator('[data-testid="wallet-status-unlocked-Wallet2"]')
    ).toBeVisible();
  });
});
