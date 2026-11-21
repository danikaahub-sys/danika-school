import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { AdminPage } from '@/features/admin'
import { assertPermission } from '@/features/access/guard'

const searchSchema = z.object({ tab: z.string().optional() })

export const Route = createFileRoute('/_authenticated/admin/')({
  validateSearch: searchSchema,
  beforeLoad: () => assertPermission('admin.users.view'),
  component: AdminRoute,
})

function AdminRoute() {
  const { tab } = Route.useSearch()
  return <AdminPage tab={tab} />
}
