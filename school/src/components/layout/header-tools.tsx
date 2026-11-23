import { Link, useNavigate } from '@tanstack/react-router'
import {
  Banknote,
  Bell,
  ClipboardCheck,
  HelpCircle,
  Landmark,
  Megaphone,
  Plus,
  UserPlus,
  Users,
} from 'lucide-react'
import { BASE_ROLES, type BaseRole } from '@/features/access/permissions'
import { useAttention } from '@/hooks/use-attention'
import { useSession } from '@/hooks/use-session'
import { t } from '@/i18n/t'
import { toFaDigits } from '@/lib/fa-text'
import { useSessionStore } from '@/stores/session-store'
import { Can } from '@/components/can'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function YearSwitcher() {
  const { years, year } = useSession()
  const yearId = useSessionStore((state) => state.yearId)
  const setYearId = useSessionStore((state) => state.setYearId)
  const current = year
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='sm' className='min-h-9 max-w-52 truncate'>
          {t('nav.year')} {current.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        <DropdownMenuLabel>{t('nav.year')}</DropdownMenuLabel>
        {years.map((year) => (
          <DropdownMenuItem
            key={year.id}
            onClick={() => {
              if (year.id !== yearId && !window.confirm(t('nav.yearChangeWarn'))) return
              setYearId(year.id)
            }}
          >
            {year.label}
            {year.active ? ` — ${t('setup.active')}` : ''}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AttentionMenu() {
  const navigate = useNavigate()
  const { counts, total } = useAttention()
  const rows = [
    { key: 'attendance', label: t('attention.attendance'), count: counts.attendance, to: '/classroom/attendance' as const },
    { key: 'receipts', label: t('attention.receipts'), count: counts.receipts, to: '/finance' as const, search: { tab: 'queue' } },
    { key: 'grades', label: t('attention.grades'), count: counts.grades, to: '/classroom/results' as const },
    { key: 'import', label: t('attention.import'), count: counts.importErrors, to: '/people/import' as const },
    { key: 'guardians', label: t('attention.guardians'), count: counts.guardians, to: '/people' as const, search: { tab: 'guardians' } },
  ].filter((row) => row.count > 0)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='sm' className='relative min-h-9'>
          <ClipboardCheck />
          <span className='hidden lg:inline'>{t('nav.attention')}</span>
          {total > 0 ? (
            <Badge variant='destructive' className='h-5 min-w-5 px-1 text-[10px]'>
              {toFaDigits(total)}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='w-72'>
        <DropdownMenuLabel>{t('nav.attention')}</DropdownMenuLabel>
        {rows.length === 0 ? (
          <p className='px-2 py-3 text-center text-sm text-muted-foreground'>
            {t('attention.clear')}
          </p>
        ) : (
          rows.map((row) => (
            <DropdownMenuItem
              key={row.key}
              onClick={() =>
                navigate({
                  to: row.to,
                  search: 'search' in row ? row.search : undefined,
                } as never)
              }
            >
              <span className='flex-1'>{row.label}</span>
              <Badge variant='secondary'>{toFaDigits(row.count)}</Badge>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function QuickCreate() {
  const navigate = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size='sm' className='h-9'>
          <Plus />
          <span className='hidden sm:inline'>{t('nav.quickCreate')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        <Can permission='people.directory.create'>
          <DropdownMenuItem onClick={() => navigate({ to: '/people', search: { create: true } })}>
            <Users />
            {t('quick.student')}
          </DropdownMenuItem>
        </Can>
        <Can permission='finance.receipts.create'>
          <DropdownMenuItem onClick={() => navigate({ to: '/finance', search: { tab: 'queue' } })}>
            <Banknote />
            {t('quick.receipt')}
          </DropdownMenuItem>
        </Can>
        <Can permission='classroom.attendance.create'>
          <DropdownMenuItem onClick={() => navigate({ to: '/classroom' })}>
            <ClipboardCheck />
            {t('quick.attendance')}
          </DropdownMenuItem>
        </Can>
        <Can permission='communications.compose.create'>
          <DropdownMenuItem onClick={() => navigate({ to: '/communications' })}>
            <Megaphone />
            {t('quick.announcement')}
          </DropdownMenuItem>
        </Can>
        <Can permission='admin.users.create'>
          <DropdownMenuItem onClick={() => navigate({ to: '/admin', search: { tab: 'invitations' } })}>
            <UserPlus />
            {t('quick.invite')}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AreaJumps() {
  return (
    <Can permission='finance.ledger.view'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='sm' className='min-h-9'>
            <Landmark />
            <span className='hidden lg:inline'>{t('nav.jumps')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start'>
          <DropdownMenuItem asChild>
            <Link to='/finance'>{t('finance.plans')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to='/finance' search={{ tab: 'queue' }}>
              {t('finance.queue')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to='/finance' search={{ tab: 'batch' }}>
              {t('finance.batch')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to='/finance' search={{ tab: 'reports' }}>
              {t('finance.reports')}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Can>
  )
}

export function NotificationsBell() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='min-h-9 min-w-9' aria-label={t('nav.notifications')}>
          <Bell />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-64'>
        <DropdownMenuLabel>{t('nav.notifications')}</DropdownMenuLabel>
        <p className='px-2 py-3 text-sm text-muted-foreground'>{t('attention.none')}</p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function HelpButton() {
  return (
    <Button variant='ghost' size='icon' className='min-h-9 min-w-9' aria-label={t('nav.help')} asChild>
      <Link to='/coming-soon' search={{ item: 'help' }}>
        <HelpCircle />
      </Link>
    </Button>
  )
}

export function ViewAsRole() {
  const navigate = useNavigate()
  const { user } = useSession()
  const viewAsRole = useSessionStore((state) => state.viewAsRole)
  const setViewAsRole = useSessionStore((state) => state.setViewAsRole)
  if (!import.meta.env.DEV && user?.role !== 'principal') return null

  function applyRole(role: BaseRole | null) {
    setViewAsRole(role)
    navigate({ to: '/' })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='sm' className='h-9'>
          {viewAsRole
            ? `${t('nav.viewAs')} ${t(`role.${viewAsRole}`)}`
            : t('nav.viewAs')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuLabel>{t('nav.viewAs')}</DropdownMenuLabel>
        {BASE_ROLES.map((role) => (
          <DropdownMenuItem key={role} onClick={() => applyRole(role)}>
            {t(`role.${role}`)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => applyRole(null)}>
          {t('nav.viewAsOff')}
          {viewAsRole ? ` (${t(`role.${viewAsRole}`)})` : ''}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
