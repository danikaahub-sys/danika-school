import { type PermissionKey } from '@/features/access/permissions'
import { useSession } from '@/hooks/use-session'

type CanProps = {
  permission: PermissionKey
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const { can } = useSession()
  return can(permission) ? children : fallback
}
