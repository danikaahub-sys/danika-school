import { z } from 'zod'

export const messageSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  channel: z.enum(['app', 'sms', 'both']),
})
