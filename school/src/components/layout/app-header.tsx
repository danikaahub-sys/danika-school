import { Header } from '@/components/layout/header'
import { Search } from '@/components/search'
import { ThemeToggle } from '@/components/theme-toggle'
import { ProfileDropdown } from '@/components/profile-dropdown'
import {
  AreaJumps,
  AttentionMenu,
  HelpButton,
  NotificationsBell,
  QuickCreate,
  ViewAsRole,
  YearSwitcher,
} from './header-tools'

export function AppHeader() {
  return (
    <Header fixed className='border-b'>
      <YearSwitcher />
      <Search className='min-h-9 w-40 sm:w-52 md:w-64' />
      <div className='ms-auto flex items-center gap-1'>
        <AttentionMenu />
        <AreaJumps />
        <NotificationsBell />
        <HelpButton />
        <QuickCreate />
        <ViewAsRole />
        <ThemeToggle />
        <ProfileDropdown />
      </div>
    </Header>
  )
}
