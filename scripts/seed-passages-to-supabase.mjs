#!/usr/bin/env node
/**
 * Inserts passages from generate-passages into Supabase (skips duplicates by text).
 * Reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY from .env
 *
 * Usage: node scripts/seed-passages-to-supabase.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'

function loadEnv() {
  const env = { ...process.env }
  if (existsSync('.env')) {
    for (const line of readFileSync('.env', 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (!(key in env)) env[key] = val
    }
  }
  return env
}

function loadPassages() {
  // Regenerate SQL + import PASSAGES from the generator module
  const gen = spawnSync(process.execPath, ['scripts/generate-passages.mjs'], {
    encoding: 'utf8',
  })
  if (gen.status !== 0) {
    console.error(gen.stderr || gen.stdout)
    process.exit(gen.status ?? 1)
  }
  console.log(gen.stdout.trim())
  return import('./generate-passages.mjs').then((m) => m.PASSAGES)
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY

if (!url || !key || url.includes('YOUR_PROJECT')) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const PASSAGES = await loadPassages()
const sb = createClient(url, key)

const { count: before, error: beforeErr } = await sb
  .from('sentences')
  .select('*', { count: 'exact', head: true })
if (beforeErr) {
  console.error('Failed to count sentences:', beforeErr.message)
  process.exit(1)
}

// Fetch existing texts to skip duplicates (paginate)
const existing = new Set()
const pageSize = 1000
for (let from = 0; ; from += pageSize) {
  const { data, error } = await sb
    .from('sentences')
    .select('text')
    .range(from, from + pageSize - 1)
  if (error) {
    console.error('Failed to list sentences:', error.message)
    process.exit(1)
  }
  if (!data?.length) break
  for (const row of data) existing.add(row.text)
  if (data.length < pageSize) break
}

const fresh = PASSAGES.filter((text) => !existing.has(text)).map((text) => ({
  text,
  is_active: true,
}))

console.log(
  `Existing sentences: ${before ?? existing.size}. New to insert: ${fresh.length} of ${PASSAGES.length} passages.`,
)

let inserted = 0
const chunk = 25
for (let i = 0; i < fresh.length; i += chunk) {
  const batch = fresh.slice(i, i + chunk)
  const { data, error } = await sb.from('sentences').insert(batch).select('id')
  if (error) {
    console.error(`Insert failed at batch ${i}:`, error.message)
    process.exit(1)
  }
  inserted += data?.length ?? batch.length
  console.log(`  inserted ${inserted}/${fresh.length}`)
}

const { count: after, error: afterErr } = await sb
  .from('sentences')
  .select('*', { count: 'exact', head: true })
if (afterErr) {
  console.error('Failed to recount:', afterErr.message)
  process.exit(1)
}

console.log(`Done. Supabase sentences table now has ${after} rows (${inserted} new).`)
