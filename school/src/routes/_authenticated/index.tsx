import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/features/home'
import { assertPermission } from '@/features/access/guard'

const searchSchema = z.object({
  range: z.enum(['day', 'week', 'month']).catch('day'),
})

export const Route = createFileRoute('/_authenticated/')({
  validateSearch: searchSchema,
  beforeLoad: () => assertPermission('home.dashboard.view'),
  component: HomeRoute,
})

function HomeRoute() {
  const { range } = Route.useSearch()
  return <HomePage range={range} />
}
