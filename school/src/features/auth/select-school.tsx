import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Building2, ChevronLeft, Loader2, MapPin } from 'lucide-react'
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
  const [pickingId, setPickingId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    listMemberships()
      .then(async (rows) => {
        if (!alive) return
        const active = rows.filter((item) => item.status === 'ACTIVE')
        setMemberships(active)
        if (active.length !== 1) return
        try {
          const user = await enterSchool(active[0].schoolId)
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
    if (pickingId) return
    setPickingId(schoolId)
    try {
      const user = await enterSchool(schoolId)
      toast.success(t('auth.welcomeBack', { name: user.name }))
      navigate({ to: safeRedirectPath(redirectTo), replace: true })
    } catch {
      toast.error(t('common.error'))
      setPickingId(null)
    }
  }

  return (
    <AuthLayout>
      <Card className='w-full max-w-lg gap-5 sm:w-[32rem]'>
        <CardHeader className='gap-2'>
          <CardTitle className='text-lg tracking-tight'>
            {t('auth.chooseSchool')}
          </CardTitle>
          <CardDescription>{t('auth.chooseSchoolDesc')}</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3'>
          {loading ? (
            <div className='flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground'>
              <Loader2 className='size-4 animate-spin' />
              {t('common.loading')}
            </div>
          ) : null}

          {!loading && memberships.length === 0 ? (
            <p className='rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground'>
              {t('common.empty')}
            </p>
          ) : null}

          {!loading
            ? memberships.map((item) => {
                const busy = pickingId === item.schoolId
                return (
                  <Button
                    key={item.id}
                    variant='outline'
                    disabled={pickingId !== null}
                    className='h-auto w-full items-center justify-between gap-3 px-4 py-4 text-start'
                    onClick={() => pick(item.schoolId)}
                  >
                    <span className='flex min-w-0 flex-1 items-start gap-3'>
                      <span className='mt-0.5 grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary'>
                        <Building2 className='size-5' />
                      </span>
                      <span className='flex min-w-0 flex-col gap-1'>
                        <span className='truncate text-base font-medium'>
                          {item.schoolName}
                        </span>
                        <span className='flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground'>
                          <span className='inline-flex items-center gap-1'>
                            <MapPin className='size-3.5' />
                            {item.city}
                          </span>
                          <span aria-hidden>·</span>
                          <span>{item.positionName}</span>
                        </span>
                      </span>
                    </span>
                    {busy ? (
                      <Loader2 className='size-4 shrink-0 animate-spin' />
                    ) : (
                      <ChevronLeft className='size-4 shrink-0 text-muted-foreground' />
                    )}
                  </Button>
                )
              })
            : null}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
