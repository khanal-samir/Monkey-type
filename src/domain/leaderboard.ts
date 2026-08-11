/**
 * Leaderboard — today's finishers ranked by WPM for a duration.
 */

export type ScoreboardEntry = {
  userId: string
  username: string
  avatarUrl: string | null
  wpm: number
  accuracy: number
  rank: number
}

export type ScoreboardRowInput = {
  userId: string
  username: string
  avatarUrl: string | null
  wpm: number
  accuracy: number
}

/** Rank rows by WPM descending; ties keep stable input order. */
export function rankScoreboard(
  rows: readonly ScoreboardRowInput[],
): ScoreboardEntry[] {
  const sorted = [...rows].sort((a, b) => b.wpm - a.wpm)
  return sorted.map((row, index) => ({
    ...row,
    rank: index + 1,
  }))
}

export const Leaderboard = { rankScoreboard }
