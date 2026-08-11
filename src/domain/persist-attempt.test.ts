import { describe, expect, it, vi } from 'vitest'
import { persistCompletedAttempt } from './persist-attempt'

describe('persistCompletedAttempt', () => {
  const input = {
    userId: 'u1',
    durationSec: 30 as const,
    wpm: 72,
    accuracy: 96.5,
    at: new Date('2026-08-11T12:00:00.000Z'),
  }

  it('always inserts the attempt, even when the daily best is not improved', async () => {
    const insertAttempt = vi.fn(async () => ({ id: 'a1' }))
    const findDailyBest = vi.fn(async () => ({ wpm: 80 }))
    const writeDailyBest = vi.fn(async () => {})

    const result = await persistCompletedAttempt(input, {
      insertAttempt,
      findDailyBest,
      writeDailyBest,
    })

    expect(insertAttempt).toHaveBeenCalledWith({
      userId: 'u1',
      durationSec: 30,
      wpm: 72,
      accuracy: 96.5,
    })
    expect(writeDailyBest).not.toHaveBeenCalled()
    expect(result).toEqual({
      attemptId: 'a1',
      dailyBestUpdated: false,
      localDate: '2026-08-11',
    })
  })

  it('upserts daily_best when WPM improves (or is the first run)', async () => {
    const insertAttempt = vi.fn(async () => ({ id: 'a2' }))
    const findDailyBest = vi.fn(async () => ({ wpm: 60 }))
    const writeDailyBest = vi.fn(async () => {})

    const result = await persistCompletedAttempt(
      { ...input, wpm: 72 },
      { insertAttempt, findDailyBest, writeDailyBest },
    )

    expect(writeDailyBest).toHaveBeenCalledWith({
      userId: 'u1',
      durationSec: 30,
      localDate: '2026-08-11',
      wpm: 72,
      accuracy: 96.5,
      attemptId: 'a2',
    })
    expect(result.dailyBestUpdated).toBe(true)
  })
})
