import { describe, expect, it, vi } from 'vitest'
import { login, type SessionUser } from './auth'

const admin: SessionUser = {
  id: 'u-admin',
  email: 'samir1.dohoro@gmail.com',
  username: 'samir1',
  avatarUrl: 'https://api.dicebear.com/9.x/thumbs/svg?seed=admin',
  isAdmin: true,
}

describe('AllowlistAuth.login', () => {
  it('returns the allowlisted user for a matching email', async () => {
    const findUserByEmail = vi.fn(async (email: string) =>
      email === admin.email ? admin : null,
    )

    const result = await login('samir1.dohoro@gmail.com', { findUserByEmail })

    expect(result).toEqual({ ok: true, user: admin })
    expect(findUserByEmail).toHaveBeenCalledWith('samir1.dohoro@gmail.com')
  })

  it('normalizes email case and surrounding whitespace before lookup', async () => {
    const findUserByEmail = vi.fn(async () => admin)

    const result = await login('  Samir1.Dohoro@Gmail.com  ', {
      findUserByEmail,
    })

    expect(result.ok).toBe(true)
    expect(findUserByEmail).toHaveBeenCalledWith('samir1.dohoro@gmail.com')
  })

  it('rejects a blank email without calling the directory', async () => {
    const findUserByEmail = vi.fn(async () => admin)

    const result = await login('   ', { findUserByEmail })

    expect(result).toEqual({
      ok: false,
      error: 'Email is required.',
    })
    expect(findUserByEmail).not.toHaveBeenCalled()
  })

  it('rejects a non-allowlisted email with a clear error', async () => {
    const findUserByEmail = vi.fn(async () => null)

    const result = await login('stranger@example.com', { findUserByEmail })

    expect(result).toEqual({
      ok: false,
      error: 'This email is not allowlisted. Ask an admin to add you.',
    })
  })

  it('fails gracefully when the user directory is unavailable', async () => {
    const findUserByEmail = vi.fn(async () => {
      throw new Error('supabase down')
    })

    const result = await login('samir1.dohoro@gmail.com', { findUserByEmail })

    expect(result).toEqual({
      ok: false,
      error:
        'Unable to reach the user directory. Check Supabase configuration.',
    })
  })
})
