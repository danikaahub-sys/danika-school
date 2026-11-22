import { useQuery } from '@tanstack/react-query'
import { attentionSchema } from '@/features/home/schema'
import { useSession } from '@/hooks/use-session'
import { api } from '@/lib/api-client'
import { classLabelFrom, isoDate, lower, num } from '@/lib/api-map'
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
            }
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
