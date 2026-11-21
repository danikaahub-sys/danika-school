import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ResultsPage } from '@/features/classroom/results-page'
import { assertPermission } from '@/features/access/guard'

const searchSchema = z.object({ tab: z.string().optional() })

export const Route = createFileRoute('/_authenticated/classroom/results')({
  validateSearch: searchSchema,
  beforeLoad: () => assertPermission('classroom.grades.view'),
  component: ResultsRoute,
})

function ResultsRoute() {
  const { tab } = Route.useSearch()
  return <ResultsPage tab={tab} />
}
