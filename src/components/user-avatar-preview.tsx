import { UserAvatar } from '#/components/user-avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'

type UserAvatarPreviewProps = {
  username: string
  avatarUrl?: string | null
  size?: number
  previewSize?: number
  className?: string
  fallbackClassName?: string
  previewClassName?: string
  previewFallbackClassName?: string
  triggerClassName?: string
}

/**
 * Clickable avatar that opens a dialog with a larger preview.
 */
export function UserAvatarPreview({
  username,
  avatarUrl,
  size = 32,
  previewSize = 160,
  className = '',
  fallbackClassName = '',
  previewClassName = 'avatar-preview-image',
  previewFallbackClassName = 'avatar-preview-image avatar-preview-fallback',
  triggerClassName = '',
}: UserAvatarPreviewProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`avatar-preview-trigger${triggerClassName ? ` ${triggerClassName}` : ''}`}
          aria-label={`View ${username}'s avatar`}
        >
          <UserAvatar
            username={username}
            avatarUrl={avatarUrl}
            size={size}
            className={className}
            fallbackClassName={fallbackClassName}
          />
        </button>
      </DialogTrigger>
      <DialogContent className="avatar-preview-dialog sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{username}</DialogTitle>
          <DialogDescription>Avatar preview</DialogDescription>
        </DialogHeader>
        <div className="avatar-preview-body">
          <UserAvatar
            username={username}
            avatarUrl={avatarUrl}
            size={previewSize}
            className={previewClassName}
            fallbackClassName={previewFallbackClassName}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
