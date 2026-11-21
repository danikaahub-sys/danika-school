import { z } from 'zod'

export const attendanceStatusSchema = z.enum([
  'unmarked',
  'present',
  'absent',
  'late',
  'excused',
])

export const attendanceMarkSchema = z.object({
  sessionId: z.string(),
  studentId: z.string(),
  status: attendanceStatusSchema,
})
