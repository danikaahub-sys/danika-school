import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { t } from '@/i18n/t'
import { weekdayName } from '@/lib/date'
import { useSession } from '@/hooks/use-session'
import { EmptyState } from '@/components/empty-state'
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
  const classes = query.data ?? []

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
          {classes.length === 0 ? (
            <EmptyState description={t('classroom.pick')} />
          ) : (
            <div className='grid gap-2 sm:grid-cols-2'>
              {classes.map((item) => (
                <Button
                  key={item.id}
                  asChild
                  variant='outline'
                  className='h-auto min-h-14 w-full justify-between gap-3 px-4 py-3 text-start'
                >
                  <Link to='/classroom/$classId' params={{ classId: item.id }}>
                    <span className='truncate font-medium'>{item.label}</span>
                    <ChevronLeft className='size-4 shrink-0 text-muted-foreground' />
                  </Link>
                </Button>
              ))}
            </div>
          )}
        </QueryGate>
      )}
    </Main>
  )
}
