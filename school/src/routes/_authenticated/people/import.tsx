import { createFileRoute } from '@tanstack/react-router'
import { ImportPage } from '@/features/people/import-page'
import { assertPermission } from '@/features/access/guard'

export const Route = createFileRoute('/_authenticated/people/import')({
  beforeLoad: () => assertPermission('people.import.view'),
  component: ImportPage,
})
