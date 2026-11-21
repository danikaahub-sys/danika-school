import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ComingSoonPage } from '@/features/coming-soon'
import { assertSession } from '@/features/access/guard'

const searchSchema = z.object({ item: z.string().optional() })

export const Route = createFileRoute('/_authenticated/coming-soon')({
  validateSearch: searchSchema,
  beforeLoad: () => assertSession(),
  component: ComingSoonRoute,
})

function ComingSoonRoute() {
  const { item } = Route.useSearch()
  return <ComingSoonPage item={item} />
}
