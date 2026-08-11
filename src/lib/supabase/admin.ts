import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { getSupabaseEnv } from './client'

/**
 * Server-only Supabase client (secret / service role).
 * Never import this from client components.
 */
export function createSupabaseAdminClient(): SupabaseClient<Database> {
  const { url } = getSupabaseEnv()
  const secret =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''

  if (!url || !secret) {
    throw new Error(
      'Missing SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) on the server.',
    )
  }

  return createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
