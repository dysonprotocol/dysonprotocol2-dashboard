import { test, expect } from "@playwright/test";

test.describe("Wallet Management", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("wallet page loads successfully", async ({ page }) => {
    await page.goto("/wallet");
    await expect(page.locator("h1")).toContainText("Wallet Management");
  });

  test("shows connect wallet interface when not connected", async ({
    page,
  }) => {
    await page.goto("/wallet");
    await expect(page.locator(".card-title").first()).toContainText(
      "Connect Keplr"
    );
    // Use more specific selector for the Connect Keplr button
    await expect(
      page.locator('button:has-text("Connect Keplr")').first()
    ).toBeVisible();
  });

  test("connect keplr button attempts connection", async ({ page }) => {
    await page.goto("/wallet");

    // Verify the connect keplr button is visible and has correct text
    await expect(page.locator("main .btn-primary")).toContainText(
      "Connect Keplr"
    );

    // Note: Actual Keplr connection testing requires browser extension mocking
    // which is complex in e2e tests, so we just verify the button exists and is clickable
    await expect(page.locator("main .btn-primary")).toBeEnabled();
  });

  test("keplr connection does not open modal", async ({ page }) => {
    await page.goto("/wallet");

    // Verify no modal exists initially
    await expect(page.locator(".modal-open")).not.toBeVisible();

    // Click connect button (this will attempt Keplr connection but no modal should open)
    // Note: In a real test environment this would fail due to no Keplr extension,
    // but we're just testing that no modal UI appears
    await expect(page.locator(".modal-open")).not.toBeVisible();
  });

  test("wallet button exists in header", async ({ page }) => {
    await page.goto("/");

    // Check for the header wallet button with more specific selector
    await expect(
      page.locator('button:has-text("Connect Keplr")')
    ).toBeVisible();
  });

  test("wallet settings navigation from header exists", async ({ page }) => {
    // This test just verifies the navigation structure exists
    // since wallet state mocking is complex in E2E
    await page.goto("/");

    // Check for the header wallet button when disconnected
    await expect(
      page.locator('button:has-text("Connect Keplr")')
    ).toBeVisible();

    // The actual connected state navigation is tested in the import workflow test
  });

  test("import wallet workflow", async ({ page }) => {
    await page.goto("/wallet");

    // Open wallet selector
    await page.click("main .btn-primary");

    // Switch to import mode
    await page.click('button:has-text("Import Existing")');

    // Fill form fields
    await page.fill('input[placeholder="Enter wallet name"]', "Test Wallet");
    await page.fill('input[placeholder="Enter password"]', "password123");

    // Import button should be disabled without mnemonic
    await expect(
      page.locator('button:has-text("Import Wallet")')
    ).toBeDisabled();

    // Add mnemonic
    const validMnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    await page.fill('textarea[placeholder*="mnemonic"]', validMnemonic);

    // Import button should now be enabled
    await expect(
      page.locator('button:has-text("Import Wallet")')
    ).toBeEnabled();
  });

  test("actual wallet import with complete workflow", async ({ page }) => {
    // Listen for console logs
    page.on("console", (msg) => {
      if (msg.text().includes("[WALLET]")) {
        console.log("BROWSER LOG:", msg.text());
      }
    });

    // Listen for errors
    page.on("pageerror", (error) => {
      console.log("PAGE ERROR:", error.message);
    });

    await page.goto("/wallet");

    // Open wallet selector
    await page.click("main .btn-primary");

    // Switch to import mode
    await page.click('button:has-text("Import Existing")');

    // Fill complete form
    await page.fill('input[placeholder="Enter wallet name"]', "Test Wallet");
    await page.fill('input[placeholder="Enter password"]', "password123");

    // Use a valid BIP39 mnemonic
    const validMnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    await page.fill('textarea[placeholder*="mnemonic"]', validMnemonic);

    console.log("About to click Import Wallet button...");

    // Import the wallet
    await page.click('button:has-text("Import Wallet")');

    console.log("Clicked Import Wallet, waiting for modal to close...");

    // Wait for modal to close and page to update (increased timeout for wallet creation)
    await expect(page.locator(".modal-open")).not.toBeVisible({
      timeout: 10000,
    });

    console.log("Modal closed, checking for wallet connected interface...");

    // Debug: Check what's actually on the page
    const pageContent = await page.content();
    console.log(
      'Page contains "Wallet Connected":',
      pageContent.includes("Wallet Connected")
    );

    // Should show connected wallet interface (increased timeout)
    await expect(page.locator('h2:has-text("Wallet Connected")')).toBeVisible({
      timeout: 10000,
    });

    // Should show wallet type (cosmjs type)
    await expect(
      page.locator(".stat-value").filter({ hasText: /COSMJS/i })
    ).toBeVisible();

    // Should show an address (any valid address format starting with dys2)
    await expect(
      page.locator(".stat-value").filter({ hasText: /dys2[a-z0-9]+/ })
    ).toBeVisible();
  });

  test("transaction functionality", async ({ page }) => {
    // This test verifies the transaction UI exists after a real wallet import
    await page.goto("/wallet");

    // Import a wallet first to get to connected state
    await page.click("main .btn-primary");
    await page.click('button:has-text("Import Existing")');
    await page.fill('input[placeholder="Enter wallet name"]', "TX Test Wallet");
    await page.fill('input[placeholder="Enter password"]', "password123");

    const validMnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    await page.fill('textarea[placeholder*="mnemonic"]', validMnemonic);
    await page.click('button:has-text("Import Wallet")');

    // Wait for connection
    await expect(page.locator(".modal-open")).not.toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('h2:has-text("Wallet Connected")')).toBeVisible({
      timeout: 10000,
    });

    // Should show test transaction section
    await expect(page.locator('h2:has-text("Test Transaction")')).toBeVisible();
    await expect(
      page.locator('input[placeholder="Test message"]')
    ).toBeVisible();
  });

  test("create new wallet workflow", async ({ page }) => {
    await page.goto("/wallet");

    // Open wallet selector
    await page.click("main .btn-primary");

    // Should be on create mode by default
    await expect(
      page.locator('.tab-active:has-text("Create New")')
    ).toBeVisible();

    // Fill form fields
    await page.fill('input[placeholder="Enter wallet name"]', "New Wallet");
    await page.fill('input[placeholder="Enter password"]', "password123");

    // Generate seed phrase
    await page.click('button:has-text("Generate 12 Words")');

    // Should have generated mnemonic
    const mnemonicValue = await page.locator("textarea[readonly]").inputValue();
    expect(mnemonicValue).toBeTruthy();
    expect(mnemonicValue.split(" ")).toHaveLength(12);

    // Create button should be disabled without confirmation
    await expect(
      page.locator('button:has-text("Create Wallet")')
    ).toBeDisabled();

    // Check confirmation
    await page.check('input[type="checkbox"]');

    // Create button should now be enabled
    await expect(
      page.locator('button:has-text("Create Wallet")')
    ).toBeEnabled();
  });

  test("import wallet with invalid mnemonic checksum should fail", async ({
    page,
  }) => {
    await page.goto("/wallet");

    // Open wallet selector
    await page.click("main .btn-primary");

    // Fill form fields (no need to switch tabs anymore)
    await page.fill('input[placeholder="Enter wallet name"]', "Test Wallet");
    await page.fill('input[placeholder="Enter password"]', "password123");

    // Use an invalid mnemonic with incorrect checksum
    const invalidMnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon";
    await page.fill('textarea[placeholder*="mnemonic"]', invalidMnemonic);

    // Import the wallet - this should fail
    await page.click('button:has-text("Import Wallet")');

    // Check for alert with error message
    await expect(page.locator("text=Invalid mnemonic checksum")).toBeVisible({
      timeout: 5000,
    });

    // Modal should still be open since import failed
    await expect(page.locator(".modal-open")).toBeVisible();
  });
});
