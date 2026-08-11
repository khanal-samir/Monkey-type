import { describe, expect, it } from 'vitest'
import {
  createTypingEngine,
  type DurationSec,
  type TypingSentence,
} from './typing-engine'
import { scoreAttempt } from './scoring'

const sentence: TypingSentence = {
  id: 's1',
  text: 'hello world',
}

describe('TypingEngine', () => {
  it('starts the timer on the first printable key and completes when time elapses', () => {
    const engine = createTypingEngine({
      durationSec: 15 as DurationSec,
      sentence,
      nowMs: () => 1_000,
    })

    expect(engine.getState().status).toBe('idle')

    engine.inputChar('h', 1_000)
    expect(engine.getState().status).toBe('running')
    expect(engine.getState().caretIndex).toBe(1)

    engine.tick(1_000 + 15_000)
    const state = engine.getState()
    expect(state.status).toBe('completed')
    expect(state.result).not.toBeNull()
    expect(state.result?.completed).toBe(true)
    expect(state.result?.durationSec).toBe(15)
    expect(state.result?.sentenceId).toBe('s1')
    expect(state.result?.events.length).toBeGreaterThan(0)
  })

  it('restart discards an incomplete run and does not emit a completed result', () => {
    let now = 0
    const engine = createTypingEngine({
      durationSec: 30,
      sentence,
      nowMs: () => now,
    })

    engine.inputChar('h', 0)
    now = 500
    engine.inputChar('e', 500)

    const next: TypingSentence = { id: 's2', text: 'fresh start' }
    engine.restart(next)

    const state = engine.getState()
    expect(state.status).toBe('idle')
    expect(state.result).toBeNull()
    expect(state.sentenceId).toBe('s2')
    expect(state.sentenceText).toBe('fresh start')
    expect(state.caretIndex).toBe(0)
    expect(state.events).toEqual([])
  })

  it('records correct and incorrect key events against the target sentence', () => {
    const engine = createTypingEngine({
      durationSec: 60,
      sentence,
      nowMs: () => 0,
    })

    engine.inputChar('h', 0)
    engine.inputChar('x', 10)

    const { events, caretIndex } = engine.getState()
    expect(events).toEqual([
      { char: 'h', expected: 'h', correct: true, atMs: 0 },
      { char: 'x', expected: 'e', correct: false, atMs: 10 },
    ])
    expect(caretIndex).toBe(2)
  })
})

describe('Scoring.scoreAttempt', () => {
  it('computes Monkeytype-like WPM and accuracy from typed events', () => {
    // 10 correct chars in 15s → (10/5)/0.25 = 8 WPM; 10/12 accuracy
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

  it('returns zero WPM and 100% accuracy when nothing was typed', () => {
    const scored = scoreAttempt({ durationSec: 30, events: [] })
    expect(scored.wpm).toBe(0)
    expect(scored.accuracy).toBe(100)
  })
})
