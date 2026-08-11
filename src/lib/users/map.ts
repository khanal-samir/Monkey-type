import type { Database } from '#/lib/supabase/database.types'
import type { SessionUser } from '#/domain/auth'

type UserRow = Database['public']['Tables']['users']['Row']

export function mapUserRow(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    avatarUrl: row.avatar_url,
    isAdmin: row.is_admin,
  }
}
