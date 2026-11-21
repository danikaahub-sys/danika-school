import { z } from 'zod'

export const receiptSchema = z.object({
  studentId: z.string(),
  amountIrr: z.number().int().positive(),
  ref: z.string().min(1),
})
