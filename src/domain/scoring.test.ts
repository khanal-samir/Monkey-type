import { describe, expect, it } from 'vitest'
import { scoreAttempt, Scoring } from './scoring'

describe('Scoring.scoreAttempt', () => {
  it('ranks primarily by Monkeytype-like WPM from correct characters', () => {
    // 10 correct chars in 15s → (10/5)/0.25 = 8 WPM
    const scored = scoreAttempt({
      durationSec: 15,
      events: [
        ...Array.from({ length: 10 }, () => ({ correct: true as const })),
        { correct: false },
        { correct: false },
      ],
    })

    expect(scored.wpm).toBe(8)
    expect(scored.accuracy).toBeCloseTo((10 / 12) * 100, 5)
  })

  it('shows accuracy as a secondary metric (correct / total keystrokes)', () => {
    const scored = Scoring.scoreAttempt({
      durationSec: 60,
      events: [
        { correct: true },
        { correct: true },
        { correct: false },
        { correct: true },
      ],
    })

    // 3 correct in 60s → (3/5)/1 = 0.6 WPM; accuracy 75%
    expect(scored.wpm).toBeCloseTo(0.6, 5)
    expect(scored.accuracy).toBe(75)
  })

  it('returns zero WPM and 100% accuracy when nothing was typed', () => {
    const scored = scoreAttempt({ durationSec: 30, events: [] })
    expect(scored.wpm).toBe(0)
    expect(scored.accuracy).toBe(100)
  })

  it('uses actual elapsed time for WPM when finishing early', () => {
    // 10 correct chars in 5s (early finish on a 60s board) → (10/5)/(5/60) = 24 WPM
    const scored = scoreAttempt({
      durationSec: 60,
      events: Array.from({ length: 10 }, () => ({ correct: true as const })),
      startedAtMs: 1_000,
      endedAtMs: 6_000,
    })

    expect(scored.wpm).toBe(24)
    expect(scored.accuracy).toBe(100)
  })

  it('uses elapsedMs override when provided', () => {
    // 5 correct in 2.5s → (5/5)/(2.5/60) = 24 WPM
    const scored = scoreAttempt({
      durationSec: 15,
      events: Array.from({ length: 5 }, () => ({ correct: true as const })),
      elapsedMs: 2_500,
    })

    expect(scored.wpm).toBe(24)
  })
})
