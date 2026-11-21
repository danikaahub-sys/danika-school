import { useSearch } from '@tanstack/react-router'
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
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      <Card className='max-w-sm gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>{t('auth.signInTitle')}</CardTitle>
          <CardDescription>{t('auth.signInDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
        <CardFooter>
          <p className='px-8 text-center text-sm text-muted-foreground'>
            {t('auth.agreePrefix')}{' '}
            <a href='/terms' className='underline underline-offset-4 hover:text-primary'>
              {t('auth.terms')}
            </a>{' '}
            {t('common.and')}{' '}
            <a href='/privacy' className='underline underline-offset-4 hover:text-primary'>
              {t('auth.privacy')}
            </a>{' '}
            {t('auth.agreeSuffix')}
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
