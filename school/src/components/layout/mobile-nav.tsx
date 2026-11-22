import { useMemo, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { hasPermission } from '@/features/access/permissions'
import { useAttention } from '@/hooks/use-attention'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'
import { getNavGroups } from './data/sidebar-data'
import { linkActive } from './nav-active'
import { type NavGroup, type NavLink } from './types'

function isLink(item: { items?: unknown }): item is NavLink {
  return !item.items
}

function collectLinks(group: NavGroup): NavLink[] {
  return group.items.flatMap((item) => (isLink(item) ? [item] : item.items))
}

export function MobileNav() {
  const { role, permissions } = useSession()
  const { counts } = useAttention()
  const href = useLocation({ select: (location) => location.href })
  const groups = useMemo(
    () =>
      getNavGroups(role, counts)
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) => !item.permission || hasPermission(permissions, item.permission)
          ),
        }))
        .filter((group) => group.items.length > 0),
    [role, counts, permissions]
  )
  const allUrls = useMemo(
    () => groups.flatMap((group) => collectLinks(group).map((item) => item.url ?? '/')),
    [groups]
  )
  const owner =
    groups.find((group) =>
      collectLinks(group).some((item) => linkActive(href, item.url, allUrls))
    ) ?? groups[0]
  const [groupId, setGroupId] = useState(owner?.id ?? groups[0]?.id)
  const group = groups.find((item) => item.id === groupId) ?? groups[0]
  const links = collectLinks(group)

  return (
    <div className='z-40 shrink-0 space-y-2 border-b bg-background px-3 py-2 md:hidden'>
      <div className='flex gap-2 overflow-x-auto pb-1'>
        {groups.map((item) => (
          <button
            key={item.id}
            type='button'
            onClick={() => setGroupId(item.id)}
            className={cn(
              'min-h-11 shrink-0 rounded-full border px-3 text-sm',
              item.id === group?.id && 'border-primary bg-primary text-primary-foreground'
            )}
          >
            {item.title}
          </button>
        ))}
      </div>
      <div className='flex gap-2 overflow-x-auto pb-1'>
        {links.map((item) => {
          const active = linkActive(href, item.url, allUrls)
          return (
            <Link
              key={item.id}
              to={item.url}
              search={item.search as never}
              className={cn(
                'min-h-11 shrink-0 rounded-full bg-muted px-3 text-sm leading-[2.75rem]',
                active && 'bg-primary text-primary-foreground'
              )}
            >
              {item.title}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
