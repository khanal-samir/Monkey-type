import { expect, test, type Page, type Request } from '@playwright/test'
import { pathToFileURL } from 'node:url'

const ADMIN_EMAIL = 'samir1.dohoro@gmail.com'
const FIXTURE_SENTENCE_ID = 'fixture-sentence-0001'
const FIXTURE_PASSAGE =
  'type fast now. keep going steady. finish strong here.'

const SEROVAL_HREF = pathToFileURL(
  `${process.cwd()}/node_modules/.pnpm/seroval@1.6.2/node_modules/seroval/dist/index.js`,
).href

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

function isRankingsScoreboardRequest(req: Request): boolean {
  if (req.method() !== 'POST') return false
  if (!req.url().includes('/_serverFn/')) return false
  return (req.postData() ?? '').includes('durationSec')
}

function submitAttemptUrlFromClientModule(
  rankingsSource: string,
  sampleUrl: string,
): string {
  const idx = rankingsSource.indexOf('submitAttempt')
  if (idx < 0) {
    throw new Error(
      `submitAttempt not found in rankings module: ${rankingsSource.slice(0, 400)}`,
    )
  }
  const match = rankingsSource
    .slice(idx, idx + 800)
    .match(/createClientRpc\(\s*["']([^"']+)["']\s*\)/)
  const functionId = match?.[1]
  if (!functionId) {
    throw new Error(
      `Could not find submitAttempt RPC id in rankings module: ${rankingsSource.slice(idx, idx + 400)}`,
    )
  }
  const parsed = new URL(sampleUrl)
  const currentId = parsed.pathname.split('/').filter(Boolean).pop()
  if (!currentId) {
    throw new Error('Missing server function id in rankings request.')
  }
  parsed.pathname = parsed.pathname.replace(currentId, functionId)
  return parsed.toString()
}

async function loginAsAdmin(page: Page) {
  await clearSession(page)
  await page.goto('/login')
  await expect(page.getByTestId('login-form')).toBeVisible()
  await page.getByRole('textbox', { name: /email/i }).fill(ADMIN_EMAIL)
  await page.getByRole('button', { name: /continue/i }).click()
  await expect(page).toHaveURL('/')
}

async function loginAsAdminWithSubmitUrl(
  page: Page,
): Promise<{ submitAttemptUrl: string }> {
  await clearSession(page)
  await page.goto('/login')
  await expect(page.getByTestId('login-form')).toBeVisible()
  await page.getByRole('textbox', { name: /email/i }).fill(ADMIN_EMAIL)

  const rankingsFn = page.waitForRequest(isRankingsScoreboardRequest, {
    timeout: 20_000,
  })
  await page.getByRole('button', { name: /continue/i }).click()
  await expect(page).toHaveURL('/')
  const req = await rankingsFn
  const rankingsModule = await page.request.get('/src/server/rankings.ts')
  const rankingsSource = await rankingsModule.text()
  return {
    submitAttemptUrl: submitAttemptUrlFromClientModule(
      rankingsSource,
      req.url(),
    ),
  }
}

async function waitForPassage(page: Page) {
  const typingArea = page.getByLabel(/typing area/i)
  await expect(typingArea).toBeVisible()
  await expect(typingArea).toContainText('type fast now', { timeout: 15_000 })
  await expect(page.getByText(/loading sentence/i)).toHaveCount(0)
  return typingArea
}

type SubmitOutcome = { ok: boolean; status: number; message: string; url: string }

async function consoleSubmitAttempt(
  page: Page,
  submitAttemptUrl: string,
  data: Record<string, unknown>,
): Promise<SubmitOutcome> {
  const { toJSONAsync } = (await import(SEROVAL_HREF)) as {
    toJSONAsync: (value: unknown) => Promise<unknown>
  }
  const body = JSON.stringify(await toJSONAsync({ data }))
  const res = await page.request.post(submitAttemptUrl, {
    headers: {
      'content-type': 'application/json',
      'x-tsr-serverfn': 'true',
      accept: 'application/json',
      origin: 'http://127.0.0.1:3000',
      referer: 'http://127.0.0.1:3000/',
    },
    data: body,
  })
  const text = await res.text()
  const rejected =
    !res.ok() ||
    /client-sent wpm|exceeds the maximum|invalid attempt|sentence not found|nothing was typed/i.test(
      text,
    )
  return {
    ok: !rejected,
    status: res.status(),
    message: text,
    url: submitAttemptUrl,
  }
}

async function sessionUserId(page: Page): Promise<string> {
  const userId = await page.evaluate(() => {
    const raw = localStorage.getItem('monkey-type-session')
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as {
        state?: { user?: { id?: string } }
        user?: { id?: string }
      }
      return parsed.state?.user?.id ?? parsed.user?.id ?? null
    } catch {
      return null
    }
  })
  expect(userId).toBeTruthy()
  return userId as string
}

async function expectLeaderboardHasNoFakeWpm(page: Page) {
  await page.goto('/leaderboard')
  await expect(page).toHaveURL('/leaderboard')
  await expect(page.getByText(/loading rankings/i)).toHaveCount(0, {
    timeout: 10_000,
  })
  const column15 = page.getByRole('region', { name: '15s' })
  await expect(column15.getByText('999')).toHaveCount(0)
}

test.describe('console and crawl cheating', () => {
  test('ignores untrusted keydown events dispatched from the console', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    const typingArea = await waitForPassage(page)
    await typingArea.click()

    const firstLetter = typingArea.locator('[data-i="0"]')
    await expect(firstLetter).toHaveClass(/typing-upcoming/)

    await page.evaluate(() => {
      for (const key of 'type fast now') {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        )
      }
    })

    await expect(firstLetter).toHaveClass(/typing-upcoming/)
    await expect(firstLetter).not.toHaveClass(/typing-correct/)
    await expect(page.getByText(/^wpm$/i)).toHaveCount(0)
  })

  test('rejects a console payload that passes WPM instead of a typed run', async ({
    page,
  }) => {
    const { submitAttemptUrl } = await loginAsAdminWithSubmitUrl(page)
    await waitForPassage(page)
    const userId = await sessionUserId(page)

    const outcome = await consoleSubmitAttempt(page, submitAttemptUrl, {
      userId,
      durationSec: 15,
      wpm: 999,
      accuracy: 100,
    })

    expect(
      outcome,
      `status=${outcome.status} url=${outcome.url} body=${outcome.message.slice(0, 800)}`,
    ).toMatchObject({ ok: false })
    expect(outcome.message).toMatch(/client-sent wpm/i)
    await expectLeaderboardHasNoFakeWpm(page)
  })

  test('rejects crawling the passage and submitting it in 10ms', async ({
    page,
  }) => {
    const { submitAttemptUrl } = await loginAsAdminWithSubmitUrl(page)
    await waitForPassage(page)
    const userId = await sessionUserId(page)

    const outcome = await consoleSubmitAttempt(page, submitAttemptUrl, {
      userId,
      durationSec: 15,
      sentenceId: FIXTURE_SENTENCE_ID,
      typed: FIXTURE_PASSAGE,
      startedAtMs: 0,
      endedAtMs: 10,
    })

    expect(
      outcome,
      `status=${outcome.status} url=${outcome.url} body=${outcome.message.slice(0, 800)}`,
    ).toMatchObject({ ok: false })
    expect(outcome.message).toMatch(/wpm/i)
    await expectLeaderboardHasNoFakeWpm(page)
  })

  test('rejects a submit with no typed text', async ({ page }) => {
    const { submitAttemptUrl } = await loginAsAdminWithSubmitUrl(page)
    await waitForPassage(page)
    const userId = await sessionUserId(page)

    const outcome = await consoleSubmitAttempt(page, submitAttemptUrl, {
      userId,
      durationSec: 15,
      sentenceId: FIXTURE_SENTENCE_ID,
      typed: '',
      startedAtMs: 0,
      endedAtMs: 2_500,
    })

    expect(
      outcome,
      `status=${outcome.status} url=${outcome.url} body=${outcome.message.slice(0, 800)}`,
    ).toMatchObject({ ok: false })
    expect(outcome.message).toMatch(/nothing was typed/i)
    await expectLeaderboardHasNoFakeWpm(page)
  })
})
