/**
 * AllowlistAuth — login by email only (no password/OTP).
 * Session shape matches Zustand/localStorage: { id, email, username, avatarUrl, isAdmin }.
 */

export type SessionUser = {
  id: string
  email: string
  username: string
  avatarUrl: string | null
  isAdmin: boolean
}

export type FindUserByEmail = (email: string) => Promise<SessionUser | null>

export type LoginOk = { ok: true; user: SessionUser }
export type LoginErr = { ok: false; error: string }
export type LoginResult = LoginOk | LoginErr

export type AllowlistAuthDeps = {
  findUserByEmail: FindUserByEmail
}

export async function login(
  email: string,
  deps: AllowlistAuthDeps,
): Promise<LoginResult> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) {
    return { ok: false, error: 'Email is required.' }
  }

  let user: SessionUser | null
  try {
    user = await deps.findUserByEmail(normalized)
  } catch {
    return {
      ok: false,
      error:
        'Unable to reach the user directory. Check Supabase configuration.',
    }
  }

  if (!user) {
    return {
      ok: false,
      error: 'This email is not allowlisted. Ask an admin to add you.',
    }
  }

  return { ok: true, user }
}

/** Deep-module facade: AllowlistAuth.login(email, deps) */
export const AllowlistAuth = { login }
