import { z } from 'zod'

export const attentionSchema = z.object({
  attendance: z.number().int().nonnegative(),
  receipts: z.number().int().nonnegative(),
  grades: z.number().int().nonnegative(),
  importErrors: z.number().int().nonnegative(),
  guardians: z.number().int().nonnegative(),
})
