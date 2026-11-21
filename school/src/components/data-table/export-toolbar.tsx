import { Download, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { t } from '@/i18n/t'
import { Button } from '@/components/ui/button'

type ExportToolbarProps = {
  entityName: string
}

export function ExportToolbar({ entityName }: ExportToolbarProps) {
  return (
    <div className='flex gap-2'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => toast.success(t('common.export') + ' — ' + entityName)}
      >
        <Download />
        {t('common.export')}
      </Button>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => window.print()}
      >
        <Printer />
        {t('common.print')}
      </Button>
    </div>
  )
}
