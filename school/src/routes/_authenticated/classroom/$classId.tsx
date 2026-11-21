import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ClassWorkspacePage } from '@/features/classroom/class-page'
import { assertPermission } from '@/features/access/guard'

const searchSchema = z.object({ tab: z.string().optional() })

export const Route = createFileRoute('/_authenticated/classroom/$classId')({
  validateSearch: searchSchema,
  beforeLoad: () => assertPermission('classroom.workspace.view'),
  component: ClassRoute,
})

function ClassRoute() {
  const { classId } = Route.useParams()
  const { tab } = Route.useSearch()
  return <ClassWorkspacePage classId={classId} tab={tab} />
}
