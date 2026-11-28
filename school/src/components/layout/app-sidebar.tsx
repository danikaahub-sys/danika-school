import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { hasPermission } from '@/features/access/permissions'
import { useAttention } from '@/hooks/use-attention'
import { useSession } from '@/hooks/use-session'
import { toFaDigits } from '@/lib/fa-text'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/t'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getNavGroups } from './data/sidebar-data'
import { linkActive } from './nav-active'
import { NavUser } from './nav-user'
import { SchoolSwitcher } from './school-switcher'
import { type NavGroup, type NavLink } from './types'

const OPEN_KEY = 'danika.rail.open.v2'

function readOpen(): string {
  try {
    return localStorage.getItem(OPEN_KEY) ?? ''
  } catch {
    return ''
  }
}

function isLink(item: NavGroup['items'][number]): item is NavLink {
  return !item.items
}

function collectLinks(group: NavGroup): NavLink[] {
  return group.items.flatMap((item) => (isLink(item) ? [item] : item.items))
}

function groupCount(links: NavLink[]) {
  return links.reduce((sum, item) => sum + Number(item.badge || 0), 0)
}

function groupTone(links: NavLink[]): 'bad' | 'warn' | null {
  const live = links.filter((item) => Number(item.badge || 0) > 0)
  if (!live.length) return null
  return live.some((item) => item.badgeTone !== 'warn') ? 'bad' : 'warn'
}

function CountBadge({
  count,
}: {
  count?: number | string
  /** Kept for call-site compatibility; group counts read as notifications, not errors. */
  tone?: 'bad' | 'warn'
}) {
  const n = Number(count || 0)
  if (!n) return null
  return (
    <span className='inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] leading-none font-bold text-muted-foreground tabular-nums'>
      {n > 99 ? `${toFaDigits(99)}+` : toFaDigits(n)}
    </span>
  )
}

export function AppSidebar() {
  const { state, isMobile } = useSidebar()
  const { user, role, permissions } = useSession()
  const { counts } = useAttention()
  const href = useLocation({ select: (location) => location.href })
  const [openId, setOpenId] = useState(readOpen)

  const groups = useMemo(() => {
    return getNavGroups(role, counts)
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => !item.permission || hasPermission(permissions, item.permission)
        ),
      }))
      .filter((group) => group.items.length > 0)
  }, [role, counts, permissions])

  const workdesk = groups.find((group) => group.pinned)
  const topics = groups.filter((group) => !group.pinned)
  const allUrls = useMemo(
    () => groups.flatMap((group) => collectLinks(group).map((item) => item.url ?? '/')),
    [groups]
  )

  useEffect(() => {
    const owner = topics.find((group) =>
      collectLinks(group).some((item) => linkActive(href, item.url, allUrls))
    )
    if (owner && openId !== 'all') setOpenId(owner.id)
  }, [href]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, openId)
    } catch {
      /* private mode */
    }
  }, [openId])

  const collapsed = state === 'collapsed' && !isMobile
  const allOpen = openId === 'all'
  const topicOpen = (id: string) => allOpen || openId === id

  const setAll = (open: boolean) => setOpenId(open ? 'all' : '')
  const toggleTopic = (id: string) => {
    if (allOpen) {
      setOpenId(id)
      return
    }
    setOpenId(openId === id ? '' : id)
  }

  return (
    <Sidebar collapsible='icon' variant='sidebar' side='right'>
      <SidebarHeader>
        {collapsed ? (
          <div className='flex justify-center p-2'>
            <SchoolSwitcher collapsed />
          </div>
        ) : (
          <SchoolSwitcher />
        )}
      </SidebarHeader>

      <SidebarContent>
        {collapsed ? (
          <nav className='flex flex-col items-center gap-1 p-2'>
            {groups.map((group) => {
              const links = collectLinks(group)
              const Icon = group.icon ?? links[0]?.icon
              const owns = links.some((item) =>
                linkActive(href, item.url, allUrls)
              )
              const tone = groupTone(links)
              return (
                <DropdownMenu key={group.id}>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      tooltip={group.title}
                      isActive={owns}
                      className='relative size-10 justify-center rounded-xl'
                    >
                      {Icon ? <Icon className='size-4' /> : null}
                      {tone ? (
                        <span
                          className={cn(
                            'absolute end-1.5 top-1.5 size-1.5 rounded-full',
                            tone === 'warn' ? 'bg-amber-500' : 'bg-destructive'
                          )}
                        />
                      ) : null}
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side='left' align='start' className='w-56'>
                    <DropdownMenuLabel>{group.title}</DropdownMenuLabel>
                    {links.map((item) => (
                      <DropdownMenuItem key={item.id} asChild>
                        <Link to={item.url} search={item.search as never}>
                          {item.icon ? <item.icon className='size-4' /> : null}
                          <span className='min-w-0 flex-1 truncate'>{item.title}</span>
                          <CountBadge count={item.badge} tone={item.badgeTone} />
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            })}
          </nav>
        ) : (
          <nav className='flex flex-col gap-1 p-2.5'>
            {workdesk ? (
              <RailGroup
                group={workdesk}
                links={collectLinks(workdesk)}
                href={href}
                allUrls={allUrls}
                open
                pinned
              />
            ) : null}

            <div className='flex shrink-0 items-center justify-between px-2 pb-1 pt-1'>
              <span className='text-[11px] font-bold text-muted-foreground'>
                {t('nav.sections')}
              </span>
              <button
                type='button'
                onClick={() => setAll(!allOpen)}
                className='rounded-lg px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground transition hover:text-foreground'
              >
                {allOpen ? t('common.closeAll') : t('common.openAll')}
              </button>
            </div>

            {topics.map((group) => {
              const links = collectLinks(group)
              const open = topicOpen(group.id)
              return (
                <RailGroup
                  key={group.id}
                  group={group}
                  links={links}
                  href={href}
                  allUrls={allUrls}
                  open={open}
                  onToggle={() => toggleTopic(group.id)}
                />
              )
            })}
          </nav>
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          user={{
            name: user?.name ?? t('brand.name'),
            email: user?.username ?? '',
            avatar: '',
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function RailGroup({
  group,
  links,
  href,
  allUrls,
  open,
  pinned = false,
  onToggle,
}: {
  group: NavGroup
  links: NavLink[]
  href: string
  allUrls: string[]
  open: boolean
  pinned?: boolean
  onToggle?: () => void
}) {
  const Icon = group.icon ?? links[0]?.icon
  const owns = links.some((item) => linkActive(href, item.url, allUrls))
  const tone = groupTone(links)
  const count = groupCount(links)

  return (
    <section className='shrink-0'>
      <button
        type='button'
        onClick={pinned ? undefined : onToggle}
        disabled={pinned}
        aria-expanded={open}
        className={cn(
          'flex h-11 w-full items-center gap-3 rounded-2xl px-2 text-start transition',
          pinned ? 'cursor-default' : 'hover:bg-sidebar-accent/70',
          open && !pinned && 'bg-sidebar-accent/70'
        )}
      >
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-xl transition',
            owns
              ? 'bg-primary/15 text-primary'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {Icon ? <Icon className='size-[18px]' /> : null}
        </span>
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm font-bold',
            owns && 'text-primary'
          )}
        >
          {group.title}
        </span>
        {!pinned ? (
          <span className='flex shrink-0 items-center gap-1.5'>
            {!open ? <CountBadge count={count} tone={tone ?? 'bad'} /> : null}
            <ChevronDown
              className={cn(
                'size-3.5 text-muted-foreground transition-transform duration-200',
                open && 'rotate-180'
              )}
            />
          </span>
        ) : null}
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className={cn('min-h-0 overflow-hidden', open ? '' : 'invisible')}>
          <ul className='ms-[25px] mt-1 mb-1.5 flex list-none flex-col gap-0.5 border-s border-sidebar-border ps-1.5'>
            {links.map((item) => (
              <RailLink
                key={item.id}
                item={item}
                href={href}
                allUrls={allUrls}
              />
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function RailLink({
  item,
  href,
  allUrls,
}: {
  item: NavLink
  href: string
  allUrls: string[]
}) {
  const active = linkActive(href, item.url, allUrls)
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <li ref={ref}>
      <Link
        to={item.url}
        search={item.search as never}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex scroll-my-10 items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold transition',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground'
        )}
      >
        <span className='min-w-0 flex-1 truncate'>{item.title}</span>
        {item.comingSoon ? (
          <span className='rounded-md border px-1.5 py-0.5 text-[10px] font-medium'>
            {t('common.comingSoonBadge')}
          </span>
        ) : null}
        <CountBadge count={item.badge} tone={item.badgeTone} />
      </Link>
    </li>
  )
}
