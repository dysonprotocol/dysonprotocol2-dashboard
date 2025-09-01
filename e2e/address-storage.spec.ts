import { test, expect } from '@playwright/test'

// Minimal smoke test: headers + empty state, then populated row
test.describe('Address Storage Table', () => {
  const address = 'cosmos1testaddressxyz'

  test('renders headers and empty state', async ({ page }) => {
    await page.route('**/dysonprotocol/storage/v1/storage_list**', async (route) => {
      const url = new URL(route.request().url())
      if (url.searchParams.get('owner')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ entries: [], pagination: { total: '0', next_key: '' } }),
        })
      }
      return route.continue()
    })

    await page.goto(`/address/${address}/storage`)

    const thead = page.locator('thead')
    await expect(thead).toBeVisible()
    await expect(thead.getByText('index')).toBeVisible()
    await expect(thead.getByText('hash')).toBeVisible()
    await expect(thead.getByText('height')).toBeVisible()
    await expect(thead.getByText('timestamp')).toBeVisible()
    await expect(thead.getByText('data')).toBeVisible()

    await expect(page.getByText('No entries')).toBeVisible()
  })

  test('renders one row from API response', async ({ page }) => {
    await page.route('**/dysonprotocol/storage/v1/storage_list**', async (route) => {
      const url = new URL(route.request().url())
      if (url.searchParams.get('owner')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            entries: [
              {
                owner: address,
                index: 'idx1',
                data: 'payload',
                updated_height: '123',
                updated_timestamp: '2025-01-01T00:00:00Z',
                hash: 'abc123',
              },
            ],
            pagination: { total: '1', next_key: '' },
          }),
        })
      }
      return route.continue()
    })

    await page.goto(`/address/${address}/storage`)
    await page.getByRole('button', { name: 'Search' }).click()
    await expect(page.getByRole('cell', { name: 'idx1' })).toBeVisible()
    await expect(page.getByText('abc123')).toBeVisible()
    await expect(page.getByText('payload')).toBeVisible()
  })
})
