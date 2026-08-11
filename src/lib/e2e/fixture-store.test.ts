import { beforeEach, describe, expect, it } from 'vitest'
import { SEED_ADMIN_EMAIL } from '#/domain/seed'
import {
  fixtureCreateUser,
  fixtureFindUserByEmail,
  fixtureInsertAttempt,
  fixtureListTodaysScoreboardRows,
  fixtureWriteDailyBest,
  resetFixtureStore,
} from './fixture-store'

describe('E2E fixture store', () => {
  beforeEach(() => {
    resetFixtureStore()
  })

  it('seeds the allowlisted admin', async () => {
    const admin = await fixtureFindUserByEmail(SEED_ADMIN_EMAIL)
    expect(admin?.isAdmin).toBe(true)
    expect(admin?.username).toBe('samir1')
  })

  it('creates users and records daily bests for the scoreboard', async () => {
    const user = await fixtureCreateUser({
      email: 'alex@example.com',
    })
    expect(user.username).toBe('alex')

    const attempt = await fixtureInsertAttempt({
      userId: user.id,
      durationSec: 15,
      wpm: 72,
      accuracy: 96,
    })
    await fixtureWriteDailyBest({
      userId: user.id,
      durationSec: 15,
      localDate: '2026-08-11',
      wpm: 72,
      accuracy: 96,
      attemptId: attempt.id,
    })

    const rows = await fixtureListTodaysScoreboardRows({
      durationSec: 15,
      localDate: '2026-08-11',
    })
    expect(rows).toEqual([
      expect.objectContaining({
        userId: user.id,
        username: 'alex',
        wpm: 72,
      }),
    ])
  })
})
