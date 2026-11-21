import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { SchoolAttendancePage } from '@/features/classroom/attendance-page'
import { assertPermission } from '@/features/access/guard'

export const Route = createFileRoute('/_authenticated/classroom/attendance')({
  validateSearch: z.object({ tab: z.string().optional() }),
  beforeLoad: () => assertPermission('classroom.attendance.view'),
  component: SchoolAttendancePage,
})
