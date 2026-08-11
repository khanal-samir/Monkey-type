import { describe, expect, it } from 'vitest'
import { findUserDailyStanding, rankScoreboard } from './leaderboard'

describe('Leaderboard.rankScoreboard', () => {
  it('ranks entries by WPM descending and keeps accuracy as secondary data', () => {
    const ranked = rankScoreboard([
      {
        userId: 'a',
        username: 'slow',
        avatarUrl: null,
        wpm: 40,
        accuracy: 99,
      },
      {
        userId: 'b',
        username: 'fast',
        avatarUrl: 'https://example.com/b.png',
        wpm: 90,
        accuracy: 92,
      },
      {
        userId: 'c',
        username: 'mid',
        avatarUrl: null,
        wpm: 60,
        accuracy: 95,
      },
    ])

    expect(ranked.map((e) => e.username)).toEqual(['fast', 'mid', 'slow'])
    expect(ranked[0]).toMatchObject({
      rank: 1,
      wpm: 90,
      accuracy: 92,
      avatarUrl: 'https://example.com/b.png',
    })
    expect(ranked[2].rank).toBe(3)
  })
})

describe('Leaderboard.findUserDailyStanding', () => {
  it('returns the user standing when present in ranked entries', () => {
    const ranked = rankScoreboard([
      {
        userId: 'a',
        username: 'fast',
        avatarUrl: null,
        wpm: 90,
        accuracy: 95,
      },
      {
        userId: 'b',
        username: 'mid',
        avatarUrl: null,
        wpm: 60,
        accuracy: 98,
      },
    ])

    expect(findUserDailyStanding(ranked, 'b')).toEqual({
      rank: 2,
      wpm: 60,
      accuracy: 98,
    })
  })

  it('returns null when the user has no daily best today', () => {
    const ranked = rankScoreboard([
      {
        userId: 'a',
        username: 'fast',
        avatarUrl: null,
        wpm: 90,
        accuracy: 95,
      },
    ])

    expect(findUserDailyStanding(ranked, 'missing')).toBeNull()
  })
})
