import { createFileRoute } from '@tanstack/react-router'
import { LedgerPage } from '@/features/finance/ledger-page'
import { assertPermission } from '@/features/access/guard'

export const Route = createFileRoute('/_authenticated/finance/students/$studentId')({
  beforeLoad: () => assertPermission('finance.ledger.view'),
  component: LedgerRoute,
})

function LedgerRoute() {
  const { studentId } = Route.useParams()
  return <LedgerPage studentId={studentId} />
}
