import { Outlet } from '@tanstack/react-router'
import { getCookie } from '@/lib/cookies'
import { SearchProvider } from '@/context/search-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { MobileNav } from '@/components/layout/mobile-nav'
import { SkipToMain } from '@/components/skip-to-main'

export function AuthenticatedLayout() {
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  return (
    <SearchProvider>
      <SidebarProvider defaultOpen={defaultOpen} className='h-svh overflow-hidden'>
        <SkipToMain />
        <AppSidebar />
        <SidebarInset className='@container/content flex h-svh flex-col overflow-hidden'>
          <AppHeader />
          <MobileNav />
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </SearchProvider>
  )
}
