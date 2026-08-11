/**
 * Scoring — Monkeytype-like WPM (correct chars / 5 / minutes) and accuracy.
 */

export type ScoreInput = {
  durationSec: number
  events: readonly { correct: boolean }[]
}

export type ScoreResult = {
  /** Net WPM from correct characters only. */
  wpm: number
  /** Correct keystrokes / all keystrokes * 100. Empty run → 100. */
  accuracy: number
}

export function scoreAttempt(input: ScoreInput): ScoreResult {
  const total = input.events.length
  const correct = input.events.filter((e) => e.correct).length

  const minutes = input.durationSec / 60
  const wpm = minutes > 0 ? correct / 5 / minutes : 0
  const accuracy = total === 0 ? 100 : (correct / total) * 100

  return { wpm, accuracy }
}

/** Deep-module facade: Scoring.scoreAttempt */
export const Scoring = { scoreAttempt }
