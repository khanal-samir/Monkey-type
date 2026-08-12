import { Link, useNavigate } from '@tanstack/react-router'
import type { SessionUser } from '#/domain/auth'
import { UserAvatarPreview } from '#/components/user-avatar-preview'
import { APP_NAME } from '#/lib/app-brand'
import { useSessionStore } from '#/session/store'

type AppHeaderProps = {
  user: SessionUser
}

function NavLink({
  to,
  children,
  exact = false,
}: {
  to: '/' | '/leaderboard' | '/profile'
  children: React.ReactNode
  exact?: boolean
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      className="app-nav-link"
      activeProps={{ className: 'app-nav-link app-nav-link-active' }}
    >
      {children}
    </Link>
  )
}

export function AppHeader({ user }: AppHeaderProps) {
  const navigate = useNavigate()
  const clearSession = useSessionStore((s) => s.clearSession)

  return (
    <header className="app-header">
      <div className="app-header-start">
        <Link to="/" className="brand-mark app-header-brand">
          {APP_NAME}
        </Link>

        <nav className="app-header-nav" aria-label="Main">
          <NavLink to="/" exact>
            Type
          </NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
      </div>

      <div className="app-header-end">
        <div className="app-header-user">
          <UserAvatarPreview
            username={user.username}
            avatarUrl={user.avatarUrl}
            size={32}
            className="app-header-avatar"
            fallbackClassName="app-header-avatar app-header-avatar-fallback"
          />
          <Link to="/profile" className="app-header-username">
            {user.username}
          </Link>
        </div>

        {user.isAdmin ? (
          <div className="app-header-admin">
            <Link to="/admin/users" className="app-header-admin-link">
              Users
            </Link>
            <Link to="/admin/sentences" className="app-header-admin-link">
              Sentences
            </Link>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => {
            clearSession()
            void navigate({ to: '/login' })
          }}
          className="admin-ghost app-header-logout"
        >
          Log out
        </button>
      </div>
    </header>
  )
}
