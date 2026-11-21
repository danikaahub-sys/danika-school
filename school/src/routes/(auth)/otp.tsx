import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Otp } from '@/features/auth/otp'

const searchSchema = z.object({
  phone: z.string().optional(),
  redirect: z.string().optional(),
  purpose: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/otp')({
  validateSearch: searchSchema,
  component: Otp,
})
