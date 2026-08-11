/**
 * Resolve display username: admin override wins, else email local-part before first `.`.
 * e.g. samir1.dohoro@gmail.com → samir1
 */
export function resolveUsername(
  email: string,
  adminOverride?: string | null,
): string {
  const trimmed = adminOverride?.trim()
  if (trimmed) return trimmed

  const localPart = email.split('@')[0] ?? ''
  const beforeDot = localPart.split('.')[0] ?? ''
  return beforeDot || localPart
}
