import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { enterSchool, listMemberships, type Membership } from '@/features/auth/session'
import { t } from '@/i18n/t'
import { safeRedirectPath } from '@/lib/redirect'
import { AuthLayout } from '@/features/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SelectSchool({ redirectTo }: { redirectTo?: string }) {
  const navigate = useNavigate()
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    listMemberships()
      .then(async (rows) => {
        if (!alive) return
        setMemberships(rows)
        const preferred = rows.find((item) => item.status === 'ACTIVE')
        if (!preferred) return
        try {
          const user = await enterSchool(preferred.schoolId)
          if (!alive) return
          toast.success(t('auth.welcomeBack', { name: user.name }))
          navigate({ to: safeRedirectPath(redirectTo), replace: true })
        } catch {
          if (alive) toast.error(t('common.error'))
        }
      })
      .catch(() => {
        if (alive) toast.error(t('common.error'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [navigate, redirectTo])

  async function pick(schoolId: string) {
    try {
      const user = await enterSchool(schoolId)
      toast.success(t('auth.welcomeBack', { name: user.name }))
      navigate({ to: safeRedirectPath(redirectTo), replace: true })
    } catch {
      toast.error(t('common.error'))
    }
  }

  return (
    <AuthLayout>
      <Card className='max-w-sm'>
        <CardHeader>
          <CardTitle>{t('auth.chooseSchool')}</CardTitle>
          <CardDescription>{t('auth.chooseSchoolDesc')}</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-2'>
          {loading ? <p className='text-sm text-muted-foreground'>{t('common.loading')}</p> : null}
          {memberships.map((item) => (
            <Button
              key={item.id}
              variant='outline'
              className='h-auto justify-start py-3'
              onClick={() => pick(item.schoolId)}
            >
              <span className='flex flex-col items-start'>
                <span>{item.schoolName}</span>
                <span className='text-xs text-muted-foreground'>
                  {item.city} — {item.positionName}
                </span>
              </span>
            </Button>
          ))}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
