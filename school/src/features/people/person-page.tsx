import { t } from '@/i18n/t'
import { formatJalali } from '@/lib/date'
import { formatScore, toFaDigits } from '@/lib/fa-text'
import { useSession } from '@/hooks/use-session'
import { PageHeader } from '@/components/page-header'
import { QueryGate } from '@/components/query-gate'
import { SimpleTable } from '@/components/simple-table'
import { AttendanceBadge, ScoreBadge, StatusBadge } from '@/components/status-badge'
import { SearchTabs } from '@/components/search-tabs'
import { StatCard } from '@/components/stat-card'
import { MoneyText } from '@/components/money'
import { Main } from '@/components/layout/main'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Can } from '@/components/can'
import { usePerson, type PersonDetail } from './api'

export function PersonPage({ personId, tab }: { personId: string; tab?: string }) {
  const query = usePerson(personId)
  const data = query.data
  const person = data?.person
  const { school } = useSession()
  const kind = person?.kind ?? 'student'

  return (
    <Main>
      <QueryGate query={query}>
        {person && data ? (
          <>
            <PageHeader
              title={data.name}
              description={data.className || t('people.record.noEnrollment')}
              audience={t(`people.kind.${kind}` as 'people.kind.student')}
            />
            <StudentBrief data={data} moneyUnit={school.moneyUnit} />
            <SearchTabs defaultValue={tab ?? 'profile'}>
              <TabsList className='mb-4 flex-wrap'>
                <TabsTrigger value='profile'>{t('people.record.profile')}</TabsTrigger>
                <TabsTrigger value='enrollment'>{t('people.record.enrollment')}</TabsTrigger>
                <TabsTrigger value='family'>{t('people.record.family')}</TabsTrigger>
                <TabsTrigger value='attendance'>{t('people.record.attendance')}</TabsTrigger>
                <TabsTrigger value='results'>{t('people.record.results')}</TabsTrigger>
                <Can permission='finance.ledger.view'>
                  <TabsTrigger value='finance'>{t('people.record.finance')}</TabsTrigger>
                </Can>
              </TabsList>
              <TabsContent value='profile'>
                <IdentityGrid data={data} />
              </TabsContent>
              <TabsContent value='enrollment'>
                {data.enrollment ? (
                  <dl className='grid gap-3 text-sm sm:grid-cols-2'>
                    <BriefField label={t('people.record.grade')} value={data.enrollment.gradeName || '—'} />
                    <BriefField label={t('people.class')} value={data.enrollment.classOnly || '—'} />
                    <BriefField label={t('people.record.kind')} value={t(`people.kind.${kind}` as 'people.kind.student')} />
                    <BriefField label={t('people.status')} value={t(`people.status.${person.status}`)} />
                  </dl>
                ) : (
                  <p className='text-sm text-muted-foreground'>{t('people.record.noEnrollment')}</p>
                )}
              </TabsContent>
              <TabsContent value='family'>
                <SimpleTable
                  columns={[
                    t('people.name'),
                    t('people.relation'),
                    t('people.phone'),
                    t('people.academicVisible'),
                    t('people.financialVisible'),
                    t('people.status'),
                  ]}
                  rows={data.links.map((link) => [
                    link.otherName,
                    link.relation,
                    link.otherPhone ?? '—',
                    link.academicVisible ? t('common.yes') : t('common.no'),
                    link.financialVisible ? t('common.yes') : t('common.no'),
                    <StatusBadge key={link.id} tone={link.verified ? 'good' : 'warn'}>
                      {link.verified ? t('people.verified') : t('people.unverified')}
                    </StatusBadge>,
                  ])}
                  empty={t('people.emptyGuardians')}
                />
              </TabsContent>
              <TabsContent value='attendance'>
                <SimpleTable
                  columns={[t('people.date'), t('classroom.attendance')]}
                  rows={data.attendance.map((row) => [
                    row.date ? formatJalali(row.date) : '—',
                    <AttendanceBadge key={row.id ?? row.sessionId} status={row.status} />,
                  ])}
                  empty={t('empty.attendance')}
                />
              </TabsContent>
              <TabsContent value='results'>
                <SimpleTable
                  columns={[t('people.assessment'), t('classroom.gradebook'), t('people.status')]}
                  rows={data.scores.map((item) => [
                    item.title || '—',
                    formatScore(item.earned, item.maximum),
                    <ScoreBadge key={item.id} status={item.status} />,
                  ])}
                  empty={t('people.record.emptyScores')}
                />
              </TabsContent>
              <TabsContent value='finance'>
                <SimpleTable
                  columns={[t('finance.charge'), t('finance.amount'), t('finance.dueDate')]}
                  rows={data.charges.map((item) => [
                    item.title,
                    <MoneyText key={item.id} irr={item.amountIrr} unit={school.moneyUnit} />,
                    item.dueOn ? formatJalali(item.dueOn) : '—',
                  ])}
                  empty={t('people.record.emptyCharges')}
                />
              </TabsContent>
            </SearchTabs>
          </>
        ) : null}
      </QueryGate>
    </Main>
  )
}

function StudentBrief({
  data,
  moneyUnit,
}: {
  data: PersonDetail
  moneyUnit: ReturnType<typeof useSession>['school']['moneyUnit']
}) {
  const { summary } = data
  return (
    <section className='mb-6 grid gap-4' aria-label={t('people.record.brief')}>
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard title={t('people.record.guardiansCount')} value={toFaDigits(summary.guardians)} />
        <StatCard
          title={t('classroom.attendance')}
          value={`${toFaDigits(summary.present)} / ${toFaDigits(summary.attendanceTotal)}`}
          hint={`${t('classroom.absent')}: ${toFaDigits(summary.absent)}`}
        />
        <StatCard
          title={t('people.record.scoresCount')}
          value={`${toFaDigits(summary.scoresPublished)} / ${toFaDigits(summary.scoresTotal)}`}
          hint={t('common.publish')}
        />
        <StatCard
          title={t('people.record.chargesSum')}
          value={<MoneyText irr={summary.chargesAmountIrr} unit={moneyUnit} />}
          hint={`${t('finance.charge')}: ${toFaDigits(summary.chargesTotal)}`}
        />
      </div>
    </section>
  )
}

function IdentityGrid({ data }: { data: PersonDetail }) {
  const { person } = data
  const fields = [
    [t('people.firstName'), person.firstName || '—'],
    [t('people.lastName'), person.lastName || '—'],
    [t('people.nationalId'), person.nationalId ?? '—'],
    [t('people.phone'), person.phone ?? '—'],
    [t('people.record.kind'), t(`people.kind.${person.kind}` as 'people.kind.student')],
    [t('people.status'), t(`people.status.${person.status}`)],
    [t('people.record.grade'), data.gradeName || '—'],
    [t('people.class'), data.classOnly || data.className || '—'],
  ] as const

  return (
    <dl className='grid gap-3 text-sm sm:grid-cols-2'>
      {fields.map(([label, value]) => (
        <BriefField key={label} label={label} value={value} />
      ))}
    </dl>
  )
}

function BriefField({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl border px-4 py-3'>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd className='mt-1 font-medium'>{value}</dd>
    </div>
  )
}
