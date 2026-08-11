import { createServerFn } from '@tanstack/react-start'
import { login } from '#/domain/auth'
import { requireAdmin, requireExistingUser } from '#/domain/access'
import { resolveUsername } from '#/domain/username'
import { resolveAvatar } from '#/domain/avatar'
import {
  assertSupabaseConfigured,
  findUserByEmail,
  findUserById,
  getUsersClient,
} from '#/lib/users/repo'
import { mapUserRow } from '#/lib/users/map'
import { isSupabaseConfigured } from '#/lib/supabase/client'
import type { SessionUser } from '#/domain/auth'

function accessDeps() {
  return { findUserById }
}

export const loginByEmail = createServerFn({ method: 'POST' })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }): Promise<
    { ok: true; user: SessionUser } | { ok: false; error: string }
  > => {
    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        error:
          'Supabase is not configured. Copy .env.example to .env and set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.',
      }
    }

    return login(data.email, { findUserByEmail })
  })

export const verifyUserExists = createServerFn({ method: 'POST' })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    assertSupabaseConfigured()
    const user = await requireExistingUser(data.userId, accessDeps())
    return { user }
  })

export const listUsers = createServerFn({ method: 'POST' })
  .validator((data: { adminUserId: string }) => data)
  .handler(async ({ data }) => {
    assertSupabaseConfigured()
    await requireAdmin(data.adminUserId, accessDeps())

    const supabase = getUsersClient()
    const { data: rows, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error
    return { users: (rows ?? []).map(mapUserRow) }
  })

export const createUser = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      adminUserId: string
      email: string
      username?: string | null
      avatarUrl?: string | null
      isAdmin?: boolean
    }) => data,
  )
  .handler(async ({ data }) => {
    assertSupabaseConfigured()
    await requireAdmin(data.adminUserId, accessDeps())

    const email = data.email.trim().toLowerCase()
    if (!email) {
      throw new Error('Email is required.')
    }

    const username = resolveUsername(email, data.username)
    const avatarUrl = resolveAvatar({
      uploadUrl: data.avatarUrl,
      seed: email,
    })

    const supabase = getUsersClient()
    const { data: row, error } = await supabase
      .from('users')
      .insert({
        email,
        username,
        avatar_url: avatarUrl,
        is_admin: Boolean(data.isAdmin),
      })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('A user with that email already exists.')
      }
      throw error
    }

    return { user: mapUserRow(row) }
  })

export const updateUser = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      adminUserId: string
      userId: string
      username?: string | null
      avatarUrl?: string | null
      isAdmin?: boolean
    }) => data,
  )
  .handler(async ({ data }) => {
    assertSupabaseConfigured()
    await requireAdmin(data.adminUserId, accessDeps())

    const patch: {
      username?: string
      avatar_url?: string | null
      is_admin?: boolean
      updated_at?: string
    } = {
      updated_at: new Date().toISOString(),
    }

    if (data.username !== undefined) {
      const trimmed = data.username?.trim()
      if (trimmed) patch.username = trimmed
    }

    if (data.avatarUrl !== undefined) {
      const trimmed = data.avatarUrl?.trim()
      patch.avatar_url = trimmed || null
    }

    if (data.isAdmin !== undefined) {
      patch.is_admin = data.isAdmin
    }

    const supabase = getUsersClient()
    const { data: row, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', data.userId)
      .select('*')
      .single()

    if (error) throw error
    if (!row) throw new Error('User not found for the given userId.')

    return { user: mapUserRow(row) }
  })
