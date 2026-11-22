import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Header({ className, fixed, children, ...props }: HeaderProps) {
  return (
    <header
      className={cn(
        'z-50 h-16 shrink-0',
        fixed && 'header-fixed peer/header',
        className
      )}
      {...props}
    >
      <div className='relative flex h-full items-center gap-3 p-4 sm:gap-4'>
        <SidebarTrigger variant='outline' className='hidden md:inline-flex' />
        <Separator orientation='vertical' className='hidden h-6 md:block' />
        {children}
      </div>
    </header>
  )
}
