import { t } from '@/i18n/t'
import { toFaDigits } from '@/lib/fa-text'
import type { AttendanceStatus } from '@/mocks'
import { PageHeader } from '@/components/page-header'
import { QueryGate } from '@/components/query-gate'
import { StatCard } from '@/components/stat-card'
import { SimpleTable } from '@/components/simple-table'
import { SearchTabs } from '@/components/search-tabs'
import { Main } from '@/components/layout/main'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSchoolAttendance } from './api'

function attendanceLabel(status: AttendanceStatus) {
  return t(`classroom.${status}`)
}

export function SchoolAttendancePage() {
  const query = useSchoolAttendance()
  const present = query.data?.attendance.filter((row) => row.status === 'present').length ?? 0
  const absent = query.data?.attendance.filter((row) => row.status === 'absent').length ?? 0
  const unmarked = query.data?.attendance.filter((row) => row.status === 'unmarked').length ?? 0

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
          <StatCard title={t('classroom.absent')} value={toFaDigits(absent)} />
          <StatCard title={t('classroom.unmarked')} value={toFaDigits(unmarked)} />
        </div>
        <SearchTabs defaultValue='daily'>
          <TabsList className='mb-4 flex-wrap'>
            <TabsTrigger value='daily'>{t('classroom.schoolAttendance')}</TabsTrigger>
            <TabsTrigger value='staff'>{t('classroom.staffAttendance')}</TabsTrigger>
            <TabsTrigger value='follow'>{t('classroom.followUp')}</TabsTrigger>
          </TabsList>
          <TabsContent value='daily'>
            <SimpleTable
              columns={[t('setup.classes'), t('people.status')]}
              rows={(query.data?.sessions ?? []).map((session) => [
                session.classLabel,
                session.status === 'submitted' ? t('classroom.submitted') : t('classroom.draft'),
              ])}
            />
          </TabsContent>
          <TabsContent value='staff'>
            <SimpleTable
              columns={[t('people.name'), t('people.status')]}
              rows={(query.data?.staffAttendance ?? []).map((row) => [
                row.personName || row.personId,
                attendanceLabel(row.status),
              ])}
            />
          </TabsContent>
          <TabsContent value='follow'>
            <SimpleTable
              columns={[t('people.name'), t('classroom.attendance')]}
              rows={(query.data?.followUp ?? []).map((row) => [
                row.studentName || row.studentId,
                attendanceLabel(row.status),
              ])}
            />
          </TabsContent>
        </SearchTabs>
      </QueryGate>
    </Main>
  )
}
