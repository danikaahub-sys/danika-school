import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { t } from '@/i18n/t'
import { finishGlobalAuth, verifyOtp } from '@/features/auth/session'
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'

const formSchema = z.object({
  otp: z.string().min(6, t('auth.otpRequired')).max(6, t('auth.otpRequired')),
})

type OtpFormProps = React.HTMLAttributes<HTMLFormElement> & {
  phone?: string
  redirectTo?: string
  purpose?: 'login' | 'reset'
}

export function OtpForm({
  className,
  phone,
  redirectTo,
  purpose = 'login',
  ...props
}: OtpFormProps) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { otp: '' },
  })
  const otp = form.watch('otp')

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!phone) return
    setIsLoading(true)
    try {
      const result = await verifyOtp(phone, data.otp, purpose)
      if ('proof' in result) {
        navigate({
          to: '/forgot-password',
          search: { phone, proof: result.proof },
        })
        return
      }
      const entered = await finishGlobalAuth(result)
      if (!entered.entered) {
        navigate({ to: '/select-school', search: { redirect: redirectTo }, replace: true })
        return
      }
      navigate({ to: safeRedirectPath(redirectTo), replace: true })
    } catch {
      form.setError('otp', { message: t('auth.otpRequired') })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-2', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='otp'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='sr-only'>{t('auth.otpLabel')}</FormLabel>
              <FormControl>
                <InputOTP maxLength={6} {...field} containerClassName='justify-between'>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2 h-11' disabled={isLoading || otp.length < 6}>
          {t('auth.verify')}
        </Button>
      </form>
    </Form>
  )
}
