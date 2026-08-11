import { expect, test, type Page } from '@playwright/test'

const ADMIN_EMAIL = 'samir1.dohoro@gmail.com'

async function clearSession(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    try {
      localStorage.clear()
    } catch {
      // ignore
    }
  })
  await page.reload()
  await expect(page.getByTestId('login-form')).toBeVisible()
}

async function loginAs(page: Page, email: string) {
  await page.goto('/login')
  await expect(page.getByTestId('login-form')).toBeVisible()
  await page.getByRole('textbox', { name: /email/i }).fill(email)
  await page.getByRole('button', { name: /continue/i }).click()
}

test.describe('Monkey Type acceptance', () => {
  test('rejects login for an unknown email', async ({ page }) => {
    await clearSession(page)
    await loginAs(page, 'unknown.outsider@example.com')

    await expect(page.getByRole('alert')).toContainText(/not allowlisted/i)
    await expect(page).toHaveURL(/\/login/)
  })

  test('logs in an allowlisted seeded admin', async ({ page }) => {
    await clearSession(page)
    await loginAs(page, ADMIN_EMAIL)

    await expect(page).toHaveURL('/')
    await expect(page.getByText('samir1').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible()
  })

  test('completes a timed run and shows the daily best on the leaderboard', async ({
    page,
  }) => {
    await clearSession(page)
    await loginAs(page, ADMIN_EMAIL)
    await expect(page).toHaveURL('/')

    await page.getByRole('tab', { name: '15' }).click()
    const typingArea = page.getByLabel(/typing area/i)
    await expect(typingArea).toBeVisible()
    // Sentence is rendered as per-character spans; assert via container text.
    await expect(typingArea).toContainText('type fast now', { timeout: 15_000 })
    await expect(page.getByText(/loading sentence/i)).toHaveCount(0)

    await typingArea.click()
    await typingArea.focus()
    // Start the run; short timer (~2.5s) completes without typing the full passage.
    await page.keyboard.type('type')

    await expect(page.getByRole('status')).toContainText(/run complete/i, {
      timeout: 20_000,
    })
    await expect(page.getByRole('status')).toContainText(/saved/i, {
      timeout: 10_000,
    })

    await page.getByRole('link', { name: /^leaderboard$/i }).click()
    await expect(page).toHaveURL('/leaderboard')
    await expect(page.getByText(/loading rankings/i)).toHaveCount(0, {
      timeout: 10_000,
    })

    const column15 = page.getByRole('region', { name: '15s' })
    await expect(column15.getByText('samir1')).toBeVisible({ timeout: 10_000 })
    await expect(column15.getByText(/wpm/i).first()).toBeVisible()
  })

  test('admin creates a user who can then log in', async ({ page }) => {
    const newbieEmail = `newbie.${Date.now()}@example.test`

    await clearSession(page)
    await loginAs(page, ADMIN_EMAIL)
    await expect(page).toHaveURL('/')

    await page.getByRole('link', { name: /^users$/i }).click()
    await expect(page).toHaveURL(/\/admin\/users/)
    await expect(page.getByRole('heading', { name: /^users$/i })).toBeVisible({
      timeout: 10_000,
    })

    await page
      .getByRole('textbox', { name: /email \(required\)/i })
      .fill(newbieEmail)
    await page.getByRole('button', { name: /create user/i }).click()

    await expect(page.getByText(newbieEmail)).toBeVisible({ timeout: 10_000 })

    await page.getByRole('link', { name: /monkey type/i }).click()
    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible()
    await page.getByRole('button', { name: /log out/i }).click()
    await expect(page.getByTestId('login-form')).toBeVisible()

    await loginAs(page, newbieEmail)
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible()
    await expect(page.getByText('newbie').first()).toBeVisible()
  })
})
