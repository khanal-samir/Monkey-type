/**
 * DailyBest — Kathmandu calendar day + improve-only WPM upsert rules.
 */

import { COMPANY_TIMEZONE } from './seed'
import type { DurationSec } from './typing-engine'

export type DailyBestKey = {
  userId: string
  durationSec: DurationSec
  localDate: string
}

export type DailyBestRecord = DailyBestKey & {
  wpm: number
  accuracy: number
  attemptId: string
}

export type DailyBestCandidate = {
  userId: string
  durationSec: DurationSec
  wpm: number
  accuracy: number
  attemptId: string
  /** Instant used to derive Asia/Kathmandu local_date. Defaults to now. */
  at?: Date
}

export type DailyBestDecision =
  | { action: 'insert'; localDate: string }
  | { action: 'update'; localDate: string }
  | { action: 'skip'; localDate: string; reason: 'not_improved' }

/** YYYY-MM-DD for the company timezone (Asia/Kathmandu by default). */
export function localDateInTimezone(
  at: Date,
  timeZone: string = COMPANY_TIMEZONE,
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
}

/** True when there is no existing best, or the candidate WPM is strictly higher. */
export function shouldImproveDailyBest(
  existing: { wpm: number } | null | undefined,
  candidateWpm: number,
): boolean {
  if (!existing) return true
  return candidateWpm > existing.wpm
}

/** Decide whether a completed attempt should write/update daily_bests. */
export function decideDailyBestUpdate(
  existing: { wpm: number } | null | undefined,
  candidate: DailyBestCandidate,
): DailyBestDecision {
  const localDate = localDateInTimezone(candidate.at ?? new Date())

  if (!existing) {
    return { action: 'insert', localDate }
  }

  if (shouldImproveDailyBest(existing, candidate.wpm)) {
    return { action: 'update', localDate }
  }

  return { action: 'skip', localDate, reason: 'not_improved' }
}

/** Deep-module facade: DailyBest */
export const DailyBest = {
  localDateInTimezone,
  shouldImproveDailyBest,
  decideDailyBestUpdate,
}
