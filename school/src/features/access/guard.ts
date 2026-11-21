import { redirect } from '@tanstack/react-router'
import {
  hasPermission,
  permissionsForRole,
  type PermissionKey,
  type PermissionSet,
} from '@/features/access/permissions'
import { safeRedirectPath } from '@/lib/redirect'
import { useAuthStore } from '@/stores/auth-store'
import { useSessionStore } from '@/stores/session-store'

const LANDING: Array<{ key: PermissionKey; to: string }> = [
  { key: 'home.dashboard.view', to: '/' },
  { key: 'classroom.workspace.view', to: '/classroom' },
  { key: 'people.directory.view', to: '/people' },
  { key: 'finance.ledger.view', to: '/finance' },
  { key: 'communications.compose.view', to: '/communications' },
  { key: 'setup.school.view', to: '/setup' },
  { key: 'admin.users.view', to: '/admin' },
]

export function firstAllowedPath(permissions: PermissionSet | undefined): string | null {
  for (const item of LANDING) {
    if (hasPermission(permissions, item.key)) return item.to
  }
  return null
}

export function assertSession(redirectTo?: string) {
  const { auth } = useAuthStore.getState()
  if (!auth.accessToken || !auth.user) {
    throw redirect({
      to: '/sign-in',
      search: { redirect: safeRedirectPath(redirectTo) },
    })
  }
}

export function assertPermission(key: PermissionKey, redirectTo?: string) {
  assertSession(redirectTo)
  const user = useAuthStore.getState().auth.user
  const viewAs = useSessionStore.getState().viewAsRole
  const permissions = viewAs ? permissionsForRole(viewAs) : user?.permissions
  if (hasPermission(permissions, key)) return
  const fallback = firstAllowedPath(permissions)
  if (fallback) {
    throw redirect({ to: fallback as '/' })
  }
  throw redirect({ to: '/403' })
}
