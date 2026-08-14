import { createServerFn } from '@tanstack/react-start'
import { requireExistingUser } from '#/domain/access'
import { localDateInTimezone } from '#/domain/daily-best'
import { rankScoreboard, type ScoreboardEntry } from '#/domain/leaderboard'
import {
  parseSubmitAttemptPayload,
  submitTypedAttempt,
} from '#/domain/submit-typed-attempt'
import type { DurationSec } from '#/domain/typing-engine'
import { TYPING_DURATIONS } from '#/domain/typing-engine'
import {
  findDailyBest,
  insertAttempt,
  listTodaysScoreboardRows,
  writeDailyBest,
} from '#/lib/rankings/repo'
import { findSentenceById } from '#/lib/sentences/repo'
import {
  assertSupabaseConfigured,
  findUserById,
  isDataBackendReady,
} from '#/lib/users/repo'

function accessDeps() {
  return { findUserById }
}

const LEADERBOARD_TOP_N = 5

function isDurationSec(value: number): value is DurationSec {
  return (TYPING_DURATIONS as readonly number[]).includes(value)
}

function emptyLeaderboards(): Record<DurationSec, ScoreboardEntry[]> {
  return { 15: [], 30: [], 60: [] }
}

export const submitAttempt = createServerFn({ method: 'POST' })
  .validator(parseSubmitAttemptPayload)
  .handler(async ({ data }) => {
    assertSupabaseConfigured()
    return submitTypedAttempt(data, {
      findUserById,
      findSentenceById,
      insertAttempt,
      findDailyBest,
      writeDailyBest,
    })
  })

export const getTodaysScoreboard = createServerFn({ method: 'POST' })
  .validator((data: { userId: string; durationSec: number }) => data)
  .handler(async ({ data }) => {
    if (!isDataBackendReady()) {
      return { entries: [], localDate: localDateInTimezone(new Date()) }
    }

    assertSupabaseConfigured()
    await requireExistingUser(data.userId, accessDeps())

    if (!isDurationSec(data.durationSec)) {
      throw new Error('Invalid duration. Use 15, 30, or 60 seconds.')
    }

    const localDate = localDateInTimezone(new Date())
    const rows = await listTodaysScoreboardRows({
      durationSec: data.durationSec,
      localDate,
    })

    return {
      localDate,
      entries: rankScoreboard(rows),
    }
  })

export const getTodaysLeaderboards = createServerFn({ method: 'POST' })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const localDate = localDateInTimezone(new Date())

    if (!isDataBackendReady()) {
      return { localDate, boards: emptyLeaderboards() }
    }

    assertSupabaseConfigured()
    await requireExistingUser(data.userId, accessDeps())

    const boards = emptyLeaderboards()

    await Promise.all(
      TYPING_DURATIONS.map(async (durationSec) => {
        const rows = await listTodaysScoreboardRows({
          durationSec,
          localDate,
        })
        boards[durationSec] = rankScoreboard(rows).slice(0, LEADERBOARD_TOP_N)
      }),
    )

    return { localDate, boards }
  })
