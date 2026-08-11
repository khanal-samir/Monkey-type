import type { Database } from '#/lib/supabase/database.types'
import type { DailyBestRecord } from '#/domain/daily-best'
import type { AttemptInsert } from '#/domain/persist-attempt'
import type { ScoreboardRowInput } from '#/domain/leaderboard'
import type { DurationSec } from '#/domain/typing-engine'
import { createSupabaseClient } from '#/lib/supabase/client'
import { assertSupabaseConfigured } from '#/lib/users/repo'

type AttemptRow = Database['public']['Tables']['attempts']['Row']
type DailyBestRow = Database['public']['Tables']['daily_bests']['Row']

export async function insertAttempt(
  input: AttemptInsert,
): Promise<{ id: string }> {
  assertSupabaseConfigured()
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('attempts')
    .insert({
      user_id: input.userId,
      duration_sec: input.durationSec,
      wpm: round2(input.wpm),
      accuracy: round2(input.accuracy),
    })
    .select('id')
    .single()

  if (error) throw error
  return { id: data.id }
}

export async function findDailyBest(key: {
  userId: string
  durationSec: DurationSec
  localDate: string
}): Promise<{ wpm: number } | null> {
  assertSupabaseConfigured()
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('daily_bests')
    .select('wpm')
    .eq('user_id', key.userId)
    .eq('duration_sec', key.durationSec)
    .eq('local_date', key.localDate)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return { wpm: Number(data.wpm) }
}

export async function writeDailyBest(record: DailyBestRecord): Promise<void> {
  assertSupabaseConfigured()
  const supabase = createSupabaseClient()
  const { error } = await supabase.from('daily_bests').upsert(
    {
      user_id: record.userId,
      duration_sec: record.durationSec,
      local_date: record.localDate,
      wpm: round2(record.wpm),
      accuracy: round2(record.accuracy),
      attempt_id: record.attemptId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,duration_sec,local_date' },
  )

  if (error) throw error
}

export async function listTodaysScoreboardRows(input: {
  durationSec: DurationSec
  localDate: string
}): Promise<ScoreboardRowInput[]> {
  assertSupabaseConfigured()
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('daily_bests')
    .select(
      `
      user_id,
      wpm,
      accuracy,
      users (
        username,
        avatar_url
      )
    `,
    )
    .eq('local_date', input.localDate)
    .eq('duration_sec', input.durationSec)
    .order('wpm', { ascending: false })

  if (error) throw error

  type Joined = Pick<DailyBestRow, 'user_id' | 'wpm' | 'accuracy'> & {
    users:
      | { username: string; avatar_url: string | null }
      | { username: string; avatar_url: string | null }[]
      | null
  }

  return ((data ?? []) as Joined[]).flatMap((row) => {
    const user = Array.isArray(row.users) ? row.users[0] : row.users
    if (!user) return []
    return [
      {
        userId: row.user_id,
        username: user.username,
        avatarUrl: user.avatar_url,
        wpm: Number(row.wpm),
        accuracy: Number(row.accuracy),
      },
    ]
  })
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export type { AttemptRow, DailyBestRow }
