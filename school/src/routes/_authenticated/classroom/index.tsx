import { createFileRoute } from '@tanstack/react-router'
import { ClassroomHome } from '@/features/classroom'
import { assertPermission } from '@/features/access/guard'

export const Route = createFileRoute('/_authenticated/classroom/')({
  beforeLoad: () => assertPermission('classroom.workspace.view'),
  component: ClassroomHome,
})
