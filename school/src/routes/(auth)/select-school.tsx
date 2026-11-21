import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { SelectSchool } from '@/features/auth/select-school'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/select-school')({
  validateSearch: searchSchema,
  component: () => {
    const { redirect } = Route.useSearch()
    return <SelectSchool redirectTo={redirect} />
  },
})
