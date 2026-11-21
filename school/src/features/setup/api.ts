import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { isoDate } from '@/lib/api-map'
import type { Assignment, BellPeriod, Closure, Grade, SchoolClass, Subject, TimetableCell } from '@/mocks'
import { classSchema, yearSchema } from './schema'

export type SetupAssignment = Assignment & { teacherName: string }

export function useSetup() {
  return useQuery({
    queryKey: ['setup'],
    queryFn: async () => {
      const data = await api<{
        years: Array<{ id: string; label: string; active: boolean }>
        grades: Grade[]
        classes: SchoolClass[]
        subjects: Subject[]
        assignments: SetupAssignment[]
        periods: BellPeriod[]
        timetable: TimetableCell[]
        closures: Closure[]
      }>('/school/setup')
      return {
        years: data.years.map((year) => yearSchema.parse(year)),
        grades: data.grades,
        classes: data.classes.map((item) => classSchema.parse(item)),
        subjects: data.subjects,
        assignments: data.assignments,
        periods: data.periods,
        timetable: data.timetable,
        closures: data.closures.map((item) => ({
          ...item,
          date: isoDate(item.date),
        })),
      }
    },
  })
}

export function useActivateYear() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api(`/school/setup/years/${id}/activate`, { method: 'PUT' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['setup'] }),
  })
}
