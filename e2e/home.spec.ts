import { expect, test } from '@playwright/test'

test('home page loads Dohoro Type shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /dohoro type/i })).toBeVisible()
})
