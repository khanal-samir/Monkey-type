import { describe, expect, it } from 'vitest'
import { rankScoreboard } from './leaderboard'

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
