import { z } from 'zod'

export const personDraftSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nationalId: z.string().optional(),
  phone: z.string().optional(),
  classId: z.string().optional(),
})
