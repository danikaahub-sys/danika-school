import { createFileRoute } from '@tanstack/react-router'
import { ActivateAccount } from '@/features/auth/activate'

export const Route = createFileRoute('/(auth)/activate')({
  component: ActivateAccount,
})
