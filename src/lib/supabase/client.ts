import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export type DohoroSupabase = SupabaseClient<Database>

export function getSupabaseEnv() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  return {
    url: typeof url === 'string' ? url : '',
    anonKey: typeof anonKey === 'string' ? anonKey : '',
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseEnv()
  return Boolean(url && anonKey)
}

let browserClient: DohoroSupabase | null = null

export function createSupabaseClient(): DohoroSupabase {
  const { url, anonKey } = getSupabaseEnv()
  if (!url || !anonKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env',
    )
  }
  return createClient<Database>(url, anonKey)
}

export function getSupabaseBrowserClient(): DohoroSupabase {
  if (!browserClient) {
    browserClient = createSupabaseClient()
  }
  return browserClient
}
