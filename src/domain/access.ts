/**
 * API trust helpers (v1): client sends userId; server verifies the row exists.
 * Admin routes additionally require is_admin.
 */

export type UserRecord = {
  id: string
  email: string
  username: string
  avatarUrl: string | null
  isAdmin: boolean
}

export type FindUserById = (id: string) => Promise<UserRecord | null>

export type AccessDeps = {
  findUserById: FindUserById
}

export async function requireExistingUser(
  userId: string,
  deps: AccessDeps,
): Promise<UserRecord> {
  const user = await deps.findUserById(userId)
  if (!user) {
    throw new Error('User not found for the given userId.')
  }
  return user
}

export async function requireAdmin(
  userId: string,
  deps: AccessDeps,
): Promise<UserRecord> {
  const user = await requireExistingUser(userId, deps)
  if (!user.isAdmin) {
    throw new Error('Admin privileges required.')
  }
  return user
}
