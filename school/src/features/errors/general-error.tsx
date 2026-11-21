import { useNavigate, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { t } from '@/i18n/t'

type GeneralErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  minimal?: boolean
  error?: unknown
}

export function GeneralError({
  className,
  minimal = false,
  error,
}: GeneralErrorProps) {
  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div className={cn('h-svh w-full', className)}>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        {!minimal && (
          <h1 className='text-[7rem] leading-tight font-bold'>500</h1>
        )}
        <span className='font-medium'>{t('errors.oops')}</span>
        <p className='text-center text-muted-foreground'>
          {t('errors.apologize')}
        </p>
        {import.meta.env.DEV && error instanceof Error ? (
          <pre className='max-w-xl overflow-auto text-start text-xs text-destructive'>
            {error.message}
            {'\n'}
            {error.stack}
          </pre>
        ) : null}
        {!minimal && (
          <div className='mt-6 flex gap-4'>
            <Button variant='outline' onClick={() => history.go(-1)}>
              {t('common.goBack')}
            </Button>
            <Button onClick={() => navigate({ to: '/' })}>
              {t('common.backToHome')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}