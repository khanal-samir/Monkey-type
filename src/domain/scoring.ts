/**
 * Scoring — Monkeytype-like WPM (correct chars / 5 / minutes) and accuracy.
 * WPM uses actual elapsed time when available (early finish); durationSec is
 * the board mode (15/30/60) persisted separately for leaderboards.
 */

export type ScoreInput = {
  /** Board mode duration — used for WPM only when no elapsed timing is given. */
  durationSec: number
  events: readonly { correct: boolean }[]
  /** Preferred: wall-clock ms of the run (live or completed). */
  elapsedMs?: number
  /** Completed attempt timestamps — used when elapsedMs is omitted. */
  startedAtMs?: number
  endedAtMs?: number
}

export type ScoreResult = {
  /** Net WPM from correct characters only. */
  wpm: number
  /** Correct keystrokes / all keystrokes * 100. Empty run → 100. */
  accuracy: number
}

function resolveElapsedMs(input: ScoreInput): number {
  if (input.elapsedMs !== undefined) {
    return Math.max(0, input.elapsedMs)
  }
  if (input.startedAtMs !== undefined && input.endedAtMs !== undefined) {
    return Math.max(0, input.endedAtMs - input.startedAtMs)
  }
  return Math.max(0, input.durationSec * 1000)
}

export function scoreAttempt(input: ScoreInput): ScoreResult {
  const total = input.events.length
  const correct = input.events.filter((e) => e.correct).length

  const elapsedMs = resolveElapsedMs(input)
  const minutes = elapsedMs / 60_000
  const wpm = minutes > 0 ? correct / 5 / minutes : 0
  const accuracy = total === 0 ? 100 : (correct / total) * 100

  return { wpm, accuracy }
}

/** Deep-module facade: Scoring.scoreAttempt */
export const Scoring = { scoreAttempt }
