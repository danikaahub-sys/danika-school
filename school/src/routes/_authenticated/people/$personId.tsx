import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PersonPage } from '@/features/people/person-page'
import { assertPermission } from '@/features/access/guard'

const searchSchema = z.object({ tab: z.string().optional() })

export const Route = createFileRoute('/_authenticated/people/$personId')({
  validateSearch: searchSchema,
  beforeLoad: () => assertPermission('people.directory.view'),
  component: PersonRoute,
})

function PersonRoute() {
  const { personId } = Route.useParams()
  const { tab } = Route.useSearch()
  return <PersonPage personId={personId} tab={tab} />
}
