import { useSearch } from '@tanstack/react-router'
import { t } from '@/i18n/t'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { ForgotPasswordForm } from './components/forgot-password-form'

export function ForgotPassword() {
  const search = useSearch({ strict: false }) as { phone?: string; proof?: string }
  return (
    <AuthLayout>
      <Card className='max-w-sm gap-4 sm:min-w-sm'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            {t('auth.forgotPasswordTitle')}
          </CardTitle>
          <CardDescription>{t('auth.forgotDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm phone={search.phone} proof={search.proof} />
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
