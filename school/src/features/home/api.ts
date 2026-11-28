import { useQuery } from '@tanstack/react-query'
import { attentionSchema } from '@/features/home/schema'
import {
  isOverviewActivityEmpty,
  sampleOverviewActivity,
} from '@/features/home/sample-overview'
import { useSession } from '@/hooks/use-session'
import { api } from '@/lib/api-client'
import { classLabelFrom, isoDate, lower, money, num } from '@/lib/api-map'
import type { Announcement, Homework, Score, TeachingSession } from '@/mocks'

export function useHome() {
  const { actorId, role } = useSession()
  return useQuery({
    queryKey: ['home', actorId, role],
    queryFn: async () => {
      const data = await api<{
        attention: unknown
        sessions: Array<
          TeachingSession & {
            assignment?: {
              classId: string
              subjectId: string
              teacherPersonId: string
              class?: { name?: string; grade?: { name?: string } }
              subject?: { name?: string }
            }
            period?: { name?: string }
          }
        >
        homework: Array<Homework & { dueOn?: string }>
        notices: Announcement[]
        grades: Array<
          Score & { assessment?: { title: string; maximum?: number | string } }
        >
        className?: string
        teacherClasses?: Array<{ id: string; name: string; gradeId: string; label: string }>
      }>('/school/dashboard/home')
      return {
        attention: attentionSchema.parse(data.attention),
        sessions: data.sessions.map((item) => ({
          id: item.id,
          classId: item.classId ?? item.assignment?.classId ?? '',
          subjectId: item.subjectId ?? item.assignment?.subjectId ?? '',
          teacherId: item.teacherId ?? item.assignment?.teacherPersonId ?? '',
          date: isoDate(item.date),
          periodId: item.periodId,
          status: lower<TeachingSession['status']>(String(item.status)),
          note: item.note,
          classLabel:
            classLabelFrom(item.assignment?.class?.grade, item.assignment?.class?.name) ||
            item.classId ||
            item.assignment?.classId ||
            '',
          subjectName: item.assignment?.subject?.name ?? '',
          periodName: item.period?.name ?? '',
        })),
        homework: data.homework.map((item) => ({
          ...item,
          due: isoDate(item.dueOn ?? item.due),
        })),
        notices: data.notices.map((item) => ({
          ...item,
          channel: lower<Announcement['channel']>(String(item.channel)),
          sentAt: isoDate(item.sentAt),
          audience:
            typeof item.audience === 'string'
              ? item.audience
              : JSON.stringify(item.audience ?? ''),
        })),
        grades: data.grades.map((item) => ({
          ...item,
          title: item.title ?? item.assessment?.title ?? '',
          status: lower<Score['status']>(String(item.status)),
          earned: num(item.earned),
          maximum: num(item.maximum ?? item.assessment?.maximum) ?? 0,
        })),
        className: data.className ?? '',
        teacherClasses: data.teacherClasses ?? [],
        peopleById: {} as Record<string, string>,
        subjects: [] as Array<{ id: string; name: string }>,
      }
    },
  })
}

export type OverviewRange = 'day' | 'week' | 'month'

export function useOverview(range: OverviewRange = 'day') {
  const { actorId, yearId } = useSession()
  return useQuery({
    queryKey: ['overview', actorId, yearId, range],
    queryFn: async () => {
      const data = await api<{
        range: { key: OverviewRange; from: string; to: string; label: string }
        headcount: { students: number; staff: number; classes: number }
        attendance: {
          present: number
          absent: number
          late: number
          excused: number
          unmarked: number
          rate: number
          prevRate: number
          prevAbsent: number
        }
        sessions: {
          total: number
          submitted: number
          pending: number
          prevTotal: number
          prevSubmitted: number
        }
        staff: { present: number; absent: number }
        finance: {
          collectedIrr: string
          prevCollectedIrr: string
          postedCount: number
          pendingCount: number
          pendingIrr: string
        }
        activity: { homeworkDue: number; announcementsSent: number }
        absencesByClass: Array<{ classId: string; label: string; absent: number }>
        trend: Array<{ date: string; attendanceRate: number; collectedIrr: string }>
      }>(`/school/dashboard/overview?range=${range}`)
      const mapped = {
        ...data,
        finance: {
          ...data.finance,
          collectedIrr: money(data.finance.collectedIrr),
          prevCollectedIrr: money(data.finance.prevCollectedIrr),
          pendingIrr: money(data.finance.pendingIrr),
        },
        trend: data.trend.map((row) => ({
          date: row.date,
          attendanceRate: Number(row.attendanceRate) || 0,
          collectedIrr: money(row.collectedIrr),
        })),
      }
      // Live seed often has headcount but no activity for "today" — fill UI in DEV.
      if (import.meta.env.DEV && isOverviewActivityEmpty(mapped)) {
        const sample = sampleOverviewActivity(mapped.range)
        return {
          ...mapped,
          ...sample,
          range: mapped.range,
          headcount: mapped.headcount,
          sample: true as const,
        }
      }
      return { ...mapped, sample: false as const }
    },
  })
}

export function useGradeDistribution() {
  const { actorId, yearId } = useSession()
  return useQuery({
    queryKey: ['stats', 'grades', actorId, yearId],
    queryFn: async () => {
      const data = await api<{
        A: number
        B: number
        C: number
        D: number
        F: number
      }>('/school/stats/grades/distribution')
      return data
    },
  })
}

export function useEnrollmentSeries() {
  const { actorId, yearId } = useSession()
  return useQuery({
    queryKey: ['stats', 'enrollment', actorId, yearId],
    queryFn: async () => {
      const rows = await api<
        Array<{ classId: string; label: string; count: number }>
      >('/school/stats/enrollment')
      return rows.map((row) => ({
        id: row.classId,
        label: row.label,
        value: row.count,
      }))
    },
  })
}
