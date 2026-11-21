import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { t } from '@/i18n/t'
import { toFaDigits } from '@/lib/fa-text'
import { displayName } from '@/mocks'
import { useSession } from '@/hooks/use-session'
import { PageHeader } from '@/components/page-header'
import { QueryGate } from '@/components/query-gate'
import { SimpleTable } from '@/components/simple-table'
import { MoneyInput, MoneyText } from '@/components/money'
import { JalaliDatePicker } from '@/components/jalali-date-picker'
import { SearchTabs } from '@/components/search-tabs'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePeople } from '@/features/people/api'
import { useApproveReceipt, useFinance } from './api'
import { receiptSchema } from './schema'

export function FinancePage({ tab }: { tab?: string }) {
  const query = useFinance()
  const studentsQuery = usePeople('student')
  const approve = useApproveReceipt()
  const { school } = useSession()
  const unit = school.moneyUnit
  const students = useMemo(
    () => (studentsQuery.data ?? []).filter((person) => person.status === 'active'),
    [studentsQuery.data]
  )

  return (
    <Main>
      <PageHeader
        title={t('finance.title')}
        description={t('finance.desc')}
        audience={`${t('role.finance')}، ${t('role.principal')}`}
      />
      <QueryGate query={query}>
        {query.data ? (
          <SearchTabs defaultValue={tab ?? 'plans'}>
            <TabsList className='mb-4 flex-wrap'>
              <TabsTrigger value='plans'>{t('finance.plans')}</TabsTrigger>
              <TabsTrigger value='ledger'>{t('finance.students')}</TabsTrigger>
              <TabsTrigger value='queue'>{t('finance.queue')}</TabsTrigger>
              <TabsTrigger value='batch'>{t('finance.batch')}</TabsTrigger>
              <TabsTrigger value='reports'>{t('finance.reports')}</TabsTrigger>
            </TabsList>
            <TabsContent value='plans'>
              <SimpleTable
                columns={[t('setup.grades'), t('finance.amount')]}
                rows={query.data.tuitionPlans.map((plan) => [
                  plan.gradeName,
                  <MoneyText key={plan.id} irr={plan.amountIrr} unit={unit} />,
                ])}
              />
            </TabsContent>
            <TabsContent value='ledger'>
              <SimpleTable
                columns={[t('people.name'), t('people.class'), '']}
                rows={students.map((person) => [
                  displayName(person),
                  person.classLabel || '—',
                  <Button key={person.id} asChild size='sm' variant='outline' className='min-h-11'>
                    <Link to='/finance/students/$studentId' params={{ studentId: person.id }}>
                      {t('finance.ledger')}
                    </Link>
                  </Button>,
                ])}
              />
            </TabsContent>
            <TabsContent value='queue'>
              <SimpleTable
                columns={[t('people.name'), t('finance.ref'), t('finance.amount'), t('people.status'), '']}
                rows={query.data.receipts.map((receipt) => [
                  receipt.studentName || receipt.studentId,
                  receipt.ref,
                  <MoneyText key={receipt.id} irr={receipt.amountIrr} unit={unit} />,
                  receipt.status === 'pending' ? t('finance.pending') : t('finance.posted'),
                  <div key={`${receipt.id}-a`} className='flex flex-wrap gap-2'>
                    <Button asChild size='sm' variant='outline' className='min-h-11'>
                      <Link to='/finance/students/$studentId' params={{ studentId: receipt.studentId }}>
                        {t('finance.ledger')}
                      </Link>
                    </Button>
                    {receipt.status === 'pending' ? (
                      <Button
                        size='sm'
                        className='min-h-11'
                        onClick={() => {
                          receiptSchema.parse({
                            studentId: receipt.studentId,
                            amountIrr: receipt.amountIrr,
                            ref: receipt.ref,
                          })
                          approve.mutate(receipt.id, {
                            onSuccess: () => toast.success(t('finance.verify')),
                            onError: () => toast.error(t('common.error')),
                          })
                        }}
                      >
                        {t('finance.verify')}
                      </Button>
                    ) : null}
                  </div>,
                ])}
              />
            </TabsContent>
            <TabsContent value='batch'>
              <BatchPanel count={students.length} unit={unit} />
            </TabsContent>
            <TabsContent value='reports'>
              <p className='text-sm'>
                {t('finance.charge')}: {toFaDigits(query.data.charges.length)} · {t('finance.receipt')}:{' '}
                {toFaDigits(query.data.receipts.length)}
              </p>
            </TabsContent>
          </SearchTabs>
        ) : null}
      </QueryGate>
    </Main>
  )
}

function BatchPanel({ count, unit }: { count: number; unit: 'irr' | 'toman' }) {
  const [amount, setAmount] = useState(0)
  const [due, setDue] = useState<Date | undefined>()
  return (
    <div className='grid max-w-lg gap-4'>
      <p className='text-sm text-muted-foreground'>
        {t('finance.batchPreviewCount', { n: toFaDigits(count) })}
      </p>
      <MoneyInput label={t('finance.batchAmount')} irr={amount} unit={unit} onChange={setAmount} />
      <JalaliDatePicker selected={due} onSelect={setDue} placeholder={t('finance.dueDate')} />
      <p className='text-sm'>
        {t('common.preview')}: <MoneyText irr={amount} unit={unit} />
      </p>
      <Button onClick={() => toast.success(t('finance.commitBatch'))}>{t('finance.commitBatch')}</Button>
    </div>
  )
}
