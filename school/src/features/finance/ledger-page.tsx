import { toast } from 'sonner'
import { t } from '@/i18n/t'
import { useSession } from '@/hooks/use-session'
import { PageHeader } from '@/components/page-header'
import { QueryGate } from '@/components/query-gate'
import { SimpleTable } from '@/components/simple-table'
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

  return (
    <Main>
      <PageHeader
        title={query.data?.studentName || t('finance.ledger')}
        description={t('finance.ledger')}
      />
      <QueryGate query={query}>
        <p className='mb-4 text-sm'>
          {t('finance.balance')}: <MoneyText irr={charged - paid} unit={unit} />
        </p>
        <SimpleTable
          columns={[t('finance.charge'), t('finance.amount')]}
          rows={(query.data?.charges ?? []).map((item) => [
            item.title,
            <MoneyText key={item.id} irr={item.amountIrr} unit={unit} />,
          ])}
        />
        <div className='my-4 flex flex-wrap gap-2'>
          <Button variant='outline' onClick={() => toast.success(t('finance.reverse'))}>
            {t('finance.reverse')}
          </Button>
          <Button variant='outline' onClick={() => toast.success(t('finance.carry'))}>
            {t('finance.carry')}
          </Button>
        </div>
        <SimpleTable
          columns={[t('finance.receipt'), t('finance.ref'), t('people.status')]}
          rows={(query.data?.receipts ?? []).map((item) => [
            <MoneyText key={item.id} irr={item.amountIrr} unit={unit} />,
            item.ref,
            item.status === 'pending' ? t('finance.pending') : t('finance.posted'),
          ])}
        />
      </QueryGate>
    </Main>
  )
}
