import { describe, expect, it } from 'vitest'
import {
  DailyBest,
  decideDailyBestUpdate,
  localDateInTimezone,
  shouldImproveDailyBest,
} from './daily-best'
import { COMPANY_TIMEZONE } from './seed'

describe('DailyBest.localDateInTimezone', () => {
  it('uses Asia/Kathmandu as the company day boundary', () => {
    expect(COMPANY_TIMEZONE).toBe('Asia/Kathmandu')
    // 2026-08-11 12:00 UTC → still Aug 11 in Kathmandu (UTC+5:45)
    const noonUtc = new Date('2026-08-11T12:00:00.000Z')
    expect(localDateInTimezone(noonUtc)).toBe('2026-08-11')
  })

  it('rolls to the next Kathmandu calendar day at local midnight', () => {
    // Midnight Aug 12 Kathmandu = 2026-08-11T18:15:00.000Z
    const justBefore = new Date('2026-08-11T18:14:59.999Z')
    const justAfter = new Date('2026-08-11T18:15:00.000Z')

    expect(localDateInTimezone(justBefore, COMPANY_TIMEZONE)).toBe(
      '2026-08-11',
    )
    expect(DailyBest.localDateInTimezone(justAfter)).toBe('2026-08-12')
  })
})

describe('DailyBest.shouldImproveDailyBest', () => {
  it('treats a first run of the day as an improvement', () => {
    expect(shouldImproveDailyBest(null, 42)).toBe(true)
    expect(shouldImproveDailyBest(undefined, 1)).toBe(true)
  })

  it('updates only when the new WPM strictly beats the existing best', () => {
    expect(shouldImproveDailyBest({ wpm: 40 }, 41)).toBe(true)
    expect(shouldImproveDailyBest({ wpm: 40 }, 40)).toBe(false)
    expect(shouldImproveDailyBest({ wpm: 40 }, 39.9)).toBe(false)
  })
})

describe('DailyBest.decideDailyBestUpdate', () => {
  const base = {
    userId: 'u1',
    durationSec: 30 as const,
    accuracy: 98,
    attemptId: 'a-new',
    at: new Date('2026-08-11T12:00:00.000Z'),
  }

  it('inserts when no daily best exists for the Kathmandu date', () => {
    const decision = decideDailyBestUpdate(null, { ...base, wpm: 55 })
    expect(decision).toEqual({ action: 'insert', localDate: '2026-08-11' })
  })

  it('updates when WPM improves for the same user/duration/day', () => {
    const decision = decideDailyBestUpdate(
      { wpm: 50 },
      { ...base, wpm: 55 },
    )
    expect(decision).toEqual({ action: 'update', localDate: '2026-08-11' })
  })

  it('skips board churn when a worse or equal run is recorded', () => {
    expect(
      decideDailyBestUpdate({ wpm: 60 }, { ...base, wpm: 59 }),
    ).toEqual({
      action: 'skip',
      localDate: '2026-08-11',
      reason: 'not_improved',
    })

    expect(
      decideDailyBestUpdate({ wpm: 60 }, { ...base, wpm: 60 }),
    ).toEqual({
      action: 'skip',
      localDate: '2026-08-11',
      reason: 'not_improved',
    })
  })

  it('keys the decision to the Kathmandu date of the attempt instant', () => {
    // Just after Kathmandu midnight → next local date
    const decision = decideDailyBestUpdate(null, {
      ...base,
      wpm: 70,
      at: new Date('2026-08-11T18:15:00.000Z'),
    })
    expect(decision).toEqual({ action: 'insert', localDate: '2026-08-12' })
  })
})
