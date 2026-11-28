import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { resetPassword, sendOtp } from '@/features/auth/session'
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
import { t } from '@/i18n/t'

const phoneSchema = z.object({
  phone: z.string().min(8, t('auth.phoneRequired')),
})

const resetSchema = z
  .object({
    password: z.string().min(7, t('auth.passwordMin')),
    confirm: z.string().min(1, t('auth.confirmPasswordRequired')),
  })
  .refine((data) => data.password === data.confirm, {
    message: t('auth.passwordsMismatch'),
    path: ['confirm'],
  })

export function ForgotPasswordForm({
  className,
  phone,
  proof,
  ...props
}: React.HTMLAttributes<HTMLFormElement> & { phone?: string; proof?: string }) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: phone ?? '' },
  })
  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirm: '' },
  })

  async function onPhone(data: z.infer<typeof phoneSchema>) {
    setIsLoading(true)
    try {
      await sendOtp(data.phone, 'reset')
      phoneForm.reset()
      navigate({ to: '/otp', search: { phone: data.phone, purpose: 'reset' } })
      toast.success(t('auth.smsSent', { phone: data.phone }))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  async function onReset(data: z.infer<typeof resetSchema>) {
    if (!phone || !proof) return
    setIsLoading(true)
    try {
      await resetPassword(phone, proof, data.password)
      toast.success(t('auth.activated'))
      navigate({ to: '/sign-in' })
    } catch {
      toast.error(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  if (phone && proof) {
    return (
      <Form {...resetForm}>
        <form
          onSubmit={resetForm.handleSubmit(onReset)}
          className={cn('grid gap-2', className)}
          {...props}
        >
          <FormField
            control={resetForm.control}
            name='password'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.password')}</FormLabel>
                <FormControl>
                  <PasswordInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={resetForm.control}
            name='confirm'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.confirmPassword')}</FormLabel>
                <FormControl>
                  <PasswordInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button className='mt-2 h-11 text-base' disabled={isLoading}>
            {t('auth.resetPassword')}
            {isLoading ? <Loader2 className='animate-spin' /> : <ArrowLeft />}
          </Button>
        </form>
      </Form>
    )
  }

  return (
    <Form {...phoneForm}>
      <form
        onSubmit={phoneForm.handleSubmit(onPhone)}
        className={cn('grid gap-2', className)}
        {...props}
      >
        <FormField
          control={phoneForm.control}
          name='phone'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.phone')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('auth.phonePlaceholder')}
                  {...field}
                  dir='rtl'
                  data-auth-rtl=''
                  className='text-right'
                  inputMode='tel'
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2 h-11 text-base' disabled={isLoading}>
          {t('common.continue')}
          {isLoading ? <Loader2 className='animate-spin' /> : <ArrowLeft />}
        </Button>
      </form>
    </Form>
  )
}
