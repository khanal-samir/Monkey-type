import { describe, expect, it } from 'vitest'
import { scoreAttempt } from './scoring'
import {
  MAX_ELAPSED_SLACK_MS,
  scoreSubmittedRun,
  ScoreSubmittedRun,
} from './score-submitted-run'

function reconstructEvents(sentenceText: string, typed: string) {
  return Array.from(typed, (char, i) => ({
    correct: char === sentenceText[i],
  }))
}

describe('ScoreSubmittedRun.score', () => {
  it('scores a matching typed prefix the same as scoreAttempt on reconstructed events', () => {
    const sentenceText = 'hello world'
    const typed = 'hello'
    const startedAtMs = 1_000
    const endedAtMs = 6_000

    const scored = scoreSubmittedRun({
      sentenceText,
      typed,
      durationSec: 15,
      startedAtMs,
      endedAtMs,
    })

    const expected = scoreAttempt({
      durationSec: 15,
      events: reconstructEvents(sentenceText, typed),
      startedAtMs,
      endedAtMs,
    })

    expect(scored).toEqual(expected)
    // 5 correct in 5s → (5/5)/(5/60) = 12 WPM
    expect(scored.wpm).toBe(12)
    expect(scored.accuracy).toBe(100)
  })

  it('computes real accuracy from typed vs sentence, not a client correct flag', () => {
    const scored = ScoreSubmittedRun.score({
      sentenceText: 'hello',
      typed: 'hallo',
      durationSec: 15,
      startedAtMs: 0,
      endedAtMs: 15_000,
    })

    expect(scored.accuracy).toBe(80)
    expect(scored.wpm).toBeCloseTo(3.2, 5)
  })

  it('throws when computed WPM exceeds the impossible-speed cap', () => {
    const typed = 'a'.repeat(50)

    expect(() =>
      scoreSubmittedRun({
        sentenceText: typed,
        typed,
        durationSec: 15,
        startedAtMs: 0,
        endedAtMs: 10,
      }),
    ).toThrow(/wpm/i)
  })

  it('throws when typed is longer than the sentence', () => {
    expect(() =>
      scoreSubmittedRun({
        sentenceText: 'hi',
        typed: 'hiii',
        durationSec: 15,
        startedAtMs: 0,
        endedAtMs: 5_000,
      }),
    ).toThrow(/longer than sentence/i)
  })

  it('throws when elapsed exceeds the board duration plus slack', () => {
    expect(() =>
      scoreSubmittedRun({
        sentenceText: 'hello',
        typed: 'hel',
        durationSec: 15,
        startedAtMs: 0,
        endedAtMs: 20_000,
      }),
    ).toThrow()
    expect(20_000).toBeGreaterThan(15 * 1000 + MAX_ELAPSED_SLACK_MS)
  })

  it('allows an early finish before the board duration elapses', () => {
    expect(() =>
      scoreSubmittedRun({
        sentenceText: 'hello world',
        typed: 'hel',
        durationSec: 15,
        startedAtMs: 0,
        endedAtMs: 2_500,
      }),
    ).not.toThrow()
  })

  it('throws when timestamps are inverted or non-finite', () => {
    expect(() =>
      scoreSubmittedRun({
        sentenceText: 'hello',
        typed: 'hel',
        durationSec: 15,
        startedAtMs: 5_000,
        endedAtMs: 1_000,
      }),
    ).toThrow(/timestamp/i)

    expect(() =>
      scoreSubmittedRun({
        sentenceText: 'hello',
        typed: 'hel',
        durationSec: 15,
        startedAtMs: Number.NaN,
        endedAtMs: 1_000,
      }),
    ).toThrow(/timestamp/i)
  })

  it('throws when nothing was typed', () => {
    expect(() =>
      scoreSubmittedRun({
        sentenceText: 'hello world',
        typed: '',
        durationSec: 15,
        startedAtMs: 0,
        endedAtMs: 15_000,
      }),
    ).toThrow(/nothing was typed/i)
  })
})
