import { t } from '@/i18n/t'
import { toFaDigits } from '@/lib/fa-text'
import { irrToToman, parseMoneyInput, type MoneyUnit } from '@/lib/money'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function formatAmount(irr: number, unit: MoneyUnit): string {
  const value = unit === 'toman' ? irrToToman(irr) : irr
  return toFaDigits(value.toLocaleString('en-US'))
}

export function MoneyText({
  irr,
  unit,
}: {
  irr: number
  unit: MoneyUnit
}) {
  const label = unit === 'toman' ? t('common.unit.toman') : t('common.unit.irr')
  return (
    <span className='tabular-nums'>
      {formatAmount(irr, unit)} {label}
    </span>
  )
}

type MoneyInputProps = {
  id?: string
  label: string
  irr: number
  unit: MoneyUnit
  onChange: (irr: number) => void
}

export function MoneyInput({ id, label, irr, unit, onChange }: MoneyInputProps) {
  const unitLabel = unit === 'toman' ? t('common.unit.toman') : t('common.unit.irr')
  const display = unit === 'toman' ? String(irrToToman(irr) || '') : String(irr || '')
  return (
    <div className='grid gap-2'>
      <Label htmlFor={id}>
        {label} ({unitLabel})
      </Label>
      <Input
        id={id}
        inputMode='numeric'
        value={display}
        onChange={(event) => onChange(parseMoneyInput(event.target.value, unit))}
      />
    </div>
  )
}
