import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { isoDate, lower, money, personName } from '@/lib/api-map'
import type { Charge, Receipt, TuitionPlan } from '@/mocks'

type NamedPlan = TuitionPlan & { gradeName: string }
type NamedCharge = Charge & { studentName: string }
type NamedReceipt = Receipt & { studentName: string }

export function useFinance() {
  return useQuery({
    queryKey: ['finance'],
    queryFn: async () => {
      const [plans, charges, receipts] = await Promise.all([
        api<Array<TuitionPlan & { grade?: { name?: string } }>>('/school/finance/plans'),
        api<{
          items: Array<Charge & { student?: { firstName?: string; lastName?: string } }>
        }>('/school/finance/charges?page=1&limit=100'),
        api<{
          items: Array<Receipt & { student?: { firstName?: string; lastName?: string } }>
        }>('/school/finance/receipts?page=1&limit=100'),
      ])
      return {
        tuitionPlans: plans.map(
          (plan): NamedPlan => ({
            ...plan,
            amountIrr: money(plan.amountIrr),
            gradeName: plan.grade?.name ?? '',
          })
        ),
        charges: charges.items.map(
          (item): NamedCharge => ({
            ...item,
            amountIrr: money(item.amountIrr),
            studentName: personName(item.student),
          })
        ),
        receipts: receipts.items.map(
          (item): NamedReceipt => ({
            ...item,
            amountIrr: money(item.amountIrr),
            status: lower<Receipt['status']>(String(item.status)),
            date: isoDate(item.date),
            studentName: personName(item.student),
          })
        ),
      }
    },
  })
}

export function useLedger(studentId: string) {
  return useQuery({
    queryKey: ['ledger', studentId],
    enabled: Boolean(studentId),
    queryFn: async () => {
      const data = await api<{
        studentName: string
        charges: Charge[]
        receipts: Receipt[]
        balance: string
      }>(`/school/finance/ledger/${studentId}`)
      return {
        studentName: data.studentName,
        charges: data.charges.map((item) => ({
          ...item,
          amountIrr: money(item.amountIrr),
        })),
        receipts: data.receipts.map((item) => ({
          ...item,
          amountIrr: money(item.amountIrr),
          status: lower<Receipt['status']>(String(item.status)),
        })),
      }
    },
  })
}

export function useApproveReceipt() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api(`/school/finance/receipts/${id}/approve`, { method: 'POST' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['finance'] }),
  })
}
