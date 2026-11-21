import { t } from '@/i18n/t'

type PageHeaderProps = {
  title: string
  description?: string
  audience?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, audience, actions }: PageHeaderProps) {
  return (
    <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
      <div className='space-y-1'>
        <h1 className='text-2xl font-semibold tracking-tight'>{title}</h1>
        {description ? (
          <p className='text-sm text-muted-foreground'>{description}</p>
        ) : null}
        {audience ? (
          <p className='text-xs text-muted-foreground'>
            {t('common.audience')}: {audience}
          </p>
        ) : null}
      </div>
      {actions ? <div className='flex flex-wrap gap-2'>{actions}</div> : null}
    </div>
  )
}
