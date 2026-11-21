import { type LinkProps } from '@tanstack/react-router'
import { type PermissionKey } from '@/features/access/permissions'

type BaseNavItem = {
  id: string
  title: string
  badge?: string | number
  badgeTone?: 'bad' | 'warn'
  icon?: React.ElementType
  permission?: PermissionKey
  comingSoon?: boolean
}

type NavLink = BaseNavItem & {
  url: LinkProps['to'] | (string & {})
  search?: Record<string, string | boolean>
  items?: never
}

type NavCollapsible = BaseNavItem & {
  items: NavLink[]
  url?: never
}

type NavItem = NavCollapsible | NavLink

type NavGroup = {
  id: string
  title: string
  icon?: React.ElementType
  pinned?: boolean
  items: NavItem[]
}

export type { NavGroup, NavItem, NavLink }
