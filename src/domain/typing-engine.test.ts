import { describe, expect, it } from 'vitest'
import {
  createTypingEngine,
  type DurationSec,
  type TypingSentence,
} from './typing-engine'
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

  it('honors timerMs override without changing scored durationSec', () => {
    const engine = createTypingEngine({
      durationSec: 15,
      sentence,
      timerMs: 2_500,
      nowMs: () => 0,
    })

    expect(engine.getState().remainingMs).toBe(2_500)
    engine.inputChar('h', 0)
    engine.tick(2_500)
    const state = engine.getState()
    expect(state.status).toBe('completed')
    expect(state.result?.durationSec).toBe(15)
  })

  it('completes when the last character of the sentence is typed', () => {
    const short: TypingSentence = { id: 's3', text: 'hi' }
    const engine = createTypingEngine({
      durationSec: 60,
      sentence: short,
      nowMs: () => 0,
    })

    engine.inputChar('h', 0)
    expect(engine.getState().status).toBe('running')

    engine.inputChar('i', 1_200)
    const state = engine.getState()
    expect(state.status).toBe('completed')
    expect(state.result).not.toBeNull()
    expect(state.result?.durationSec).toBe(60)
    expect(state.result?.typed).toBe('hi')
    expect(state.result?.endedAtMs).toBe(1_200)
    expect(state.result?.startedAtMs).toBe(0)
  })

})
