import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/features/home'
import { assertPermission } from '@/features/access/guard'

export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: () => assertPermission('home.dashboard.view'),
  component: HomePage,
})
