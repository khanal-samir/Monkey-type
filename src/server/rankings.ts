import { createServerFn } from '@tanstack/react-start'
import { requireExistingUser } from '#/domain/access'
import { localDateInTimezone } from '#/domain/daily-best'
import { rankScoreboard } from '#/domain/leaderboard'
import { persistCompletedAttempt } from '#/domain/persist-attempt'
import type { DurationSec } from '#/domain/typing-engine'
import { TYPING_DURATIONS } from '#/domain/typing-engine'
import { isSupabaseConfigured } from '#/lib/supabase/client'
import {
  findDailyBest,
  insertAttempt,
  listTodaysScoreboardRows,
  writeDailyBest,
} from '#/lib/rankings/repo'
import { assertSupabaseConfigured, findUserById } from '#/lib/users/repo'

function accessDeps() {
  return { findUserById }
}

function isDurationSec(value: number): value is DurationSec {
  return (TYPING_DURATIONS as readonly number[]).includes(value)
}

export const submitAttempt = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      userId: string
      durationSec: number
      wpm: number
      accuracy: number
    }) => data,
  )
  .handler(async ({ data }) => {
    assertSupabaseConfigured()
    await requireExistingUser(data.userId, accessDeps())

    if (!isDurationSec(data.durationSec)) {
      throw new Error('Invalid duration. Use 15, 30, or 60 seconds.')
    }
    if (!Number.isFinite(data.wpm) || data.wpm < 0) {
      throw new Error('Invalid WPM.')
    }
    if (
      !Number.isFinite(data.accuracy) ||
      data.accuracy < 0 ||
      data.accuracy > 100
    ) {
      throw new Error('Invalid accuracy.')
    }

    const result = await persistCompletedAttempt(
      {
        userId: data.userId,
        durationSec: data.durationSec,
        wpm: data.wpm,
        accuracy: data.accuracy,
      },
      { insertAttempt, findDailyBest, writeDailyBest },
    )

    return result
  })

export const getTodaysScoreboard = createServerFn({ method: 'POST' })
  .validator((data: { userId: string; durationSec: number }) => data)
  .handler(async ({ data }) => {
    if (!isSupabaseConfigured()) {
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
