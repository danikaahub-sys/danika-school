import { Link } from '@tanstack/react-router'
import { t } from '@/i18n/t'
import { formatScore, toFaDigits } from '@/lib/fa-text'
import { useSession } from '@/hooks/use-session'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { QueryGate } from '@/components/query-gate'
import { EmptyState } from '@/components/empty-state'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useHome } from './api'

export function HomePage() {
  const { role } = useSession()
  const query = useHome()
  const desc =
    role === 'student'
      ? t('home.descStudent')
      : role === 'teacher'
        ? t('home.descTeacher')
        : t('home.descManager')

  return (
    <Main>
      <PageHeader
        title={t('home.title')}
        description={desc}
        audience={t(`role.${role}` as 'role.principal')}
      />
      <QueryGate query={query}>
        {query.data ? (
          <div className='grid gap-6'>
            {role === 'student' ? <StudentHome /> : null}
            {role === 'teacher' ? <TeacherHome /> : null}
            {role !== 'student' && role !== 'teacher' ? <ManagerHome /> : null}
          </div>
        ) : null}
      </QueryGate>
    </Main>
  )
}

function ManagerHome() {
  const query = useHome()
  const data = query.data
  if (!data) return null
  return (
    <>
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard title={t('home.sessions')} value={toFaDigits(data.sessions.length)} />
        <StatCard
          title={t('home.attendanceRate')}
          value={toFaDigits(data.attention.attendance)}
          hint={t('attention.attendance')}
        />
        <StatCard title={t('home.pendingReceipts')} value={toFaDigits(data.attention.receipts)} />
        <StatCard title={t('home.draftGrades')} value={toFaDigits(data.attention.grades)} />
      </div>
      <TodoCard />
      <Card>
        <CardHeader>
          <CardTitle>{t('home.readiness')}</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-2 text-sm'>
          <p>{t('home.checklist.year')}</p>
          <p>{t('home.checklist.roster')}</p>
          <p>{t('home.checklist.teachers')}</p>
          <p className='text-muted-foreground'>{t('home.checklist.guardians')}</p>
        </CardContent>
      </Card>
    </>
  )
}

function TeacherHome() {
  const query = useHome()
  const data = query.data
  if (!data) return null
  return (
    <>
      <div className='grid gap-3 sm:grid-cols-2'>
        <StatCard title={t('home.todayClasses')} value={toFaDigits(data.teacherClasses.length)} />
        <StatCard
          title={t('home.attendanceRate')}
          value={toFaDigits(data.sessions.filter((item) => item.status !== 'submitted').length)}
        />
      </div>
      <TodoCard />
    </>
  )
}

function StudentHome() {
  const query = useHome()
  const data = query.data
  if (!data) return null
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('classroom.timetable')}</CardTitle>
        </CardHeader>
        <CardContent className='text-sm'>
          {data.className || t('common.empty')}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('classroom.homework')}</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-2 text-sm'>
          {data.homework.length === 0 ? (
            <EmptyState title={t('common.empty')} />
          ) : (
            data.homework.map((item) => <p key={item.id}>{item.title}</p>)
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('home.publishedGrades')}</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-2 text-sm'>
          {data.grades.map((item) => (
            <p key={item.id}>
              {item.title}: {formatScore(item.earned, item.maximum)}
            </p>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('home.notices')}</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-2 text-sm'>
          {data.notices.map((item) => (
            <p key={item.id}>{item.title}</p>
          ))}
        </CardContent>
      </Card>
    </>
  )
}

function TodoCard() {
  const query = useHome()
  const data = query.data
  const open = data?.sessions.filter((session) => session.status !== 'submitted') ?? []
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('home.todo')}</CardTitle>
      </CardHeader>
      <CardContent className='grid gap-2'>
        {open.length === 0 ? (
          <p className='text-sm text-muted-foreground'>{t('home.emptyTodo')}</p>
        ) : (
          open.map((session) => (
            <div key={session.id} className='flex items-center justify-between gap-2 text-sm'>
              <span>
                {session.classLabel} —{' '}
                {session.status === 'draft' ? t('classroom.draft') : t('classroom.unmarked')}
              </span>
              <Button asChild size='sm' variant='outline' className='min-h-11'>
                <Link
                  to='/classroom/$classId'
                  params={{ classId: session.classId }}
                  search={{ tab: 'attendance' }}
                >
                  {t('classroom.attendance')}
                </Link>
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
