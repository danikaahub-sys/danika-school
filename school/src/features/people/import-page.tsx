import { useState } from 'react'
import { toast } from 'sonner'
import { t } from '@/i18n/t'
import { PageHeader } from '@/components/page-header'
import { StepWizard } from '@/components/step-wizard'
import { SimpleTable } from '@/components/simple-table'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const STEPS = [
  t('people.import.upload'),
  t('people.import.validate'),
  t('people.import.preview'),
  t('people.import.commit'),
]

const SAMPLE = [
  ['علی', 'محمدی', '0017878900', 'هفتم الف', 'ok'],
  ['محمد', 'حسینی', 'کد ناقص', 'هفتم الف', 'error'],
]

export function ImportPage() {
  const [step, setStep] = useState(0)
  return (
    <Main>
      <PageHeader title={t('people.import.title')} description={t('people.import.desc')} />
      <StepWizard steps={STEPS} current={step} onChange={setStep} />
      {step === 0 ? (
        <p className='text-sm text-muted-foreground'>{t('people.import.sample')}</p>
      ) : (
        <SimpleTable
          columns={[t('people.firstName'), t('people.lastName'), t('people.nationalId'), t('people.class'), t('people.status')]}
          rows={SAMPLE.map((row) => [
            ...row.slice(0, 4),
            row[4] === 'error' ? (
              <Badge variant='destructive'>{t('common.error')}</Badge>
            ) : (
              <Badge>{t('common.done')}</Badge>
            ),
          ])}
        />
      )}
      <div className='mt-4 flex gap-2'>
        <Button variant='outline' disabled={step === 0} onClick={() => setStep(step - 1)}>
          {t('common.prev')}
        </Button>
        <Button
          onClick={() => {
            if (step === 3) toast.success(t('toast.saved'))
            else setStep(step + 1)
          }}
        >
          {step === 3 ? t('people.import.commit') : t('common.next')}
        </Button>
      </div>
    </Main>
  )
}
