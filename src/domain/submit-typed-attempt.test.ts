import { beforeEach, describe, expect, it } from 'vitest'
import { localDateInTimezone } from './daily-best'
import {
  parseSubmitAttemptPayload,
  submitTypedAttempt,
} from './submit-typed-attempt'
import {
  FIXTURE_ADMIN_ID,
  FIXTURE_SENTENCE_ID,
  fixtureFindDailyBest,
  fixtureFindSentenceById,
  fixtureFindUserById,
  fixtureInsertAttempt,
  fixtureListTodaysScoreboardRows,
  fixtureWriteDailyBest,
  resetFixtureStore,
} from '#/lib/e2e/fixture-store'

const FIXTURE_PASSAGE =
  'type fast now. keep going steady. finish strong here.'

function deps() {
  return {
    findUserById: fixtureFindUserById,
    findSentenceById: fixtureFindSentenceById,
    insertAttempt: fixtureInsertAttempt,
    findDailyBest: fixtureFindDailyBest,
    writeDailyBest: fixtureWriteDailyBest,
  }
}

describe('parseSubmitAttemptPayload', () => {
  it('rejects a console payload that passes WPM instead of the typed run', () => {
    expect(() =>
      parseSubmitAttemptPayload({
        userId: FIXTURE_ADMIN_ID,
        durationSec: 15,
        wpm: 999,
        accuracy: 100,
      }),
    ).toThrow(/client-sent wpm/i)
  })

  it('rejects a crawl payload that omits sentenceId and typed text', () => {
    expect(() =>
      parseSubmitAttemptPayload({
        userId: FIXTURE_ADMIN_ID,
        durationSec: 15,
        startedAtMs: 0,
        endedAtMs: 15_000,
      }),
    ).toThrow(/invalid attempt payload|nothing was typed/i)
  })

  it('rejects an empty typed string', () => {
    expect(() =>
      parseSubmitAttemptPayload({
        userId: FIXTURE_ADMIN_ID,
        durationSec: 15,
        sentenceId: FIXTURE_SENTENCE_ID,
        typed: '',
        startedAtMs: 0,
        endedAtMs: 15_000,
      }),
    ).toThrow(/nothing was typed/i)
  })
})

describe('submitTypedAttempt', () => {
  beforeEach(() => {
    resetFixtureStore()
  })

  it('does not persist when the sentence id is unknown', async () => {
    await expect(
      submitTypedAttempt(
        {
          userId: FIXTURE_ADMIN_ID,
          durationSec: 15,
          sentenceId: 'missing-sentence',
          typed: 'type',
          startedAtMs: 0,
          endedAtMs: 2_500,
        },
        deps(),
      ),
    ).rejects.toThrow(/sentence not found/i)

    const rows = await fixtureListTodaysScoreboardRows({
      durationSec: 15,
      localDate: localDateInTimezone(new Date()),
    })
    expect(rows).toEqual([])
  })

  it('does not persist when nothing was typed', async () => {
    await expect(
      submitTypedAttempt(
        {
          userId: FIXTURE_ADMIN_ID,
          durationSec: 15,
          sentenceId: FIXTURE_SENTENCE_ID,
          typed: '',
          startedAtMs: 0,
          endedAtMs: 2_500,
        },
        deps(),
      ),
    ).rejects.toThrow(/nothing was typed/i)

    const rows = await fixtureListTodaysScoreboardRows({
      durationSec: 15,
      localDate: localDateInTimezone(new Date()),
    })
    expect(rows).toEqual([])
  })

  it('does not persist an instant crawl of the full passage', async () => {
    await expect(
      submitTypedAttempt(
        {
          userId: FIXTURE_ADMIN_ID,
          durationSec: 15,
          sentenceId: FIXTURE_SENTENCE_ID,
          typed: FIXTURE_PASSAGE,
          startedAtMs: 0,
          endedAtMs: 10,
        },
        deps(),
      ),
    ).rejects.toThrow(/wpm/i)

    const rows = await fixtureListTodaysScoreboardRows({
      durationSec: 15,
      localDate: localDateInTimezone(new Date()),
    })
    expect(rows).toEqual([])
  })

  it('persists a scored prefix and ignores any desire to self-report WPM', async () => {
    const result = await submitTypedAttempt(
      {
        userId: FIXTURE_ADMIN_ID,
        durationSec: 15,
        sentenceId: FIXTURE_SENTENCE_ID,
        typed: 'type',
        startedAtMs: 0,
        endedAtMs: 2_500,
      },
      deps(),
    )

    expect(result.dailyBestUpdated).toBe(true)
    const rows = await fixtureListTodaysScoreboardRows({
      durationSec: 15,
      localDate: result.localDate,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.userId).toBe(FIXTURE_ADMIN_ID)
    // 4 correct chars in 2.5s → (4/5)/(2.5/60) = 19.2 WPM, not a fake 999.
    expect(rows[0]?.wpm).toBeCloseTo(19.2, 5)
    expect(rows[0]?.wpm).toBeLessThan(50)
  })
})
