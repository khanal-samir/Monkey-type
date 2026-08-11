/**
 * Persist a completed attempt and upsert daily_best only when WPM improves.
 */

import {
  decideDailyBestUpdate,
  type DailyBestKey,
  type DailyBestRecord,
} from './daily-best'
import type { DurationSec } from './typing-engine'

export type CompletedAttemptInput = {
  userId: string
  durationSec: DurationSec
  wpm: number
  accuracy: number
  at?: Date
}

export type AttemptInsert = {
  userId: string
  durationSec: DurationSec
  wpm: number
  accuracy: number
}

export type PersistAttemptDeps = {
  insertAttempt: (input: AttemptInsert) => Promise<{ id: string }>
  findDailyBest: (
    key: DailyBestKey,
  ) => Promise<{ wpm: number } | null>
  writeDailyBest: (record: DailyBestRecord) => Promise<void>
}

export type PersistAttemptResult = {
  attemptId: string
  dailyBestUpdated: boolean
  localDate: string
}

export async function persistCompletedAttempt(
  input: CompletedAttemptInput,
  deps: PersistAttemptDeps,
): Promise<PersistAttemptResult> {
  const attempt = await deps.insertAttempt({
    userId: input.userId,
    durationSec: input.durationSec,
    wpm: input.wpm,
    accuracy: input.accuracy,
  })

  const provisionalDate = decideDailyBestUpdate(null, {
    userId: input.userId,
    durationSec: input.durationSec,
    wpm: input.wpm,
    accuracy: input.accuracy,
    attemptId: attempt.id,
    at: input.at,
  }).localDate

  const key: DailyBestKey = {
    userId: input.userId,
    durationSec: input.durationSec,
    localDate: provisionalDate,
  }

  const existing = await deps.findDailyBest(key)
  const decision = decideDailyBestUpdate(existing, {
    userId: input.userId,
    durationSec: input.durationSec,
    wpm: input.wpm,
    accuracy: input.accuracy,
    attemptId: attempt.id,
    at: input.at,
  })

  if (decision.action === 'skip') {
    return {
      attemptId: attempt.id,
      dailyBestUpdated: false,
      localDate: decision.localDate,
    }
  }

  await deps.writeDailyBest({
    userId: input.userId,
    durationSec: input.durationSec,
    localDate: decision.localDate,
    wpm: input.wpm,
    accuracy: input.accuracy,
    attemptId: attempt.id,
  })

  return {
    attemptId: attempt.id,
    dailyBestUpdated: true,
    localDate: decision.localDate,
  }
}
