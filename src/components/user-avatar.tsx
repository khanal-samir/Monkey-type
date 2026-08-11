import { useEffect, useState } from 'react'

type UserAvatarProps = {
  username: string
  avatarUrl?: string | null
  size?: number
  className?: string
  fallbackClassName?: string
}

/**
 * Avatar image with hotlink-friendly referrer policy and initials fallback
 * when the remote URL 404s / is blocked.
 */
export function UserAvatar({
  username,
  avatarUrl,
  size = 32,
  className = '',
  fallbackClassName = '',
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false)
  const trimmed = avatarUrl?.trim() || ''

  useEffect(() => {
    setFailed(false)
  }, [trimmed])

  const showImage = Boolean(trimmed) && !failed
  const initial = (username.trim().slice(0, 1) || '?').toUpperCase()

  if (showImage) {
    return (
      <img
        src={trimmed}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        className={className}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div
      className={fallbackClassName || className}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initial}
    </div>
  )
}
