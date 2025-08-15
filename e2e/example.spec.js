import { test, expect } from "@playwright/test";

test("dashboard loads successfully", async ({ page }) => {
  await page.goto("/");

  // Check if the page loads and has expected content
  await expect(page).toHaveTitle(/Dyson Protocol/);

  // You can add more specific tests based on your dashboard content
  // For example:
  // await expect(page.locator('h1')).toContainText('Dashboard');
});

test("navigation works", async ({ page }) => {
  await page.goto("/");

  // Test basic navigation if you have nav elements
  // This is a placeholder - adjust based on your actual dashboard structure
  const navElements = page.locator("nav");
  if ((await navElements.count()) > 0) {
    await expect(navElements).toBeVisible();
  }
});
