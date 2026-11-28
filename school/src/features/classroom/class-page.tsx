import { useState } from 'react'
import { toast } from 'sonner'
import { t } from '@/i18n/t'
import { formatJalali } from '@/lib/date'
import { formatScore, toFaDigits } from '@/lib/fa-text'
import { displayName, type AttendanceStatus } from '@/mocks'
import { useSession } from '@/hooks/use-session'
import { PageHeader } from '@/components/page-header'
import { QueryGate } from '@/components/query-gate'
import { SimpleTable } from '@/components/simple-table'
import { StatCard } from '@/components/stat-card'
import {
  AttendanceBadge,
  PublishBadge,
  ScoreBadge,
  SessionBadge,
} from '@/components/status-badge'
import { SearchTabs } from '@/components/search-tabs'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
          <div className='mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <StatCard title={t('people.students')} value={toFaDigits(roster.length)} />
            <StatCard
              title={t('classroom.session')}
              value={toFaDigits(query.data.sessions.length)}
              hint={`${t('classroom.submitted')}: ${toFaDigits(
                query.data.sessions.filter((item) => item.status === 'submitted').length
              )}`}
            />
            <StatCard
              title={t('classroom.homework')}
              value={toFaDigits(query.data.homework.length)}
            />
            <StatCard
              title={t('classroom.gradebook')}
              value={toFaDigits(query.data.scores.length)}
              hint={`${t('common.publish')}: ${toFaDigits(
                query.data.scores.filter((item) => item.status === 'published').length
              )}`}
            />
          </div>
        ) : null}
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
            <TabsContent value='session'>
              <SimpleTable
                columns={[t('people.date'), t('people.status'), t('classroom.notes')]}
                rows={query.data.sessions.map((item) => [
                  item.date ? formatJalali(item.date) : '—',
                  <SessionBadge key={item.id} status={item.status} />,
                  item.note || '—',
                ])}
                empty={t('empty.attendance')}
              />
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
                      <AttendanceBadge key={student.id} status={current} />
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
              <div className='max-w-2xl rounded-xl border bg-card p-4 text-sm'>
                {session?.date ? (
                  <p className='mb-2 text-xs text-muted-foreground'>{formatJalali(session.date)}</p>
                ) : null}
                <p className={session?.note ? undefined : 'text-muted-foreground'}>
                  {session?.note ?? t('common.empty')}
                </p>
              </div>
            </TabsContent>
            <TabsContent value='homework'>
              <SimpleTable
                columns={[t('classroom.homework'), t('classroom.due'), t('people.status')]}
                rows={(query.data?.homework ?? [])
                  .filter((item) => canEdit || item.published)
                  .map((item) => [
                    item.title,
                    item.due ? formatJalali(item.due) : '—',
                    <PublishBadge key={item.id} published={item.published} />,
                  ])}
              />
            </TabsContent>
            <TabsContent value='discipline'>
              <SimpleTable
                columns={[t('people.name'), t('classroom.discipline'), t('people.date')]}
                rows={(query.data?.discipline ?? []).map((item) => [
                  item.studentName || item.studentId,
                  item.title,
                  item.date ? formatJalali(item.date) : '—',
                ])}
              />
            </TabsContent>
            <TabsContent value='gradebook'>
              <SimpleTable
                columns={[
                  t('people.name'),
                  t('people.assessment'),
                  t('classroom.gradebook'),
                  t('people.status'),
                ]}
                rows={(query.data?.scores ?? [])
                  .filter((item) => canEdit || item.status === 'published')
                  .map((item) => [
                    item.studentName || item.studentId,
                    item.title || '—',
                    formatScore(item.earned, item.maximum),
                    <ScoreBadge key={item.id} status={item.status} />,
                  ])}
              />
            </TabsContent>
          </SearchTabs>
        ) : null}
      </QueryGate>
    </Main>
  )
}
