import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/hooks/use-session'
import { api } from '@/lib/api-client'
import { classLabelFrom, isoDate, lower, mapPerson, personName } from '@/lib/api-map'
import type {
  AttendanceRow,
  AttendanceStatus,
  DisciplineNote,
  Homework,
  Person,
  SchoolClass,
  Score,
  TeachingSession,
} from '@/mocks'

type SessionRow = TeachingSession & {
  assignment?: {
    classId: string
    subjectId: string
    teacherPersonId: string
    class?: { name?: string; grade?: { name?: string } }
  }
  attendance?: AttendanceRow[]
}

export type LabeledClass = SchoolClass & { label: string }

export type NamedAttendance = AttendanceRow & { studentName: string }
export type NamedStaffDay = {
  personId: string
  date: string
  status: AttendanceStatus
  personName: string
}

function mapSession(row: SessionRow): TeachingSession & { classLabel: string } {
  const classId = row.classId ?? row.assignment?.classId ?? ''
  return {
    id: row.id,
    classId,
    subjectId: row.subjectId ?? row.assignment?.subjectId ?? '',
    teacherId: row.teacherId ?? row.assignment?.teacherPersonId ?? '',
    date: isoDate(row.date),
    periodId: row.periodId,
    status: lower(String(row.status)),
    note: row.note,
    classLabel: classLabelFrom(row.assignment?.class?.grade, row.assignment?.class?.name) || classId,
  }
}

function mapHomework(row: Homework & { dueOn?: string }): Homework {
  return {
    id: row.id,
    classId: row.classId,
    subjectId: row.subjectId,
    title: row.title,
    due: isoDate(row.dueOn ?? row.due),
    published: Boolean(row.published),
  }
}

function mapScore(
  row: Score & { student?: { firstName?: string; lastName?: string }; assessment?: { title?: string } }
): Score & { studentName: string } {
  return {
    id: row.id,
    studentId: row.studentId,
    subjectId: row.subjectId,
    title: row.title ?? row.assessment?.title ?? '',
    earned: row.earned == null ? null : Number(row.earned),
    maximum: Number(row.maximum),
    weight: Number(row.weight ?? 1),
    status: lower(String(row.status)),
    studentName: personName(row.student),
  }
}

export function useClasses() {
  const { actorId, role } = useSession()
  return useQuery({
    queryKey: ['classes', actorId, role],
    queryFn: async () => {
      const rows = await api<Array<SchoolClass & { grade?: { name: string } }>>(
        '/school/classroom/classes'
      )
      return rows.map(
        (item): LabeledClass => ({
          id: item.id,
          name: item.name,
          gradeId: item.gradeId,
          label: classLabelFrom(item.grade, item.name) || item.name,
        })
      )
    },
  })
}

export function useClassWorkspace(classId: string) {
  return useQuery({
    queryKey: ['class', classId],
    enabled: Boolean(classId),
    queryFn: async () => {
      const data = await api<{
        schoolClass: SchoolClass & { grade?: { name: string } }
        sessions: SessionRow[]
        attendance: AttendanceRow[]
        homework: Array<Homework & { dueOn?: string }>
        discipline: Array<DisciplineNote & { student?: { firstName?: string; lastName?: string } }>
        roster: Array<Record<string, unknown>>
        scores: Array<Score & { student?: { firstName?: string; lastName?: string } }>
      }>(`/school/classroom/classes/${classId}`)
      const roster: Person[] = (data.roster ?? []).map(mapPerson)
      return {
        schoolClass: data.schoolClass,
        classLabel: classLabelFrom(data.schoolClass.grade, data.schoolClass.name),
        sessions: data.sessions.map(mapSession),
        attendance: data.attendance.map((row) => ({
          ...row,
          status: lower<AttendanceStatus>(String(row.status)),
        })),
        homework: data.homework.map(mapHomework),
        discipline: data.discipline.map((item) => ({
          ...item,
          date: isoDate(item.date),
          studentName: personName(item.student),
        })),
        scores: data.scores.map(mapScore),
        roster,
        subjects: [],
      }
    },
  })
}

export function useSchoolAttendance() {
  return useQuery({
    queryKey: ['attendance-school'],
    queryFn: async () => {
      const data = await api<{
        sessions: SessionRow[]
        attendance: Array<AttendanceRow & { student?: { firstName?: string; lastName?: string } }>
        staffAttendance: Array<{
          personId: string
          date: string
          status: string
          person?: { firstName?: string; lastName?: string }
        }>
        followUp: Array<AttendanceRow & { student?: { firstName?: string; lastName?: string } }>
      }>('/school/classroom/attendance')
      return {
        sessions: data.sessions.map(mapSession),
        attendance: data.attendance.map(
          (row): NamedAttendance => ({
            ...row,
            status: lower<AttendanceStatus>(String(row.status)),
            studentName: personName(row.student),
          })
        ),
        staffAttendance: data.staffAttendance.map(
          (row): NamedStaffDay => ({
            personId: row.personId,
            date: isoDate(row.date),
            status: lower<AttendanceStatus>(String(row.status)),
            personName: personName(row.person),
          })
        ),
        followUp: data.followUp.map(
          (row): NamedAttendance => ({
            ...row,
            status: lower<AttendanceStatus>(String(row.status)),
            studentName: personName(row.student),
          })
        ),
      }
    },
  })
}

export function useResults() {
  return useQuery({
    queryKey: ['classroom-results'],
    queryFn: async () => {
      const rows = await api<
        Array<Score & { student?: { firstName?: string; lastName?: string }; assessment?: { title?: string } }>
      >('/school/classroom/results')
      return rows.map(mapScore)
    },
  })
}

export function useSubmitAttendance() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      sessionId: string
      rows: Array<{ studentId: string; status: string }>
    }) => {
      await api(`/school/classroom/sessions/${input.sessionId}/attendance`, {
        method: 'PUT',
        body: JSON.stringify({
          rows: input.rows.map((row) => ({
            studentId: row.studentId,
            status: row.status.toUpperCase(),
          })),
        }),
      })
      return api(`/school/classroom/sessions/${input.sessionId}/submit`, {
        method: 'POST',
      })
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['attendance-school'] })
      client.invalidateQueries({ queryKey: ['class'] })
    },
  })
}
