import { describe, expect, it } from 'vitest'
import {
  SEED_ADMIN_EMAIL,
  SEED_SENTENCES,
  buildSeedAdmin,
  getSeedSentenceCount,
} from './seed'

describe('seed fixtures', () => {
  it('seeds the admin email from the PRD', () => {
    expect(SEED_ADMIN_EMAIL).toBe('samir1.dohoro@gmail.com')
    const admin = buildSeedAdmin()
    expect(admin.email).toBe(SEED_ADMIN_EMAIL)
    expect(admin.isAdmin).toBe(true)
    expect(admin.username).toBe('samir1')
    expect(admin.avatarUrl).toContain('dicebear')
  })

  it('includes a starter sentence corpus', () => {
    expect(getSeedSentenceCount()).toBeGreaterThanOrEqual(3)
    expect(SEED_SENTENCES.every((s) => s.length > 10)).toBe(true)
  })
})
