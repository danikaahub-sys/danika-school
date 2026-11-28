import { Link } from '@tanstack/react-router'
import { t } from '@/i18n/t'
import { formatJalali } from '@/lib/date'
import { toFaDigits } from '@/lib/fa-text'
import { PageHeader } from '@/components/page-header'
import { QueryGate } from '@/components/query-gate'
import { StatCard } from '@/components/stat-card'
import { SimpleTable } from '@/components/simple-table'
import { AttendanceBadge, SessionBadge } from '@/components/status-badge'
import { SearchTabs } from '@/components/search-tabs'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSetup } from '@/features/setup/api'
import { useSchoolAttendance } from './api'

const MISSING = '—'

export function SchoolAttendancePage() {
  const query = useSchoolAttendance()
  const setup = useSetup()
  const sessions = query.data?.sessions ?? []
  const sessionById = new Map(sessions.map((session) => [session.id, session]))
  const present = query.data?.attendance.filter((row) => row.status === 'present').length ?? 0
  const absent = query.data?.attendance.filter((row) => row.status === 'absent').length ?? 0
  const unmarked = query.data?.attendance.filter((row) => row.status === 'unmarked').length ?? 0

  const periodName = (id: string) =>
    setup.data?.periods.find((period) => period.id === id)?.name ?? MISSING
  const subjectName = (id: string) =>
    setup.data?.subjects.find((subject) => subject.id === id)?.name ?? MISSING
  const dateLabel = (date?: string) => (date ? formatJalali(date) : MISSING)

  return (
    <Main>
      <PageHeader
        title={t('classroom.schoolAttendance')}
        description={t('classroom.desc')}
        audience={`${t('role.principal')}، ${t('role.deputy')}`}
      />
      <QueryGate query={query}>
        <div className='mb-6 grid gap-3 sm:grid-cols-3'>
          <StatCard title={t('classroom.present')} value={toFaDigits(present)} />
          <StatCard
            title={t('classroom.absent')}
            value={toFaDigits(absent)}
            tone={absent > 0 ? 'bad' : 'default'}
          />
          <StatCard
            title={t('classroom.unmarked')}
            value={toFaDigits(unmarked)}
            tone={unmarked > 0 ? 'warn' : 'default'}
          />
        </div>
        <SearchTabs defaultValue='daily'>
          <TabsList className='mb-4 h-auto flex-wrap'>
            <TabsTrigger value='daily'>{t('classroom.schoolAttendance')}</TabsTrigger>
            <TabsTrigger value='staff'>{t('classroom.staffAttendance')}</TabsTrigger>
            <TabsTrigger value='follow'>{t('classroom.followUp')}</TabsTrigger>
          </TabsList>
          <TabsContent value='daily'>
            <SimpleTable
              columns={[
                t('setup.classes'),
                t('people.date'),
                t('classroom.period'),
                t('setup.subjects'),
                t('classroom.presentAbsent'),
                t('people.status'),
                '',
              ]}
              rows={sessions.map((session) => [
                session.classLabel,
                dateLabel(session.date),
                periodName(session.periodId),
                subjectName(session.subjectId),
                <span key={`${session.id}-count`} className='tabular-nums'>
                  {toFaDigits(session.presentCount)} / {toFaDigits(session.absentCount)}
                </span>,
                <SessionBadge key={`${session.id}-status`} status={session.status} />,
                <Button key={session.id} asChild size='sm' variant='outline' className='min-h-11'>
                  <Link
                    to='/classroom/$classId'
                    params={{ classId: session.classId }}
                    search={{ tab: 'attendance' }}
                  >
                    {t('common.view')}
                  </Link>
                </Button>,
              ])}
            />
          </TabsContent>
          <TabsContent value='staff'>
            <SimpleTable
              columns={[t('people.name'), t('people.date'), t('people.status')]}
              rows={(query.data?.staffAttendance ?? []).map((row) => [
                row.personName || row.personId,
                dateLabel(row.date),
                <AttendanceBadge key={`${row.personId}-${row.date}`} status={row.status} />,
              ])}
            />
          </TabsContent>
          <TabsContent value='follow'>
            <SimpleTable
              columns={[
                t('people.name'),
                t('setup.classes'),
                t('people.date'),
                t('classroom.attendance'),
              ]}
              rows={(query.data?.followUp ?? []).map((row) => {
                const session = sessionById.get(row.sessionId)
                return [
                  row.studentName || row.studentId,
                  session?.classLabel ?? MISSING,
                  dateLabel(session?.date),
                  <AttendanceBadge key={`${row.sessionId}-${row.studentId}`} status={row.status} />,
                ]
              })}
            />
          </TabsContent>
        </SearchTabs>
      </QueryGate>
    </Main>
  )
}
