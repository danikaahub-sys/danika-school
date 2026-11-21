import { Telescope } from 'lucide-react'
import { t } from '@/i18n/t'

export function ComingSoon({ title }: { title?: string }) {
  return (
    <div className='flex min-h-[60svh] flex-col items-center justify-center gap-2 px-6 text-center'>
      <Telescope size={64} />
      <h1 className='text-3xl font-semibold'>{title ?? t('comingSoon.title')}</h1>
      <p className='max-w-md text-muted-foreground'>{t('comingSoon.desc')}</p>
    </div>
  )
}
