import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { assertSession } from '@/features/access/guard'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    assertSession(`${location.pathname}${location.searchStr}${location.hash}`)
  },
  component: AuthenticatedLayout,
})
