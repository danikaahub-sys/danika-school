import { Link } from '@tanstack/react-router'
import useDialogState from '@/hooks/use-dialog-state'
import { useSession } from '@/hooks/use-session'
import { getDisplayNameInitials } from '@/lib/utils'
import { t } from '@/i18n/t'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { Can } from '@/components/can'
import { ViewAsRole } from '@/components/layout/header-tools'

export function ProfileDropdown() {
  const [open, setOpen] = useDialogState()
  const { user, role } = useSession()
  const name = user?.name ?? t('brand.name')

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative h-9 w-9 rounded-full'>
            <Avatar className='h-9 w-9'>
              <AvatarFallback>{getDisplayNameInitials(name)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56' align='end'>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col gap-1'>
              <p className='text-sm font-medium'>{name}</p>
              <p className='text-xs text-muted-foreground'>
                {user?.username} · {t(`role.${role}` as 'role.principal')}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <Can permission='admin.settings.view'>
            <DropdownMenuItem asChild>
              <Link to='/admin' search={{ tab: 'settings' }}>
                {t('nav.settings')}
              </Link>
            </DropdownMenuItem>
          </Can>
          <div className='px-2 py-1.5'>
            <ViewAsRole />
          </div>
          <DropdownMenuItem variant='destructive' onClick={() => setOpen(true)}>
            {t('auth.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
