import { Link, useNavigate } from '@tanstack/react-router'
import { t } from '@/i18n/t'
import { formatJalali } from '@/lib/date'
import { formatScore, toFaDigits } from '@/lib/fa-text'
import { irrToToman, type MoneyUnit } from '@/lib/money'
import { useSession } from '@/hooks/use-session'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { QueryGate } from '@/components/query-gate'
import { EmptyState } from '@/components/empty-state'
import { Main } from '@/components/layout/main'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarList } from '@/components/charts/bar-list'
import { TrendChart, type TrendMetric } from '@/components/charts/trend-chart'
import {
  useEnrollmentSeries,
  useGradeDistribution,
  useHome,
  useOverview,
  type OverviewRange,
} from './api'

type HomePageProps = {
  range?: OverviewRange
}

export function HomePage({ range = 'day' }: HomePageProps) {
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
            {role !== 'student' && role !== 'teacher' ? (
              <ManagerHome range={range} />
            ) : null}
          </div>
        ) : null}
      </QueryGate>
    </Main>
  )
}

function attentionTone(count: number): 'default' | 'warn' | 'bad' {
  if (count <= 0) return 'default'
  if (count >= 5) return 'bad'
  return 'warn'
}

function formatMoney(irr: number, unit: MoneyUnit): string {
  const amount = unit === 'toman' ? irrToToman(irr) : irr
  const label = unit === 'toman' ? t('common.unit.toman') : t('common.unit.irr')
  if (amount >= 1_000_000_000) {
    return `${toFaDigits((amount / 1_000_000_000).toFixed(1))}B ${label}`
  }
  if (amount >= 1_000_000) {
    return `${toFaDigits(Math.round(amount / 1_000_000))}M ${label}`
  }
  return `${toFaDigits(Math.round(amount).toLocaleString('en-US'))} ${label}`
}

function pctDelta(current: number, previous: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / Math.abs(previous)) * 100
}

function ManagerHome({ range }: { range: OverviewRange }) {
  const navigate = useNavigate({ from: '/' })
  const home = useHome()
  const overview = useOverview(range)
  const grades = useGradeDistribution()
  const enrollment = useEnrollmentSeries()
  const { school } = useSession()
  const data = home.data
  if (!data) return null

  const a = data.attention
  const o = overview.data

  const metrics: TrendMetric[] = [
    {
      id: 'attendance',
      label: t('home.chart.attendance'),
      points: (o?.trend ?? []).map((row) => ({
        date: row.date,
        value: row.attendanceRate,
      })),
      color: 'var(--chart-1)',
      aggregate: 'avg',
      formatValue: (value) => `${toFaDigits(Math.round(value))}%`,
    },
    {
      id: 'collections',
      label: t('home.chart.collections'),
      points: (o?.trend ?? []).map((row) => ({
        date: row.date,
        value: row.collectedIrr,
      })),
      color: 'var(--chart-2)',
      aggregate: 'sum',
      formatValue: (value) => formatMoney(value, school.moneyUnit),
    },
  ]

  const gradeBuckets = (
    [
      ['A', 'home.grade.A', 'var(--chart-2)'],
      ['B', 'home.grade.B', 'var(--chart-1)'],
      ['C', 'home.grade.C', 'var(--chart-4)'],
      ['D', 'home.grade.D', 'var(--chart-5)'],
      ['F', 'home.grade.F', 'var(--chart-3)'],
    ] as const
  ).map(([key, labelKey, color]) => ({
    id: key,
    label: t(labelKey),
    value: grades.data?.[key] ?? 0,
    color,
  }))

  return (
    <>
      <Tabs
        value={range}
        onValueChange={(value) => {
          void navigate({
            search: { range: value as OverviewRange },
          })
        }}
      >
        <TabsList>
          <TabsTrigger value='day'>{t('home.range.day')}</TabsTrigger>
          <TabsTrigger value='week'>{t('home.range.week')}</TabsTrigger>
          <TabsTrigger value='month'>{t('home.range.month')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <QueryGate query={overview}>
        {o ? (
          <>
            <BriefCard overview={o} moneyUnit={school.moneyUnit} />

            <TrendChart
              metrics={metrics}
              tall
              emptyLabel={t('home.chart.empty')}
              rangeLabel={o.range.label}
            />

            <div className='grid gap-6 lg:grid-cols-3'>
              <BarList
                title={t('home.chart.absencesByClass')}
                items={o.absencesByClass.map((row) => ({
                  id: row.classId,
                  label: row.label,
                  value: row.absent,
                  color: 'var(--chart-5)',
                }))}
                emptyLabel={t('home.chart.empty')}
              />
              <BarList
                title={`${t('home.chart.gradeDistribution')} · ${t('home.chart.yearWide')}`}
                items={
                  gradeBuckets.some((item) => item.value > 0) ? gradeBuckets : []
                }
                emptyLabel={t('home.chart.empty')}
              />
              <BarList
                title={`${t('home.chart.enrollment')} · ${t('home.chart.yearWide')}`}
                items={(enrollment.data ?? []).map((row) => ({
                  ...row,
                  color: 'var(--chart-1)',
                }))}
                emptyLabel={t('home.chart.empty')}
              />
            </div>
          </>
        ) : null}
      </QueryGate>

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
        <StatCard
          title={t('home.unsubmittedAttendance')}
          value={toFaDigits(a.attendance)}
          hint={t('attention.attendance')}
          tone={attentionTone(a.attendance)}
          link={{ to: '/classroom/attendance' }}
        />
        <StatCard
          title={t('home.pendingReceipts')}
          value={toFaDigits(a.receipts)}
          tone={attentionTone(a.receipts)}
          link={{ to: '/finance', search: { tab: 'queue' } }}
        />
        <StatCard
          title={t('home.draftGrades')}
          value={toFaDigits(a.grades)}
          tone={attentionTone(a.grades)}
          link={{ to: '/classroom/results' }}
        />
        <StatCard
          title={t('home.importErrors')}
          value={toFaDigits(a.importErrors)}
          tone={attentionTone(a.importErrors)}
          link={{ to: '/people/import' }}
        />
        <StatCard
          title={t('home.unverifiedGuardians')}
          value={toFaDigits(a.guardians)}
          tone={attentionTone(a.guardians)}
          link={{ to: '/people', search: { tab: 'guardians' } }}
        />
      </div>

      <TodoCard />
    </>
  )
}

function BriefCard({
  overview,
  moneyUnit,
}: {
  overview: NonNullable<ReturnType<typeof useOverview>['data']>
  moneyUnit: MoneyUnit
}) {
  const { range, attendance, sessions, finance, staff, headcount, sample } =
    overview
  const span =
    range.from === range.to
      ? formatJalali(range.from)
      : `${formatJalali(range.from)} – ${formatJalali(range.to)}`

  const empty =
    !sample &&
    sessions.total === 0 &&
    attendance.present + attendance.absent + attendance.unmarked === 0 &&
    finance.collectedIrr === 0

  return (
    <section className='grid gap-4'>
      <Card>
        <CardHeader>
          <CardTitle>{t('home.brief.title')}</CardTitle>
          <CardDescription>
            {range.label} · {span}
          </CardDescription>
          <CardAction className='flex flex-wrap justify-end gap-2'>
            <Badge variant='outline'>{t('home.brief.vsPrev')}</Badge>
            {sample ? (
              <Badge variant='secondary'>{t('home.brief.sampleHint')}</Badge>
            ) : null}
          </CardAction>
        </CardHeader>
        {!empty ? (
          <CardFooter className='flex flex-wrap gap-2 border-t'>
            <Badge variant='secondary'>
              {t('home.brief.present')}: {toFaDigits(attendance.present)}
            </Badge>
            <Badge variant='outline'>
              {t('home.brief.absentShort')}: {toFaDigits(attendance.absent)}
            </Badge>
            <Badge variant='outline'>
              {t('home.brief.late')}: {toFaDigits(attendance.late)}
            </Badge>
            <Badge variant={sessions.pending > 0 ? 'destructive' : 'secondary'}>
              {t('home.brief.sessionOpen')}: {toFaDigits(sessions.pending)}
            </Badge>
          </CardFooter>
        ) : null}
      </Card>

      <div className='grid gap-3 sm:grid-cols-3'>
        <StatCard
          title={t('home.brief.students')}
          value={toFaDigits(headcount.students)}
        />
        <StatCard
          title={t('home.brief.staff')}
          value={toFaDigits(headcount.staff)}
        />
        <StatCard
          title={t('home.brief.classes')}
          value={toFaDigits(headcount.classes)}
        />
      </div>

      <Separator />

      {empty ? (
        <Alert>
          <AlertTitle>{t('home.brief.title')}</AlertTitle>
          <AlertDescription>{t('home.brief.empty')}</AlertDescription>
        </Alert>
      ) : (
        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
          <StatCard
            title={t('home.kpi.attendanceRate')}
            value={`${toFaDigits(Math.round(attendance.rate))}%`}
            tone={
              attendance.rate > 0 && attendance.rate < 85 ? 'warn' : 'default'
            }
            link={{ to: '/classroom/attendance' }}
            delta={{
              value: attendance.rate - attendance.prevRate,
              goodWhen: 'up',
              suffix: t('home.kpi.pp'),
            }}
            hint={`${t('home.brief.present')} ${toFaDigits(attendance.present)} · ${t('home.brief.absentShort')} ${toFaDigits(attendance.absent)} · ${t('home.brief.late')} ${toFaDigits(attendance.late)}`}
          />
          <StatCard
            title={t('home.kpi.absent')}
            value={toFaDigits(attendance.absent)}
            tone={attentionTone(attendance.absent)}
            link={{ to: '/classroom/attendance' }}
            delta={{
              value: pctDelta(attendance.absent, attendance.prevAbsent),
              goodWhen: 'down',
              suffix: t('home.kpi.pct'),
            }}
          />
          <StatCard
            title={t('home.kpi.sessions')}
            value={`${toFaDigits(sessions.submitted)}/${toFaDigits(sessions.total)}`}
            tone={sessions.pending > 0 ? 'warn' : 'default'}
            link={{ to: '/classroom/attendance' }}
            delta={{
              value: pctDelta(sessions.submitted, sessions.prevSubmitted),
              goodWhen: 'up',
              suffix: t('home.kpi.pct'),
            }}
            hint={`${t('home.brief.sessionOpen')} ${toFaDigits(sessions.pending)}`}
          />
          <StatCard
            title={t('home.kpi.collected')}
            value={formatMoney(finance.collectedIrr, moneyUnit)}
            link={{ to: '/finance', search: { tab: 'queue' } }}
            delta={{
              value: pctDelta(finance.collectedIrr, finance.prevCollectedIrr),
              goodWhen: 'up',
              suffix: t('home.kpi.pct'),
            }}
          />
          <StatCard
            title={t('home.kpi.pendingReceipts')}
            value={toFaDigits(finance.pendingCount)}
            tone={attentionTone(finance.pendingCount)}
            link={{ to: '/finance', search: { tab: 'queue' } }}
            hint={formatMoney(finance.pendingIrr, moneyUnit)}
          />
          <StatCard
            title={t('home.kpi.staffAbsent')}
            value={toFaDigits(staff.absent)}
            tone={staff.absent > 0 ? 'warn' : 'default'}
            hint={`${t('home.brief.present')} ${toFaDigits(staff.present)}`}
          />
        </div>
      )}
    </section>
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
  const open =
    query.data?.sessions.filter((session) => session.status !== 'submitted') ??
    []

  const groups = new Map<
    string,
    {
      classId: string
      classLabel: string
      count: number
      latestDate: string
      hasDraft: boolean
      subjects: string[]
    }
  >()
  for (const session of open) {
    const key = session.classId || session.id
    const current = groups.get(key)
    const subject = session.subjectName
    if (!current) {
      groups.set(key, {
        classId: session.classId,
        classLabel: session.classLabel,
        count: 1,
        latestDate: session.date,
        hasDraft: session.status === 'draft',
        subjects: subject ? [subject] : [],
      })
      continue
    }
    current.count += 1
    if (session.date > current.latestDate) current.latestDate = session.date
    if (session.status === 'draft') current.hasDraft = true
    if (subject && !current.subjects.includes(subject)) {
      current.subjects.push(subject)
    }
  }
  const rows = [...groups.values()].sort((a, b) =>
    b.latestDate.localeCompare(a.latestDate)
  )

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between gap-3 pb-3'>
        <div>
          <CardTitle className='text-base'>{t('home.todo')}</CardTitle>
          {open.length > 0 ? (
            <p className='mt-1 text-xs text-muted-foreground'>
              {t('home.todoCount', { n: toFaDigits(open.length) })}
            </p>
          ) : null}
        </div>
        <Button asChild size='sm' variant='ghost' className='min-h-9 shrink-0'>
          <Link to='/classroom/attendance'>{t('home.todoSeeAll')}</Link>
        </Button>
      </CardHeader>
      <CardContent className='grid gap-2'>
        {rows.length === 0 ? (
          <p className='text-sm text-muted-foreground'>{t('home.emptyTodo')}</p>
        ) : (
          rows.map((row) => (
            <Link
              key={row.classId || row.classLabel}
              to='/classroom/$classId'
              params={{ classId: row.classId }}
              search={{ tab: 'attendance' }}
              className='flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40'
            >
              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='truncate text-sm font-medium'>
                    {row.classLabel}
                  </span>
                  <Badge
                    variant={row.hasDraft ? 'secondary' : 'outline'}
                    className='shrink-0 text-[10px]'
                  >
                    {row.hasDraft
                      ? t('classroom.draft')
                      : t('classroom.unmarked')}
                  </Badge>
                </div>
                <p className='mt-1 truncate text-xs text-muted-foreground'>
                  {t('home.todoSessions', { n: toFaDigits(row.count) })}
                  {row.latestDate ? ` · ${formatJalali(row.latestDate)}` : ''}
                  {row.subjects.length
                    ? ` · ${row.subjects.slice(0, 2).join('، ')}`
                    : ''}
                </p>
              </div>
              <span className='shrink-0 text-xs font-medium text-primary'>
                {t('classroom.attendance')}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}
