import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { loginWithPassword, sendOtp } from '@/features/auth/session'
import { t } from '@/i18n/t'
import { safeRedirectPath } from '@/lib/redirect'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const passwordSchema = z.object({
  identifier: z.string().min(1, t('auth.identifierRequired')),
  password: z.string().min(1, t('auth.passwordRequired')).min(7, t('auth.passwordMin')),
})

const smsSchema = z.object({
  phone: z.string().min(8, t('auth.phoneRequired')),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({ className, redirectTo }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { identifier: '', password: '' },
  })
  const smsForm = useForm<z.infer<typeof smsSchema>>({
    resolver: zodResolver(smsSchema),
    defaultValues: { phone: '' },
  })

  async function onPassword(data: z.infer<typeof passwordSchema>) {
    setIsLoading(true)
    try {
      const result = await loginWithPassword(data.identifier, data.password)
      if (!result.entered) {
        navigate({
          to: '/select-school',
          search: { redirect: redirectTo },
          replace: true,
        })
        return
      }
      navigate({ to: safeRedirectPath(redirectTo), replace: true })
      toast.success(t('auth.signingIn'))
    } catch {
      toast.error(t('auth.unknownUser'))
    } finally {
      setIsLoading(false)
    }
  }

  async function onSms(data: z.infer<typeof smsSchema>) {
    setIsLoading(true)
    try {
      await sendOtp(data.phone, 'login')
      navigate({ to: '/otp', search: { phone: data.phone, redirect: redirectTo } })
      toast.success(t('auth.smsSent', { phone: data.phone }))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Tabs defaultValue='password' className={cn('grid gap-3', className)}>
      <TabsList className='grid w-full grid-cols-2'>
        <TabsTrigger value='password'>{t('auth.passwordTab')}</TabsTrigger>
        <TabsTrigger value='sms'>{t('auth.smsTab')}</TabsTrigger>
      </TabsList>
      <TabsContent value='password'>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPassword)} className='grid gap-3'>
            <FormField
              control={passwordForm.control}
              name='identifier'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.identifier')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('auth.identifierPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name='password'
              render={({ field }) => (
                <FormItem className='relative'>
                  <FormLabel>{t('auth.password')}</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder='********' {...field} />
                  </FormControl>
                  <FormMessage />
                  <Link
                    to='/forgot-password'
                    className='absolute inset-e-0 -top-0.5 text-sm font-medium text-muted-foreground hover:opacity-75'
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </FormItem>
              )}
            />
            <Button className='mt-2 h-11 text-base' disabled={isLoading}>
              {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
              {t('auth.signIn')}
            </Button>
          </form>
        </Form>
      </TabsContent>
      <TabsContent value='sms'>
        <Form {...smsForm}>
          <form onSubmit={smsForm.handleSubmit(onSms)} className='grid gap-3'>
            <FormField
              control={smsForm.control}
              name='phone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.phone')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('auth.phonePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className='mt-2 h-11 text-base' disabled={isLoading}>
              {isLoading ? <Loader2 className='animate-spin' /> : null}
              {t('auth.sendSms')}
            </Button>
          </form>
        </Form>
      </TabsContent>
    </Tabs>
  )
}
