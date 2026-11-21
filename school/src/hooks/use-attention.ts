import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { type AttentionCounts } from '@/mocks'
import { useSession } from '@/hooks/use-session'
import { api } from '@/lib/api-client'

const EMPTY: AttentionCounts = {
  attendance: 0,
  receipts: 0,
  grades: 0,
  importErrors: 0,
  guardians: 0,
}

export function useAttention() {
  const { pathname } = useLocation()
  const { can } = useSession()
  const query = useQuery({
    queryKey: ['attention', pathname],
    queryFn: () => api<AttentionCounts>('/school/dashboard/attention'),
    refetchInterval: 60_000,
    placeholderData: (previous) => previous,
  })
  const raw = query.data ?? EMPTY
  const counts: AttentionCounts = {
    attendance: can('classroom.attendance.edit') ? raw.attendance : 0,
    receipts: can('finance.receipts.approve') ? raw.receipts : 0,
    grades: can('classroom.grades.publish') ? raw.grades : 0,
    importErrors: can('people.import.create') ? raw.importErrors : 0,
    guardians: can('people.guardians.approve') ? raw.guardians : 0,
  }
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
  return { ...query, counts, total }
}
