import { hasPermission, permissionsForRole, type PermissionKey } from '@/features/access/permissions'
import { useAuthStore } from '@/stores/auth-store'
import { useSessionStore } from '@/stores/session-store'

export function useSession() {
  const user = useAuthStore((state) => state.auth.user)
  const viewAsRole = useSessionStore((state) => state.viewAsRole)
  const yearId = useSessionStore((state) => state.yearId)
  const role = viewAsRole ?? user?.role ?? 'student'
  const permissions = viewAsRole
    ? permissionsForRole(viewAsRole)
    : (user?.permissions ?? permissionsForRole(role))
  const years = user?.years ?? []
  const year = years.find((item) => item.id === yearId) ?? years.find((item) => item.active) ?? years[0]

  return {
    user,
    actorId: user?.id,
    role,
    permissions,
    yearId: yearId || year?.id || '',
    year: year ?? { id: '', label: '', active: true },
    years,
    school: {
      id: user?.schoolId ?? '',
      name: user?.schoolName ?? '',
      city: user?.city ?? '',
      moneyUnit: user?.moneyUnit ?? 'toman',
    },
    can: (key: PermissionKey) => hasPermission(permissions, key),
  }
}
