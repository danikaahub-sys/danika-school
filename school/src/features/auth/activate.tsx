import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { acceptInvitation } from '@/features/auth/session'
import { t } from '@/i18n/t'
import { AuthLayout } from '@/features/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { PasswordInput } from '@/components/password-input'

const schema = z
  .object({
    password: z.string().min(7, t('auth.passwordMin')),
    confirm: z.string().min(1, t('auth.confirmPasswordRequired')),
  })
  .refine((data) => data.password === data.confirm, {
    message: t('auth.passwordsMismatch'),
    path: ['confirm'],
  })

export function ActivateAccount() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { token?: string }
  const [loading, setLoading] = useState(false)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  })

  async function onSubmit(data: z.infer<typeof schema>) {
    if (!search.token) {
      toast.error(t('common.error'))
      return
    }
    setLoading(true)
    try {
      const result = await acceptInvitation(search.token, data.password)
      if (!result.entered) {
        navigate({ to: '/select-school', replace: true })
        return
      }
      toast.success(t('auth.activated'))
      navigate({ to: '/', replace: true })
    } catch {
      toast.error(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <Card className='max-w-sm'>
        <CardHeader>
          <CardTitle>{t('auth.activateTitle')}</CardTitle>
          <CardDescription>{t('auth.activateDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-3'>
              <FormField
                control={form.control}
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
                control={form.control}
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
              <Button disabled={loading}>{t('auth.setPassword')}</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
