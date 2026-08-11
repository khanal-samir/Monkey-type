import { createServerFn } from '@tanstack/react-start'
import { requireAdmin } from '#/domain/access'
import { AVATARS_BUCKET } from '#/lib/avatars/upload'
import { createSupabaseAdminClient } from '#/lib/supabase/admin'
import { assertSupabaseConfigured, findUserById } from '#/lib/users/repo'

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
])

const MAX_BYTES = 2 * 1024 * 1024

function extensionFor(fileName: string, contentType: string): string {
  const fromName = fileName.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName
  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/webp') return 'webp'
  if (contentType === 'image/gif') return 'gif'
  if (contentType === 'image/svg+xml') return 'svg'
  return 'jpg'
}

export const uploadAvatar = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      adminUserId: string
      fileName: string
      contentType: string
      base64: string
    }) => data,
  )
  .handler(async ({ data }) => {
    assertSupabaseConfigured()
    await requireAdmin(data.adminUserId, { findUserById })

    if (!ALLOWED_TYPES.has(data.contentType)) {
      throw new Error('Use a JPG, PNG, WebP, GIF, or SVG image.')
    }

    const bytes = Buffer.from(data.base64, 'base64')
    if (bytes.length <= 0 || bytes.length > MAX_BYTES) {
      throw new Error('Image must be under 2MB.')
    }

    const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extensionFor(
      data.fileName,
      data.contentType,
    )}`

    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, bytes, {
      cacheControl: '3600',
      upsert: false,
      contentType: data.contentType,
    })

    if (error) {
      throw new Error(
        error.message.includes('Bucket not found')
          ? 'Avatars bucket missing. Ask an admin to create the public `avatars` bucket.'
          : error.message,
      )
    }

    const { data: pub } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path)
    if (!pub.publicUrl) {
      throw new Error('Upload succeeded but no public URL was returned.')
    }

    return { publicUrl: pub.publicUrl }
  })
