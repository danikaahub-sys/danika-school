import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type AttendanceRow, type Charge, type GuardianLink, type Person, type PersonKind, type Score } from '@/mocks'
import { api } from '@/lib/api-client'
import { classLabelFrom, lower, mapPerson, money, num, personName } from '@/lib/api-map'

export type DirectoryPerson = Person & { classLabel: string }

export function usePeople(kind?: PersonKind, search = '', enabled = true) {
  return useQuery({
    queryKey: ['people', kind, search],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', limit: '100' })
      if (kind) params.set('kind', kind.toUpperCase())
      if (search) params.set('search', search)
      const data = await api<{
        items: Array<
          Record<string, unknown> & {
            enrollments?: Array<{ class?: { name?: string; grade?: { name?: string } } }>
          }
        >
      }>(`/school/people?${params}`)
      return data.items.map((row): DirectoryPerson => {
        const enrollment = row.enrollments?.[0]
        return {
          ...mapPerson(row),
          classLabel: classLabelFrom(enrollment?.class?.grade, enrollment?.class?.name),
        }
      })
    },
  })
}

export function usePerson(id: string) {
  return useQuery({
    queryKey: ['person', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const data = await api<{
        person: Record<string, unknown>
        name: string
        className: string
        links: Array<
          GuardianLink & {
            verified?: boolean
            verifiedAt?: string
            student?: { firstName?: string; lastName?: string }
            guardian?: { firstName?: string; lastName?: string }
          }
        >
        attendance: AttendanceRow[]
        scores: Score[]
        charges: Charge[]
      }>(`/school/people/${id}`)
      return {
        ...data,
        person: mapPerson(data.person),
        links: data.links.map((link) => ({
          ...link,
          verified: Boolean(link.verified ?? link.verifiedAt),
          otherName:
            personName(link.guardianId === id ? link.student : link.guardian) ||
            (link.guardianId === id ? link.studentId : link.guardianId),
        })),
        attendance: data.attendance.map((row) => ({
          ...row,
          status: lower(String(row.status)) as AttendanceRow['status'],
        })),
        scores: data.scores.map((item) => ({
          ...item,
          status: lower(String(item.status)) as Score['status'],
          earned: num(item.earned),
          maximum: num(item.maximum) ?? 0,
        })),
        charges: data.charges.map((item) => ({
          ...item,
          amountIrr: money(item.amountIrr),
        })),
      }
    },
  })
}

export function useCreatePerson() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/school/people', {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          kind: String(body.kind ?? 'STUDENT').toUpperCase(),
        }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['people'] }),
  })
}
