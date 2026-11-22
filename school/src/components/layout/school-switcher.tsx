import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/assets/logo'
import {
  enterSchool,
  listMemberships,
  type Membership,
} from '@/features/auth/session'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/t'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function SchoolSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const { school } = useSession()
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [switching, setSwitching] = useState(false)
  const canSwitch = memberships.length > 1

  useEffect(() => {
    let alive = true
    listMemberships()
      .then((rows) => {
        if (alive) setMemberships(rows.filter((item) => item.status === 'ACTIVE'))
      })
      .catch(() => {
        if (alive) setMemberships([])
      })
    return () => {
      alive = false
    }
  }, [school.id])

  async function pick(schoolId: string) {
    if (schoolId === school.id || switching) return
    setSwitching(true)
    try {
      const user = await enterSchool(schoolId)
      toast.success(t('auth.welcomeBack', { name: user.name }))
      navigate({ to: '/', replace: true })
    } catch {
      toast.error(t('common.error'))
    } finally {
      setSwitching(false)
    }
  }

  if (collapsed) {
    if (!canSwitch) {
      return (
        <span className='grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground'>
          <Logo className='size-5' />
        </span>
      )
    }
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='size-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
            aria-label={t('auth.chooseSchool')}
          >
            {switching ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Logo className='size-5' />
            )}
          </Button>
        </DropdownMenuTrigger>
        <SchoolMenu
          memberships={memberships}
          currentId={school.id}
          onPick={pick}
        />
      </DropdownMenu>
    )
  }

  if (!canSwitch) {
    return (
      <div className='flex items-center gap-2.5 px-2 py-1.5'>
        <span className='grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground'>
          <Logo className='size-5' />
        </span>
        <div className='min-w-0 flex-1 text-start leading-tight'>
          <div className='truncate text-sm font-bold'>{t('brand.name')}</div>
          <div className='truncate text-[11px] text-muted-foreground'>
            {school.name}
          </div>
        </div>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          className='flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-start transition hover:bg-sidebar-accent'
        >
          <span className='grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground'>
            {switching ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Logo className='size-5' />
            )}
          </span>
          <span className='min-w-0 flex-1 leading-tight'>
            <span className='block truncate text-sm font-bold'>
              {t('brand.name')}
            </span>
            <span className='block truncate text-[11px] text-muted-foreground'>
              {school.name || t('auth.chooseSchool')}
            </span>
          </span>
          <ChevronsUpDown className='size-4 shrink-0 text-muted-foreground' />
        </button>
      </DropdownMenuTrigger>
      <SchoolMenu
        memberships={memberships}
        currentId={school.id}
        onPick={pick}
      />
    </DropdownMenu>
  )
}

function SchoolMenu({
  memberships,
  currentId,
  onPick,
}: {
  memberships: Membership[]
  currentId: string
  onPick: (schoolId: string) => void
}) {
  return (
    <DropdownMenuContent side='bottom' align='start' className='w-64'>
      <DropdownMenuLabel>{t('auth.chooseSchool')}</DropdownMenuLabel>
      {memberships.length === 0 ? (
        <div className='px-2 py-1.5 text-xs text-muted-foreground'>
          {t('auth.chooseSchoolDesc')}
        </div>
      ) : (
        memberships.map((item) => {
          const active = item.schoolId === currentId
          return (
            <DropdownMenuItem
              key={item.id}
              onClick={() => onPick(item.schoolId)}
              className='items-start gap-2'
            >
              <Check
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  active ? 'opacity-100' : 'opacity-0'
                )}
              />
              <span className='min-w-0 flex-1'>
                <span className='block truncate font-medium'>
                  {item.schoolName}
                </span>
                <span className='block truncate text-xs text-muted-foreground'>
                  {item.city} — {item.positionName}
                </span>
              </span>
            </DropdownMenuItem>
          )
        })
      )}
    </DropdownMenuContent>
  )
}
