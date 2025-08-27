import { test, expect } from '@playwright/test'

test('home page loads', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.ok()).toBe(true)
  await expect(page).toHaveTitle(/Dyson|Dyson Protocol|Dashboard/i)
})
