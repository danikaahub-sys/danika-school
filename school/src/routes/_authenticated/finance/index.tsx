import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { FinancePage } from '@/features/finance'
import { assertPermission } from '@/features/access/guard'

const searchSchema = z.object({ tab: z.string().optional() })

export const Route = createFileRoute('/_authenticated/finance/')({
  validateSearch: searchSchema,
  beforeLoad: () => assertPermission('finance.ledger.view'),
  component: FinanceRoute,
})

function FinanceRoute() {
  const { tab } = Route.useSearch()
  return <FinancePage tab={tab} />
}
