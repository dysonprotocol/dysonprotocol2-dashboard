import { test, expect } from '@playwright/test'

test('names page loads and renders header', async ({ page }) => {
  page.on('console', (msg) => console.log(`[browser:${msg.type()}]`, msg.text()))
  page.on('pageerror', (err) => console.error('[pageerror]', err))

  await page.route('**/cosmos/base/tendermint/v1beta1/node_info', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        default_node_info: {
          network: 'local-testing',
          other: { rpc_address: 'http://localhost:26657' },
        },
      }),
    })
  })

  const response = await page.goto('/names')
  expect(response?.ok()).toBe(true)
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/\/names\/?$/)
  await expect(page.getByText('All names')).toBeVisible({ timeout: 15000 })
})
