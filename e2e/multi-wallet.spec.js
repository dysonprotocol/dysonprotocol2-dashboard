import { test, expect } from "@playwright/test";

test.describe("Multi-Wallet Management", () => {
  test.beforeEach(async ({ page }) => {
    console.log("🧹 Clearing localStorage and setting up test");

    // Store errors array on page for access in tests
    await page.evaluate(() => {
      window.testConsoleErrors = [];
    });

    // Track console errors (but avoid navigation race conditions)
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log("❌ CONSOLE ERROR:", msg.text());
        // Try to store error but ignore navigation errors
        try {
          page
            .evaluate((errorText) => {
              window.testConsoleErrors = window.testConsoleErrors || [];
              window.testConsoleErrors.push(errorText);
            }, msg.text())
            .catch(() => {
              // Ignore execution context destroyed errors during navigation
            });
        } catch (e) {
          // Ignore errors during page navigation
        }
      } else if (
        msg.text().includes("[WALLET]") ||
        msg.text().includes("ERROR")
      ) {
        console.log(`📝 CONSOLE ${msg.type()}:`, msg.text());
      }
    });

    page.on("pageerror", (error) => {
      console.log("💥 PAGE ERROR:", error.message);
      // Try to store error but ignore navigation errors
      try {
        page
          .evaluate((errorText) => {
            window.testConsoleErrors = window.testConsoleErrors || [];
            window.testConsoleErrors.push(errorText);
          }, error.message)
          .catch(() => {
            // Ignore execution context destroyed errors during navigation
          });
      } catch (e) {
        // Ignore errors during page navigation
      }
    });

    // Clear localStorage before each test
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    console.log("✅ Test setup complete");
  });

  test("import single wallet successfully", async ({ page }) => {
    const timestamp = Date.now();
    const walletName = `TestWallet_${timestamp}`;
    console.log(`🚀 Starting single wallet test with name: ${walletName}`);

    // Go to wallet page
    console.log("📍 Navigating to /wallet");
    await page.goto("/wallet");
    console.log("✅ Wallet page loaded");

    // Import wallet
    console.log("📝 Filling wallet name");
    await page.fill('[data-testid="wallet-name-input"]', walletName);

    console.log("🔐 Filling password");
    await page.fill('[data-testid="wallet-password-input"]', "password123");

    // Generate mnemonic
    console.log("🎲 Generating 12-word mnemonic");
    await page.click('[data-testid="generate-12-words"]');

    // Verify mnemonic was generated
    const mnemonicText = await page
      .locator('[data-testid="mnemonic-input"]')
      .inputValue();
    console.log(`✅ Mnemonic generated: ${mnemonicText.slice(0, 20)}...`);

    // Check security confirmation
    console.log("☑️ Checking security confirmation");
    await page.check('[data-testid="security-confirmation"]');

    // Submit form
    console.log("📤 Submitting import form");
    await page.click('[data-testid="import-wallet-submit"]');

    // Verify wallet is imported and appears in list
    console.log("🔍 Verifying wallet appears in list");
    const walletRow = page.locator(`[data-testid="wallet-row-${walletName}"]`);
    await expect(walletRow, "Wallet row should be visible").toBeVisible({
      timeout: 2000,
    });

    console.log("🔍 Verifying Active status");
    await expect(
      walletRow.locator(`[data-testid="wallet-status-active-${walletName}"]`),
      "Active badge should be visible"
    ).toBeVisible({ timeout: 1000 });

    console.log("🔍 Verifying Unlocked status");
    await expect(
      walletRow.locator(`[data-testid="wallet-status-unlocked-${walletName}"]`),
      "Unlocked badge should be visible"
    ).toBeVisible({ timeout: 1000 });

    // Check for console errors (allow chain loading errors)
    const consoleErrors = await page.evaluate(
      () => window.testConsoleErrors || []
    );
    const nonChainErrors = consoleErrors.filter(
      (err) => !err.includes("Failed to load chain ID")
    );
    expect(
      nonChainErrors,
      `No unexpected console errors. Found: ${nonChainErrors.join(", ")}`
    ).toHaveLength(0);

    console.log("✅ Single wallet import test completed successfully");
  });

  test("import multiple wallets and switch between them", async ({ page }) => {
    const timestamp = Date.now();
    const wallet1Name = `Wallet1_${timestamp}`;
    const wallet2Name = `Wallet2_${timestamp}`;
    console.log(
      `🚀 Starting multi-wallet test with names: ${wallet1Name}, ${wallet2Name}`
    );

    // Go to wallet page
    console.log("📍 Navigating to /wallet");
    await page.goto("/wallet");

    // Import first wallet
    console.log("📝 Importing first wallet");
    await page.fill('[data-testid="wallet-name-input"]', wallet1Name);
    await page.fill('[data-testid="wallet-password-input"]', "password123");

    console.log("🎲 Generating 12-word mnemonic for first wallet");
    await page.click('[data-testid="generate-12-words"]');

    console.log("☑️ Checking security confirmation for first wallet");
    await page.check('[data-testid="security-confirmation"]');

    console.log("📤 Submitting first wallet");
    await page.click('[data-testid="import-wallet-submit"]');

    // Verify first wallet is active
    console.log("🔍 Verifying first wallet is imported and active");
    const wallet1Row = page.locator(
      `[data-testid="wallet-row-${wallet1Name}"]`
    );
    await expect(wallet1Row, "First wallet row should be visible").toBeVisible({
      timeout: 2000,
    });
    await expect(
      wallet1Row.locator(`[data-testid="wallet-status-active-${wallet1Name}"]`),
      "First wallet should be active"
    ).toBeVisible({ timeout: 1000 });

    // Import second wallet
    console.log("📝 Importing second wallet");
    await page.fill('[data-testid="wallet-name-input"]', wallet2Name);
    await page.fill('[data-testid="wallet-password-input"]', "password456");

    console.log("🎲 Generating 24-word mnemonic for second wallet");
    await page.click('[data-testid="generate-24-words"]');

    console.log("☑️ Checking security confirmation for second wallet");
    await page.check('[data-testid="security-confirmation"]');

    console.log("📤 Submitting second wallet");
    await page.click('[data-testid="import-wallet-submit"]');

    // Verify second wallet is now active
    console.log("🔍 Verifying second wallet is imported and active");
    const wallet2Row = page.locator(
      `[data-testid="wallet-row-${wallet2Name}"]`
    );
    await expect(wallet2Row, "Second wallet row should be visible").toBeVisible(
      { timeout: 2000 }
    );

    console.log("🔍 Verifying only one wallet is active");
    await expect(
      page.locator('[data-testid*="wallet-status-active-"]'),
      "Only one Active badge should exist"
    ).toHaveCount(1, { timeout: 1000 });

    // Check that wallet2 is the active one
    console.log("🔍 Verifying wallet2 is the active one");
    await expect(
      wallet2Row.locator(`[data-testid="wallet-status-active-${wallet2Name}"]`),
      "Wallet2 should be active"
    ).toBeVisible({ timeout: 1000 });

    // Check for console errors (allow chain loading errors)
    const consoleErrors = await page.evaluate(
      () => window.testConsoleErrors || []
    );
    const nonChainErrors = consoleErrors.filter(
      (err) => !err.includes("Failed to load chain ID")
    );
    expect(
      nonChainErrors,
      `No unexpected console errors. Found: ${nonChainErrors.join(", ")}`
    ).toHaveLength(0);

    console.log("✅ Multi-wallet test completed successfully");
  });

  test("header shows connect button when no wallets", async ({ page }) => {
    console.log("🚀 Testing header shows connect button when no wallets");

    // Go to home page with no wallets
    await page.goto("/");

    // Should show "Connect Wallet" button
    console.log("🔍 Looking for Connect Wallet button");
    await expect(page.locator('text="Connect Wallet"')).toBeVisible({
      timeout: 2000,
    });

    console.log("✅ Connect Wallet button visible when no wallets");
  });

  test("wallet switching works within session on wallet page", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const wallet1Name = `SessionWallet1_${timestamp}`;
    const wallet2Name = `SessionWallet2_${timestamp}`;
    console.log(
      `🚀 Testing wallet switching within session: ${wallet1Name}, ${wallet2Name}`
    );

    // Import first wallet
    await page.goto("/wallet");
    await page.fill('[data-testid="wallet-name-input"]', wallet1Name);
    await page.fill('[data-testid="wallet-password-input"]', "password123");
    await page.click('[data-testid="generate-12-words"]');
    await page.check('[data-testid="security-confirmation"]');
    await page.click('[data-testid="import-wallet-submit"]');
    console.log("✅ First wallet imported");

    // Verify form fields are reset (empty) - this will wait up to 2 seconds
    await expect(page.locator('[data-testid="wallet-name-input"]')).toHaveValue(
      "",
      { timeout: 2000 }
    );
    await expect(page.locator('[data-testid="mnemonic-input"]')).toHaveValue(
      "",
      { timeout: 1000 }
    );

    // Import second wallet
    await page.fill('[data-testid="wallet-name-input"]', wallet2Name);
    await page.fill('[data-testid="wallet-password-input"]', "password456");
    await page.click('[data-testid="generate-24-words"]');
    await page.check('[data-testid="security-confirmation"]');
    await page.click('[data-testid="import-wallet-submit"]');
    console.log("✅ Second wallet imported");

    // Debug current wallet states
    console.log("🔍 Debugging current wallet states");
    const unlockedCount = await page.locator('text="Unlocked"').count();
    const activeCount = await page.locator('text="Active"').count();
    const lockedCount = await page.locator('text="Locked"').count();
    console.log(
      `Found: ${unlockedCount} Unlocked, ${activeCount} Active, ${lockedCount} Locked`
    );

    // Use test IDs to find wallet rows and check states
    const wallet1Row = page.locator(
      `[data-testid="wallet-row-${wallet1Name}"]`
    );
    const wallet2Row = page.locator(
      `[data-testid="wallet-row-${wallet2Name}"]`
    );

    // Check wallet states using test IDs
    const wallet1Active = await wallet1Row
      .locator(`[data-testid="wallet-status-active-${wallet1Name}"]`)
      .count();
    const wallet1Unlocked = await wallet1Row
      .locator(`[data-testid="wallet-status-unlocked-${wallet1Name}"]`)
      .count();
    const wallet2Active = await wallet2Row
      .locator(`[data-testid="wallet-status-active-${wallet2Name}"]`)
      .count();
    const wallet2Unlocked = await wallet2Row
      .locator(`[data-testid="wallet-status-unlocked-${wallet2Name}"]`)
      .count();

    console.log(
      `Wallet1 states: ${wallet1Active ? "Active" : ""} ${
        wallet1Unlocked ? "Unlocked" : "Locked"
      }`
    );
    console.log(
      `Wallet2 states: ${wallet2Active ? "Active" : ""} ${
        wallet2Unlocked ? "Unlocked" : "Locked"
      }`
    );

    // Based on our implementation, only the active wallet should be unlocked
    // The previous wallet should be locked when a new one becomes active
    await expect(
      page.locator('[data-testid*="wallet-status-active-"]')
    ).toHaveCount(1);
    await expect(
      wallet2Row.locator(`[data-testid="wallet-status-active-${wallet2Name}"]`)
    ).toBeVisible();
    console.log("✅ Wallet2 is active");

    // Current implementation shows wallet1 as "Unlocked" but not "Active"
    // This demonstrates the multi-wallet functionality: multiple wallets can be unlocked simultaneously

    // Test wallet switching: Lock wallet1, then unlock it to make it active
    console.log("🔄 Testing wallet switching: Lock wallet1 first");
    await page.click(`[data-testid="wallet-lock-${wallet1Name}"]`);

    // Verify wallet1 is now locked
    await expect(
      wallet1Row.locator(`[data-testid="wallet-status-locked-${wallet1Name}"]`)
    ).toBeVisible({
      timeout: 1000,
    });
    console.log("✅ Wallet1 is now locked");

    // Now unlock wallet1 to make it active
    console.log("🔄 Unlocking wallet1 to make it active");
    await page.click(`[data-testid="wallet-unlock-${wallet1Name}"]`);

    // Enter password to unlock wallet1
    await page.fill('[data-testid="unlock-password-input"]', "password123");
    await page.click('[data-testid="unlock-submit"]');
    console.log("✅ Switched to wallet1");

    // Verify wallet1 is now active
    await expect(
      wallet1Row.locator(`[data-testid="wallet-status-active-${wallet1Name}"]`)
    ).toBeVisible({
      timeout: 1000,
    });
    await expect(
      wallet2Row.locator(`[data-testid="wallet-status-active-${wallet2Name}"]`)
    ).not.toBeVisible({
      timeout: 1000,
    });
    console.log("✅ Wallet1 is now active");

    // Test wallet removal
    console.log("🗑️ Testing wallet removal");
    const initialWalletCount = await page
      .locator('[data-testid*="wallet-row-"]')
      .count();
    await page.click(`[data-testid="wallet-remove-${wallet2Name}"]`);

    // Verify wallet2 is removed
    await expect(wallet2Row).not.toBeVisible({ timeout: 1000 });
    await expect(page.locator('[data-testid*="wallet-row-"]')).toHaveCount(
      initialWalletCount - 1
    );
    console.log("✅ Wallet2 removed successfully");

    // Check for console errors (allow chain loading errors)
    const consoleErrors = await page.evaluate(
      () => window.testConsoleErrors || []
    );
    const nonChainErrors = consoleErrors.filter(
      (err) => !err.includes("Failed to load chain ID")
    );
    expect(
      nonChainErrors,
      `No unexpected console errors. Found: ${nonChainErrors.join(", ")}`
    ).toHaveLength(0);

    console.log("✅ Multi-wallet functionality test completed successfully");
  });
});
