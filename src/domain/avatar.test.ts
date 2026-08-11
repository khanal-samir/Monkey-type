import { describe, expect, it } from 'vitest'
import { resolveAvatar } from './avatar'

describe('resolveAvatar', () => {
  it('prefers a non-empty upload URL', () => {
    expect(
      resolveAvatar({
        uploadUrl: 'https://cdn.example.com/me.png',
        seed: 'alice@example.com',
      }),
    ).toBe('https://cdn.example.com/me.png')
  })

  it('trims whitespace on upload URLs', () => {
    expect(
      resolveAvatar({
        uploadUrl: '  https://cdn.example.com/me.png  ',
        seed: 'alice@example.com',
      }),
    ).toBe('https://cdn.example.com/me.png')
  })

  it('generates a DiceBear URL from seed when upload is blank', () => {
    const url = resolveAvatar({ uploadUrl: '   ', seed: 'samir1.dohoro@gmail.com' })
    expect(url).toContain('api.dicebear.com')
    expect(url).toContain(encodeURIComponent('samir1.dohoro@gmail.com'))
  })

  it('generates a DiceBear URL when upload is omitted', () => {
    const url = resolveAvatar({ seed: 'bob@example.com' })
    expect(url).toBe(
      `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent('bob@example.com')}`,
    )
  })
})
