import { Inbox } from 'lucide-react'
import { t } from '@/i18n/t'

type EmptyStateProps = {
  title?: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  title = t('empty.genericTitle'),
  description = t('empty.genericDesc'),
  action,
}: EmptyStateProps) {
  return (
    <div className='flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-16 text-center'>
      <Inbox className='size-10 text-muted-foreground' />
      <h2 className='text-lg font-medium'>{title}</h2>
      <p className='max-w-sm text-sm text-muted-foreground'>{description}</p>
      {action}
    </div>
  )
}
