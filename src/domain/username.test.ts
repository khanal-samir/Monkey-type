import { describe, expect, it } from 'vitest'
import { resolveUsername } from './username'

describe('resolveUsername', () => {
  it('uses the email local-part before the first dot when no override is set', () => {
    expect(resolveUsername('samir1.dohoro@gmail.com')).toBe('samir1')
  })

  it('prefers a non-empty admin override', () => {
    expect(resolveUsername('samir1.dohoro@gmail.com', 'Samir')).toBe('Samir')
  })

  it('falls back to the full local-part when there is no dot', () => {
    expect(resolveUsername('alice@example.com')).toBe('alice')
  })
})
