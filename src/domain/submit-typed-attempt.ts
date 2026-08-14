/**
 * Persist a typing run after scoring it on the server.
 * Client-sent WPM/accuracy is rejected; score comes from typed vs sentence text.
 */

import { requireExistingUser, type FindUserById } from './access'
import { persistCompletedAttempt, type PersistAttemptDeps } from './persist-attempt'
import { scoreSubmittedRun } from './score-submitted-run'
import { TYPING_DURATIONS, type DurationSec } from './typing-engine'

export type SubmitTypedAttemptInput = {
  userId: string
  durationSec: DurationSec
  sentenceId: string
  typed: string
  startedAtMs: number
  endedAtMs: number
}

export type SubmitTypedAttemptDeps = PersistAttemptDeps & {
  findUserById: FindUserById
  findSentenceById: (
    id: string,
  ) => Promise<{ id: string; text: string } | null>
}

function isDurationSec(value: number): value is DurationSec {
  return (TYPING_DURATIONS as readonly number[]).includes(value)
}

/** Runtime parse for the submitAttempt RPC — rejects console WPM payloads. */
export function parseSubmitAttemptPayload(data: unknown): SubmitTypedAttemptInput {
  if (data === null || typeof data !== 'object') {
    throw new Error('Invalid attempt payload.')
  }

  const d = data as Record<string, unknown>
  if ('wpm' in d || 'accuracy' in d) {
    throw new Error('Client-sent WPM is not accepted.')
  }

  if (typeof d.userId !== 'string' || !d.userId.trim()) {
    throw new Error('Invalid attempt payload.')
  }
  if (typeof d.durationSec !== 'number' || !isDurationSec(d.durationSec)) {
    throw new Error('Invalid duration. Use 15, 30, or 60 seconds.')
  }
  if (typeof d.sentenceId !== 'string' || !d.sentenceId.trim()) {
    throw new Error('Invalid attempt payload.')
  }
  if (typeof d.typed !== 'string' || d.typed.length === 0) {
    throw new Error('Nothing was typed.')
  }
  if (!Number.isFinite(d.startedAtMs) || !Number.isFinite(d.endedAtMs)) {
    throw new Error('Invalid attempt payload.')
  }

  return {
    userId: d.userId,
    durationSec: d.durationSec,
    sentenceId: d.sentenceId,
    typed: d.typed,
    startedAtMs: d.startedAtMs,
    endedAtMs: d.endedAtMs,
  }
}

export async function submitTypedAttempt(
  input: SubmitTypedAttemptInput,
  deps: SubmitTypedAttemptDeps,
) {
  await requireExistingUser(input.userId, { findUserById: deps.findUserById })

  const sentence = await deps.findSentenceById(input.sentenceId)
  if (!sentence) {
    throw new Error('Sentence not found.')
  }

  const score = scoreSubmittedRun({
    sentenceText: sentence.text,
    typed: input.typed,
    durationSec: input.durationSec,
    startedAtMs: input.startedAtMs,
    endedAtMs: input.endedAtMs,
  })

  return persistCompletedAttempt(
    {
      userId: input.userId,
      durationSec: input.durationSec,
      wpm: score.wpm,
      accuracy: score.accuracy,
    },
    {
      insertAttempt: deps.insertAttempt,
      findDailyBest: deps.findDailyBest,
      writeDailyBest: deps.writeDailyBest,
    },
  )
}
