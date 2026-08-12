import { expect, test } from '@playwright/test'

test('login page loads Typer Durden identity shell', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  await expect(page.getByText(/typer durden/i).first()).toBeVisible()
})
