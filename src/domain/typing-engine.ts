/**
 * TypingEngine — timed sentence runs; restart discards; timer completion emits result.
 */

export type DurationSec = 15 | 30 | 60

export const TYPING_DURATIONS: readonly DurationSec[] = [15, 30, 60]

export type TypingSentence = {
  id: string
  text: string
}

export type KeyEvent = {
  char: string
  expected: string
  correct: boolean
  /** Milliseconds since run start (first key). */
  atMs: number
}

export type CompletedAttempt = {
  completed: true
  sentenceId: string
  sentenceText: string
  durationSec: DurationSec
  typed: string
  events: KeyEvent[]
  startedAtMs: number
  endedAtMs: number
}

export type TypingStatus = 'idle' | 'running' | 'completed'

export type TypingEngineState = {
  status: TypingStatus
  durationSec: DurationSec
  sentenceId: string
  sentenceText: string
  caretIndex: number
  typed: string
  events: KeyEvent[]
  remainingMs: number
  result: CompletedAttempt | null
}

export type TypingEngineOptions = {
  durationSec: DurationSec
  sentence: TypingSentence
  nowMs?: () => number
}

export type TypingEngine = {
  getState: () => TypingEngineState
  inputChar: (char: string, atMs?: number) => void
  backspace: () => void
  tick: (nowMs?: number) => void
  restart: (sentence: TypingSentence) => void
  setDuration: (durationSec: DurationSec) => void
}

function buildIdleState(
  durationSec: DurationSec,
  sentence: TypingSentence,
): TypingEngineState {
  return {
    status: 'idle',
    durationSec,
    sentenceId: sentence.id,
    sentenceText: sentence.text,
    caretIndex: 0,
    typed: '',
    events: [],
    remainingMs: durationSec * 1000,
    result: null,
  }
}

export function createTypingEngine(options: TypingEngineOptions): TypingEngine {
  const nowMs = options.nowMs ?? (() => Date.now())
  let state = buildIdleState(options.durationSec, options.sentence)
  let startedAtMs: number | null = null

  function snapshot(): TypingEngineState {
    return {
      ...state,
      events: [...state.events],
      result: state.result
        ? { ...state.result, events: [...state.result.events] }
        : null,
    }
  }

  function complete(endedAtMs: number) {
    if (state.status !== 'running' || startedAtMs === null) return

    const result: CompletedAttempt = {
      completed: true,
      sentenceId: state.sentenceId,
      sentenceText: state.sentenceText,
      durationSec: state.durationSec,
      typed: state.typed,
      events: [...state.events],
      startedAtMs,
      endedAtMs,
    }

    state = {
      ...state,
      status: 'completed',
      remainingMs: 0,
      result,
    }
  }

  return {
    getState: snapshot,

    inputChar(char: string, atMs?: number) {
      if (state.status === 'completed') return
      if (char.length !== 1) return

      const now = atMs ?? nowMs()
      const text = state.sentenceText

      if (state.caretIndex >= text.length) return

      if (state.status === 'idle') {
        startedAtMs = now
        state = { ...state, status: 'running' }
      }

      const expected = text[state.caretIndex] ?? ''
      const correct = char === expected
      const relativeMs = startedAtMs === null ? 0 : Math.max(0, now - startedAtMs)

      const event: KeyEvent = {
        char,
        expected,
        correct,
        atMs: relativeMs,
      }

      state = {
        ...state,
        caretIndex: state.caretIndex + 1,
        typed: state.typed + char,
        events: [...state.events, event],
      }
    },

    backspace() {
      if (state.status === 'completed') return
      if (state.caretIndex === 0) return

      state = {
        ...state,
        caretIndex: state.caretIndex - 1,
        typed: state.typed.slice(0, -1),
        events: state.events.slice(0, -1),
      }
    },

    tick(explicitNow?: number) {
      if (state.status !== 'running' || startedAtMs === null) return

      const now = explicitNow ?? nowMs()
      const elapsed = Math.max(0, now - startedAtMs)
      const totalMs = state.durationSec * 1000
      const remainingMs = Math.max(0, totalMs - elapsed)

      if (remainingMs === 0) {
        complete(startedAtMs + totalMs)
        return
      }

      state = { ...state, remainingMs }
    },

    restart(sentence: TypingSentence) {
      startedAtMs = null
      state = buildIdleState(state.durationSec, sentence)
    },

    setDuration(durationSec: DurationSec) {
      if (state.status === 'running') return
      startedAtMs = null
      state = buildIdleState(durationSec, {
        id: state.sentenceId,
        text: state.sentenceText,
      })
    },
  }
}

/** Deep-module facade */
export const TypingEngine = { create: createTypingEngine }
