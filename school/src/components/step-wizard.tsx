import { t } from '@/i18n/t'
import { cn } from '@/lib/utils'

type StepWizardProps = {
  steps: string[]
  current: number
  onChange?: (index: number) => void
}

export function StepWizard({ steps, current, onChange }: StepWizardProps) {
  return (
    <ol className='mb-6 flex flex-wrap gap-2'>
      {steps.map((label, index) => {
        const active = index === current
        const done = index < current
        return (
          <li key={label}>
            <button
              type='button'
              onClick={() => onChange?.(index)}
              className={cn(
                'flex min-h-11 items-center gap-2 rounded-full border px-3 py-1.5 text-sm',
                active && 'border-primary bg-primary text-primary-foreground',
                done && !active && 'border-primary/40 text-primary',
                !active && !done && 'text-muted-foreground'
              )}
            >
              <span className='tabular-nums'>{t('wizard.step', { n: index + 1 })}</span>
              <span>{label}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
