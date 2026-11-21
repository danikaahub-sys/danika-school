import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { t } from '@/i18n/t'
import { faIncludes } from '@/lib/fa-text'
import { displayName, type PersonKind } from '@/mocks'
import { PageHeader } from '@/components/page-header'
import { FilterBar } from '@/components/filter-bar'
import { QueryGate } from '@/components/query-gate'
import { SimpleTable } from '@/components/simple-table'
import { ExportToolbar } from '@/components/data-table/export-toolbar'
import { SearchTabs } from '@/components/search-tabs'
import { Main } from '@/components/layout/main'
import { Can } from '@/components/can'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useCreatePerson, usePeople, type DirectoryPerson } from './api'
import { personDraftSchema } from './schema'

const TABS: { id: string; kind: PersonKind; label: 'people.students' | 'people.staff' | 'people.guardians' }[] = [
  { id: 'students', kind: 'student', label: 'people.students' },
  { id: 'staff', kind: 'staff', label: 'people.staff' },
  { id: 'guardians', kind: 'guardian', label: 'people.guardians' },
]

export function PeoplePage({ tab, create }: { tab?: string; create?: boolean }) {
  const [open, setOpen] = useState(!!create)

  return (
    <Main>
      <PageHeader
        title={t('people.title')}
        description={t('people.desc')}
        audience={`${t('role.principal')}، ${t('role.deputy')}`}
        actions={
          <Can permission='people.directory.create'>
            <Button className='min-h-11' onClick={() => setOpen(true)}>
              {t('people.addStudent')}
            </Button>
          </Can>
        }
      />
      <SearchTabs defaultValue={tab ?? 'students'}>
        <TabsList>
          {TABS.map((item) => (
            <TabsTrigger key={item.id} value={item.id}>
              {t(item.label)}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((item) => (
          <TabsContent key={item.id} value={item.id}>
            <PeopleTable kind={item.kind} />
          </TabsContent>
        ))}
      </SearchTabs>
      <AddStudentDialog open={open} onOpenChange={setOpen} />
    </Main>
  )
}

function PeopleTable({ kind }: { kind: PersonKind }) {
  const query = usePeople(kind)
  const [q, setQ] = useState('')
  const rows = useMemo(() => {
    const list = query.data ?? []
    return list.filter((person) =>
      faIncludes(`${displayName(person)} ${person.nationalId ?? ''} ${person.phone ?? ''}`, q)
    )
  }, [query.data, q])

  return (
    <QueryGate query={query}>
      <FilterBar>
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={t('common.search')}
          className='max-w-xs min-h-11'
        />
        <ExportToolbar entityName={t('table.entity.person')} />
      </FilterBar>
      <SimpleTable
        columns={[t('people.name'), t('people.nationalId'), t('people.phone'), t('people.class'), t('people.status'), '']}
        rows={rows.map((person) => personRow(person))}
        empty={t('empty.search')}
      />
    </QueryGate>
  )
}

function personRow(person: DirectoryPerson): React.ReactNode[] {
  return [
    displayName(person),
    person.nationalId ?? '—',
    person.phone ?? '—',
    person.classLabel || '—',
    t(`people.status.${person.status}`),
    <Button key={person.id} asChild size='sm' variant='outline' className='min-h-11'>
      <Link to='/people/$personId' params={{ personId: person.id }}>
        {t('common.view')}
      </Link>
    </Button>,
  ]
}

function AddStudentDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const create = useCreatePerson()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('people.addStudent')}</DialogTitle>
        </DialogHeader>
        <div className='grid gap-3'>
          <div className='grid gap-2'>
            <Label>{t('people.firstName')}</Label>
            <Input className='min-h-11' value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </div>
          <div className='grid gap-2'>
            <Label>{t('people.lastName')}</Label>
            <Input className='min-h-11' value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </div>
          <Button
            className='min-h-11'
            onClick={() => {
              const parsed = personDraftSchema.safeParse({ firstName, lastName })
              if (!parsed.success) {
                toast.error(t('common.error'))
                return
              }
              create.mutate(
                { kind: 'STUDENT', firstName: parsed.data.firstName, lastName: parsed.data.lastName },
                {
                  onSuccess: () => {
                    toast.success(t('toast.saved'))
                    onOpenChange(false)
                  },
                  onError: () => toast.error(t('common.error')),
                }
              )
            }}
          >
            {t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
