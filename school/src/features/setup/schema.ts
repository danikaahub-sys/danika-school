import { z } from 'zod'

export const yearSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  active: z.boolean(),
})

export const classSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  gradeId: z.string(),
})
