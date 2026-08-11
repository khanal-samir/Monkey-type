/**
 * Resolve avatar URL once at user creation (or when replacing).
 * Admin upload URL wins; otherwise generate a stable DiceBear URL from seed.
 */
export function resolveAvatar(input: {
  uploadUrl?: string | null
  seed: string
}): string {
  const trimmed = input.uploadUrl?.trim()
  if (trimmed) return trimmed

  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(input.seed)}`
}
