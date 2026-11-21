import { z } from 'zod'
import { BASE_ROLES } from '@/features/access/permissions'

export const positionSchema = z.object({
  name: z.string().min(1),
  baseRole: z.enum(BASE_ROLES),
})
