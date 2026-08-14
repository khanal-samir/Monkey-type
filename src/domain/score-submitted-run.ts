/**
 * Server-side scoring for a submitted typing run.
 * Rebuilds correctness from typed vs sentence text — never trusts client WPM.
 */

import { scoreAttempt, type ScoreResult } from './scoring'

/** Extra ms allowed past durationSec (timer tick / clock slack). */
export const MAX_ELAPSED_SLACK_MS = 3_000

/** Hard ceiling so a full passage with a tiny elapsed cannot land on the board. */
export const MAX_WPM = 300

export type SubmittedRunInput = {
  sentenceText: string
  typed: string
  durationSec: number
  startedAtMs: number
  endedAtMs: number
}

function reconstructEvents(sentenceText: string, typed: string) {
  const events: { correct: boolean }[] = []
  for (let i = 0; i < typed.length; i++) {
    events.push({ correct: typed[i] === sentenceText[i] })
  }
  return events
}

export function scoreSubmittedRun(input: SubmittedRunInput): ScoreResult {
  if (input.typed.length === 0) {
    throw new Error('Nothing was typed.')
  }

  if (input.typed.length > input.sentenceText.length) {
    throw new Error('Typed text is longer than sentence.')
  }

  const { startedAtMs, endedAtMs, durationSec } = input
  if (
    !Number.isFinite(startedAtMs) ||
    !Number.isFinite(endedAtMs) ||
    !Number.isFinite(durationSec)
  ) {
    throw new Error('Invalid run timestamps.')
  }

  const elapsedMs = endedAtMs - startedAtMs
  if (elapsedMs <= 0) {
    throw new Error('Invalid run timestamps.')
  }

  const maxElapsedMs = durationSec * 1000 + MAX_ELAPSED_SLACK_MS
  if (elapsedMs > maxElapsedMs) {
    throw new Error('Run elapsed time is too long for the selected duration.')
  }

  const scored = scoreAttempt({
    durationSec,
    events: reconstructEvents(input.sentenceText, input.typed),
    startedAtMs,
    endedAtMs,
  })

  if (scored.wpm > MAX_WPM) {
    throw new Error('WPM exceeds the maximum allowed.')
  }

  return scored
}

/** Deep-module facade: ScoreSubmittedRun.score */
export const ScoreSubmittedRun = { score: scoreSubmittedRun }
