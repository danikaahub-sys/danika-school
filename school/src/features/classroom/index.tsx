import { Link } from '@tanstack/react-router'
import { t } from '@/i18n/t'
import { weekdayName } from '@/lib/date'
import { useSession } from '@/hooks/use-session'
import { PageHeader } from '@/components/page-header'
import { QueryGate } from '@/components/query-gate'
import { SimpleTable } from '@/components/simple-table'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSetup } from '@/features/setup/api'
import { useClassWorkspace, useClasses } from './api'

export function ClassroomHome() {
  const { role } = useSession()
  const query = useClasses()
  const setup = useSetup()
  const isLearner = role === 'student' || role === 'guardian'
  const classId = query.data?.[0]?.id ?? ''
  const workspace = useClassWorkspace(classId)

  return (
    <Main>
      <PageHeader
        title={isLearner ? t('classroom.myDay') : t('classroom.title')}
        description={isLearner ? t('classroom.timetable') : t('classroom.desc')}
        audience={t(`role.${role}` as 'role.teacher')}
      />
      {isLearner ? (
        <div className='grid gap-4'>
          <Card>
            <CardHeader>
              <CardTitle>{t('classroom.timetable')}</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleTable
                columns={[t('setup.timetable'), t('setup.subjects')]}
                rows={(setup.data?.timetable ?? [])
                  .filter((cell) => !classId || cell.classId === classId)
                  .map((cell) => [
                    `${weekdayName(cell.day)} — ${
                      setup.data?.periods.find((period) => period.id === cell.periodId)?.name ??
                      cell.periodId
                    }`,
                    setup.data?.subjects.find((subject) => subject.id === cell.subjectId)?.name ??
                      cell.subjectId,
                  ])}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('classroom.homework')}</CardTitle>
            </CardHeader>
            <CardContent className='grid gap-2 text-sm'>
              {(workspace.data?.homework ?? [])
                .filter((item) => item.published)
                .map((item) => (
                  <p key={item.id}>{item.title}</p>
                ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        <QueryGate query={query}>
          <SimpleTable
            columns={[t('setup.classes'), '']}
            rows={(query.data ?? []).map((item) => [
              item.label,
              <Button key={item.id} asChild size='sm' className='min-h-11'>
                <Link to='/classroom/$classId' params={{ classId: item.id }}>
                  {t('common.openMenu')}
                </Link>
              </Button>,
            ])}
          />
        </QueryGate>
      )}
    </Main>
  )
}
