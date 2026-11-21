import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { SetupPage } from '@/features/setup'
import { assertPermission } from '@/features/access/guard'

const searchSchema = z.object({ tab: z.string().optional() })

export const Route = createFileRoute('/_authenticated/setup/')({
  validateSearch: searchSchema,
  beforeLoad: () => assertPermission('setup.school.view'),
  component: SetupRoute,
})

function SetupRoute() {
  const { tab } = Route.useSearch()
  return <SetupPage tab={tab} />
}
