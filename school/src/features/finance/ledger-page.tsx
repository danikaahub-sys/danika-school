import { toast } from 'sonner'
import { t } from '@/i18n/t'
import { useSession } from '@/hooks/use-session'
import { PageHeader } from '@/components/page-header'
import { QueryGate } from '@/components/query-gate'
import { SimpleTable } from '@/components/simple-table'
import { StatCard } from '@/components/stat-card'
import { ReceiptBadge } from '@/components/status-badge'
import { MoneyText } from '@/components/money'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { useLedger } from './api'

export function LedgerPage({ studentId }: { studentId: string }) {
  const query = useLedger(studentId)
  const { school } = useSession()
  const unit = school.moneyUnit
  const charged = query.data?.charges.reduce((sum, item) => sum + item.amountIrr, 0) ?? 0
  const paid =
    query.data?.receipts
      .filter((item) => item.status === 'posted')
      .reduce((sum, item) => sum + item.amountIrr, 0) ?? 0
  const balance = charged - paid

  return (
    <Main>
      <PageHeader
        title={query.data?.studentName || t('finance.ledger')}
        description={t('finance.ledger')}
        actions={
          <>
            <Button variant='outline' onClick={() => toast.success(t('finance.reverse'))}>
              {t('finance.reverse')}
            </Button>
            <Button variant='outline' onClick={() => toast.success(t('finance.carry'))}>
              {t('finance.carry')}
            </Button>
          </>
        }
      />
      <QueryGate query={query}>
        <div className='mb-6 grid gap-3 sm:grid-cols-3'>
          <StatCard title={t('finance.charge')} value={<MoneyText irr={charged} unit={unit} />} />
          <StatCard title={t('finance.receipt')} value={<MoneyText irr={paid} unit={unit} />} />
          <StatCard
            title={t('finance.balance')}
            value={<MoneyText irr={balance} unit={unit} />}
            tone={balance > 0 ? 'warn' : 'default'}
          />
        </div>
        <div className='grid gap-6'>
          <section className='grid gap-2'>
            <h2 className='text-sm font-medium'>{t('finance.charge')}</h2>
            <SimpleTable
              columns={[t('finance.charge'), t('finance.amount')]}
              rows={(query.data?.charges ?? []).map((item) => [
                item.title,
                <MoneyText key={item.id} irr={item.amountIrr} unit={unit} />,
              ])}
            />
          </section>
          <section className='grid gap-2'>
            <h2 className='text-sm font-medium'>{t('finance.receipt')}</h2>
            <SimpleTable
              columns={[t('finance.receipt'), t('finance.ref'), t('people.status')]}
              rows={(query.data?.receipts ?? []).map((item) => [
                <MoneyText key={item.id} irr={item.amountIrr} unit={unit} />,
                item.ref,
                <ReceiptBadge key={`${item.id}-status`} status={item.status} />,
              ])}
            />
          </section>
        </div>
      </QueryGate>
    </Main>
  )
}
