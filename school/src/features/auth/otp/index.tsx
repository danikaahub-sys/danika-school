import { Link, useSearch } from '@tanstack/react-router'
import { t } from '@/i18n/t'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { OtpForm } from './components/otp-form'

export function Otp() {
  const search = useSearch({ strict: false }) as {
    phone?: string
    redirect?: string
    purpose?: string
  }
  return (
    <AuthLayout>
      <Card className='max-w-md gap-4'>
        <CardHeader>
          <CardTitle className='text-base tracking-tight'>{t('auth.otpTitle')}</CardTitle>
          <CardDescription>{t('auth.otpDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <OtpForm
            phone={search.phone}
            redirectTo={search.redirect}
            purpose={search.purpose === 'reset' ? 'reset' : 'login'}
          />
        </CardContent>
        <CardFooter>
          <p className='px-8 text-center text-sm text-muted-foreground'>
            {t('auth.otpNotReceived')}{' '}
            <Link to='/sign-in' className='underline underline-offset-4 hover:text-primary'>
              {t('auth.otpResend')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
