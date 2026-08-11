import { expect, test } from '@playwright/test'

test('login page loads Dohoro Type identity shell', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  await expect(page.getByText(/dohoro type/i).first()).toBeVisible()
})
