import { type UseQueryResult } from '@tanstack/react-query'
import { t } from '@/i18n/t'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function QueryGate({
  query,
  children,
}: {
  query: Pick<UseQueryResult, 'isLoading' | 'isError' | 'refetch'>
  children: React.ReactNode
}) {
  if (query.isLoading) {
    return (
      <div className='grid gap-2 py-6'>
        <Skeleton className='h-10 w-full' />
        <Skeleton className='h-24 w-full' />
        <Skeleton className='h-24 w-full' />
      </div>
    )
  }
  if (query.isError) {
    return (
      <div className='flex flex-col items-center gap-2 py-10'>
        <p className='text-sm text-muted-foreground'>{t('common.error')}</p>
        <Button variant='outline' onClick={() => query.refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }
  return children
}
