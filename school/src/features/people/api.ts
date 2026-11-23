import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type AttendanceRow, type Charge, type GuardianLink, type Person, type PersonKind, type Score } from '@/mocks'
import { api } from '@/lib/api-client'
import { classLabelFrom, isoDate, lower, mapPerson, money, num, personName } from '@/lib/api-map'

export type DirectoryPerson = Person & { classLabel: string }

export type PersonLink = GuardianLink & {
  otherName: string
  otherPhone?: string
}

export type PersonAttendance = AttendanceRow & {
  id?: string
  date?: string
}

export type PersonScore = Score & {
  updatedAt?: string
}

export type PersonCharge = Charge & {
  dueOn?: string
}

export type PersonSummary = {
  guardians: number
  attendanceTotal: number
  present: number
  absent: number
  scoresTotal: number
  scoresPublished: number
  chargesTotal: number
  chargesAmountIrr: number
}

export type PersonDetail = {
  person: Person
  name: string
  className: string
  gradeName: string
  classOnly: string
  enrollment: {
    id: string
    classId: string
    yearId: string
    className: string
    gradeName: string
    classOnly: string
  } | null
  links: PersonLink[]
  attendance: PersonAttendance[]
  scores: PersonScore[]
  charges: PersonCharge[]
  summary: PersonSummary
}

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
    queryFn: async (): Promise<PersonDetail> => {
      const data = await api<{
        person: Record<string, unknown>
        name: string
        className: string
        gradeName?: string
        classOnly?: string
        enrollment?: {
          id: string
          classId: string
          yearId: string
          className: string
          gradeName: string
          classOnly: string
        } | null
        links: Array<
          GuardianLink & {
            verified?: boolean
            verifiedAt?: string
            student?: { firstName?: string; lastName?: string; phone?: string }
            guardian?: { firstName?: string; lastName?: string; phone?: string }
          }
        >
        attendance: Array<AttendanceRow & { id?: string; date?: string; updatedAt?: string }>
        scores: Array<Score & { updatedAt?: string }>
        charges: Array<Charge & { dueOn?: string }>
        summary?: Partial<PersonSummary> & { chargesAmountIrr?: string | number }
      }>(`/school/people/${id}`)

      const links = (data.links ?? []).map((link) => {
        const other = link.guardianId === id ? link.student : link.guardian
        return {
          ...link,
          verified: Boolean(link.verified ?? link.verifiedAt),
          otherName: personName(other) || (link.guardianId === id ? link.studentId : link.guardianId),
          otherPhone: other?.phone,
        }
      })
      const attendance = (data.attendance ?? []).map((row) => ({
        ...row,
        status: lower(String(row.status)) as AttendanceRow['status'],
        date: isoDate(row.date ?? row.updatedAt),
      }))
      const scores = (data.scores ?? []).map((item) => ({
        ...item,
        title: String(item.title ?? ''),
        status: lower(String(item.status)) as Score['status'],
        earned: num(item.earned),
        maximum: num(item.maximum) ?? 0,
        weight: num(item.weight) ?? 0,
        updatedAt: isoDate(item.updatedAt),
      }))
      const charges = (data.charges ?? []).map((item) => ({
        ...item,
        amountIrr: money(item.amountIrr),
        dueOn: isoDate(item.dueOn),
      }))
      const summary = data.summary
      return {
        person: mapPerson(data.person),
        name: data.name,
        className: data.className ?? '',
        gradeName: data.gradeName ?? '',
        classOnly: data.classOnly ?? '',
        enrollment: data.enrollment ?? null,
        links,
        attendance,
        scores,
        charges,
        summary: {
          guardians: summary?.guardians ?? links.length,
          attendanceTotal: summary?.attendanceTotal ?? attendance.length,
          present: summary?.present ?? attendance.filter((row) => row.status === 'present').length,
          absent: summary?.absent ?? attendance.filter((row) => row.status === 'absent').length,
          scoresTotal: summary?.scoresTotal ?? scores.length,
          scoresPublished:
            summary?.scoresPublished ?? scores.filter((row) => row.status === 'published').length,
          chargesTotal: summary?.chargesTotal ?? charges.length,
          chargesAmountIrr: money(summary?.chargesAmountIrr ?? charges.reduce((sum, c) => sum + c.amountIrr, 0)),
        },
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
