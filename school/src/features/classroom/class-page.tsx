import { useState } from 'react'
import { toast } from 'sonner'
import { t } from '@/i18n/t'
import { displayName, type AttendanceStatus } from '@/mocks'
import { useSession } from '@/hooks/use-session'
import { PageHeader } from '@/components/page-header'
import { QueryGate } from '@/components/query-gate'
import { SimpleTable } from '@/components/simple-table'
import { SearchTabs } from '@/components/search-tabs'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useClassWorkspace, useSubmitAttendance } from './api'

const STATUSES: AttendanceStatus[] = ['unmarked', 'present', 'absent', 'late', 'excused']

export function ClassWorkspacePage({ classId, tab }: { classId: string; tab?: string }) {
  const { role, can } = useSession()
  const query = useClassWorkspace(classId)
  const submit = useSubmitAttendance()
  const session = query.data?.sessions[0]
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({})
  const canEdit = can('classroom.attendance.create')
  const roster = query.data?.roster ?? []

  return (
    <Main>
      <PageHeader
        title={query.data?.classLabel || t('classroom.title')}
        description={canEdit ? t('classroom.desc') : t('classroom.readOnly')}
        audience={t(`role.${role}` as 'role.teacher')}
      />
      <QueryGate query={query}>
        {query.data ? (
          <SearchTabs defaultValue={tab ?? 'session'}>
            <TabsList className='mb-4 h-auto flex-wrap'>
              <TabsTrigger value='session'>{t('classroom.session')}</TabsTrigger>
              <TabsTrigger value='attendance'>{t('classroom.attendance')}</TabsTrigger>
              <TabsTrigger value='notes'>{t('classroom.notes')}</TabsTrigger>
              <TabsTrigger value='homework'>{t('classroom.homework')}</TabsTrigger>
              {canEdit ? <TabsTrigger value='discipline'>{t('classroom.discipline')}</TabsTrigger> : null}
              <TabsTrigger value='gradebook'>{t('classroom.gradebook')}</TabsTrigger>
            </TabsList>
            <TabsContent value='session' className='text-sm'>
              {session ? (
                <p>
                  {session.date} — {session.status === 'submitted' ? t('classroom.submitted') : t('classroom.draft')}
                </p>
              ) : (
                t('empty.attendance')
              )}
            </TabsContent>
            <TabsContent value='attendance'>
              <SimpleTable
                columns={[t('people.name'), t('classroom.attendance')]}
                rows={roster.map((student) => {
                  const current =
                    marks[student.id] ??
                    query.data?.attendance.find((row) => row.studentId === student.id)?.status ??
                    'unmarked'
                  return [
                    displayName(student),
                    canEdit ? (
                      <div key={student.id} className='flex flex-wrap gap-1'>
                        {STATUSES.map((status) => (
                          <Button
                            key={status}
                            size='sm'
                            className='min-h-11'
                            variant={current === status ? 'default' : 'outline'}
                            onClick={() => setMarks((prev) => ({ ...prev, [student.id]: status }))}
                          >
                            {t(`classroom.${status}`)}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      t(`classroom.${current}`)
                    ),
                  ]
                })}
              />
              {canEdit && session ? (
                <Button
                  className='mt-4 min-h-11'
                  onClick={() => {
                    submit.mutate(
                      {
                        sessionId: session.id,
                        rows: roster.map((student) => ({
                          studentId: student.id,
                          status: marks[student.id] ?? 'unmarked',
                        })),
                      },
                      {
                        onSuccess: () => toast.success(t('classroom.submitAttendance')),
                        onError: () => toast.error(t('common.error')),
                      }
                    )
                  }}
                >
                  {t('classroom.submitAttendance')}
                </Button>
              ) : null}
            </TabsContent>
            <TabsContent value='notes'>
              <p className='text-sm'>{session?.note ?? t('common.empty')}</p>
            </TabsContent>
            <TabsContent value='homework'>
              <SimpleTable
                columns={[t('classroom.homework'), t('people.status')]}
                rows={(query.data?.homework ?? [])
                  .filter((item) => canEdit || item.published)
                  .map((item) => [
                    item.title,
                    item.published ? t('common.publish') : t('classroom.draft'),
                  ])}
              />
            </TabsContent>
            <TabsContent value='discipline'>
              <SimpleTable
                columns={[t('people.name'), t('classroom.discipline')]}
                rows={(query.data?.discipline ?? []).map((item) => [
                  item.studentName || item.studentId,
                  item.title,
                ])}
              />
            </TabsContent>
            <TabsContent value='gradebook'>
              <SimpleTable
                columns={[t('people.name'), t('classroom.gradebook'), t('people.status')]}
                rows={(query.data?.scores ?? [])
                  .filter((item) => canEdit || item.status === 'published')
                  .map((item) => [
                    item.studentName || item.studentId,
                    item.earned == null ? '—' : `${item.earned}/${item.maximum}`,
                    <Badge key={item.id} variant={item.status === 'published' ? 'secondary' : 'outline'}>
                      {item.status === 'published' ? t('common.publish') : t('classroom.draft')}
                    </Badge>,
                  ])}
              />
            </TabsContent>
          </SearchTabs>
        ) : null}
      </QueryGate>
    </Main>
  )
}
