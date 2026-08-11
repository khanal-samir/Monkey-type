import { describe, expect, it, vi } from 'vitest'
import { requireAdmin, requireExistingUser, type UserRecord } from './access'

const admin: UserRecord = {
  id: 'u-admin',
  email: 'samir1.dohoro@gmail.com',
  username: 'samir1',
  avatarUrl: null,
  isAdmin: true,
}

const player: UserRecord = {
  id: 'u-player',
  email: 'alice.dohoro@gmail.com',
  username: 'alice',
  avatarUrl: null,
  isAdmin: false,
}

describe('requireExistingUser', () => {
  it('returns the user when the row exists', async () => {
    const findUserById = vi.fn(async () => player)
    await expect(requireExistingUser(player.id, { findUserById })).resolves.toEqual(
      player,
    )
  })

  it('throws when the user id is unknown', async () => {
    const findUserById = vi.fn(async () => null)
    await expect(
      requireExistingUser('missing', { findUserById }),
    ).rejects.toThrow(/user not found/i)
  })
})

describe('requireAdmin', () => {
  it('returns the admin user when is_admin is true', async () => {
    const findUserById = vi.fn(async () => admin)
    await expect(requireAdmin(admin.id, { findUserById })).resolves.toEqual(admin)
  })

  it('rejects a non-admin even when the row exists', async () => {
    const findUserById = vi.fn(async () => player)
    await expect(requireAdmin(player.id, { findUserById })).rejects.toThrow(
      /admin/i,
    )
  })
})
