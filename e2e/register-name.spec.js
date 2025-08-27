import { test, expect } from '@playwright/test'

// Fixture: ensure a local CosmJS wallet named "test" exists and is unlocked
async function ensureTestWallet(page) {
  // Navigate to home to ensure sidebar is mounted
  await page.goto('/')

  // Expand "Add CosmJS wallet" section via test id
  await page.getByTestId('cosmjs-add-toggle').check()

  // If wallet already exists, nothing to do
  const existing = page.getByText('test')
  if (
    await existing
      .first()
      .isVisible()
      .catch(() => false)
  )
    return

  // Fill in wallet import form
  await page.getByTestId('cosmjs-name-input').fill('test')
  await page
    .getByTestId('cosmjs-mnemonic-input')
    .fill(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    )
  await page.getByTestId('cosmjs-seed-confirm').check()
  await page.getByTestId('cosmjs-password-input').fill('pass')

  // Submit import
  await page.getByTestId('cosmjs-add-button').click()

  // Wait for wallet to appear (unique header element of the wallet card)
  await expect(
    page.locator('.collapse .collapse-title .text-base', { hasText: 'test' }).first()
  ).toBeVisible({ timeout: 15000 })
}

function randomName(len = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  let s = ''
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `${s}.dys`
}

test('register a new name end-to-end', async ({ page }) => {
  page.on('console', (msg) => console.log(`[browser:${msg.type()}]`, msg.text()))
  page.on('pageerror', (err) => console.error('[pageerror]', err))

  // No mocks: rely on live test server

  await ensureTestWallet(page)

  // Go to names page
  await page.goto('/names')
  await expect(page.getByText('Register Name')).toBeVisible({ timeout: 15000 })

  // Step 1: choose a random available name
  const name = randomName(10)
  await page.getByTestId('reg-name-input').fill(name.replace(/\.dys$/, ''))
  await expect(page.getByText('is available').first()).toBeVisible({ timeout: 15000 })

  // Step 2: valuation
  await page.getByTestId('reg-valuation-input').fill('1')
  // Denom should default to dys2; if a selector exists, keep default

  // Step 3: select wallet via WalletSelector
  await page.getByTestId('wallet-selector-open').click()
  await page.getByTestId('wallet-item-test').first().click({ timeout: 10000 })

  // Step 4: commit -> confirm tx in modal
  await page.getByTestId('reg-commit-button').click()
  await page.getByText('Transaction Details', { exact: false }).waitFor({ timeout: 15000 })
  await page.getByText('Confirm Transaction').click()

  // Step 5: reveal -> confirm tx in modal
  await page.getByTestId('reg-reveal-button').click({ timeout: 15000 })
  await page.getByText('Transaction Details', { exact: false }).waitFor({ timeout: 15000 })
  await page.getByText('Confirm Transaction').click()

  // Step 6: success link
  await expect(page.getByRole('button', { name: new RegExp(name) })).toBeVisible({ timeout: 30000 })
})
