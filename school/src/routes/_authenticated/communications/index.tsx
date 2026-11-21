import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { CommunicationsPage } from '@/features/communications'
import { assertPermission } from '@/features/access/guard'

export const Route = createFileRoute('/_authenticated/communications/')({
  validateSearch: z.object({ tab: z.string().optional() }),
  beforeLoad: () => assertPermission('communications.compose.view'),
  component: CommunicationsPage,
})
