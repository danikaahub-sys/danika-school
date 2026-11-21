import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PeoplePage } from '@/features/people'
import { assertPermission } from '@/features/access/guard'

const searchSchema = z.object({
  tab: z.string().optional(),
  create: z.coerce.boolean().optional(),
})

export const Route = createFileRoute('/_authenticated/people/')({
  validateSearch: searchSchema,
  beforeLoad: () => assertPermission('people.directory.view'),
  component: PeopleRoute,
})

function PeopleRoute() {
  const { tab, create } = Route.useSearch()
  return <PeoplePage tab={tab} create={create} />
}
