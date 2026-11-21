import { CalendarIcon } from 'lucide-react'
import { DayPicker } from 'react-day-picker/persian'
import 'react-day-picker/style.css'
import { t } from '@/i18n/t'
import { formatJalali } from '@/lib/date'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type JalaliDatePickerProps = {
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
  placeholder?: string
}

export function JalaliDatePicker({
  selected,
  onSelect,
  placeholder = t('common.pickDate'),
}: JalaliDatePickerProps) {
  const iso = selected?.toISOString().slice(0, 10)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          data-empty={!selected}
          className='min-h-11 w-full justify-start font-normal data-[empty=true]:text-muted-foreground sm:w-52'
        >
          {iso ? formatJalali(iso) : <span>{placeholder}</span>}
          <CalendarIcon className='ms-auto size-4 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <DayPicker
          mode='single'
          selected={selected}
          onSelect={onSelect}
          dir='rtl'
        />
      </PopoverContent>
    </Popover>
  )
}
