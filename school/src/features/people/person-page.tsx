import { t } from '@/i18n/t'
import { useSession } from '@/hooks/use-session'
import { PageHeader } from '@/components/page-header'
import { QueryGate } from '@/components/query-gate'
import { SimpleTable } from '@/components/simple-table'
import { SearchTabs } from '@/components/search-tabs'
import { MoneyText } from '@/components/money'
import { Main } from '@/components/layout/main'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Can } from '@/components/can'
import { usePerson } from './api'

export function PersonPage({ personId, tab }: { personId: string; tab?: string }) {
  const query = usePerson(personId)
  const person = query.data?.person
  const { school } = useSession()

  return (
    <Main>
      <QueryGate query={query}>
        {person ? (
          <>
            <PageHeader
              title={query.data?.name ?? ''}
              description={query.data?.className}
              audience={t(`role.${person.role ?? 'student'}` as 'role.student')}
            />
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
              <TabsContent value='profile' className='grid gap-1 text-sm'>
                <p>
                  {t('people.phone')}: {person.phone ?? '—'}
                </p>
                <p>
                  {t('people.nationalId')}: {person.nationalId ?? '—'}
                </p>
                <p>
                  {t('people.status')}: {t(`people.status.${person.status}`)}
                </p>
              </TabsContent>
              <TabsContent value='enrollment'>
                <p className='text-sm'>{query.data?.className || t('common.empty')}</p>
              </TabsContent>
              <TabsContent value='family'>
                <SimpleTable
                  columns={[
                    t('people.name'),
                    t('people.relation'),
                    t('people.academicVisible'),
                    t('people.financialVisible'),
                  ]}
                  rows={(query.data?.links ?? []).map((link) => [
                    link.otherName,
                    link.relation,
                    link.academicVisible ? t('common.yes') : t('common.no'),
                    <span key={link.id} className='flex items-center gap-2'>
                      {link.financialVisible ? t('common.yes') : t('common.no')}
                      <Badge variant={link.verified ? 'secondary' : 'destructive'}>
                        {link.verified ? t('people.verified') : t('people.unverified')}
                      </Badge>
                    </span>,
                  ])}
                  empty={t('people.emptyGuardians')}
                />
              </TabsContent>
              <TabsContent value='attendance'>
                <SimpleTable
                  columns={[t('classroom.attendance')]}
                  rows={(query.data?.attendance ?? []).map((row) => [t(`classroom.${row.status}`)])}
                  empty={t('empty.attendance')}
                />
              </TabsContent>
              <TabsContent value='results'>
                <SimpleTable
                  columns={[t('classroom.gradebook'), t('people.status')]}
                  rows={(query.data?.scores ?? []).map((item) => [
                    item.earned == null ? '—' : `${item.earned}/${item.maximum}`,
                    item.status === 'published' ? t('common.publish') : t('classroom.draft'),
                  ])}
                />
              </TabsContent>
              <TabsContent value='finance'>
                <SimpleTable
                  columns={[t('finance.charge'), t('finance.amount')]}
                  rows={(query.data?.charges ?? []).map((item) => [
                    item.title,
                    <MoneyText key={item.id} irr={item.amountIrr} unit={school.moneyUnit} />,
                  ])}
                />
              </TabsContent>
            </SearchTabs>
          </>
        ) : null}
      </QueryGate>
    </Main>
  )
}
