import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ACTIONS,
  BASE_ROLES,
  CATALOG,
  permissionsForRole,
  type Action,
  type BaseRole,
  type ModuleId,
} from '@/features/access/permissions'
import { t } from '@/i18n/t'
import { formatJalali } from '@/lib/date'
import { displayName, type AttentionCounts, type Position } from '@/mocks'
import { PageHeader } from '@/components/page-header'
import { QueryGate } from '@/components/query-gate'
import { SimpleTable } from '@/components/simple-table'
import { PersonStatusBadge } from '@/components/status-badge'
import { TileGrid } from '@/components/tile-grid'
import { SearchTabs } from '@/components/search-tabs'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { getNavGroups } from '@/components/layout/data/sidebar-data'
import { useAdmin } from './api'
import { useSession } from '@/hooks/use-session'
import { positionSchema } from './schema'

const EMPTY_ATTENTION: AttentionCounts = {
  attendance: 0,
  receipts: 0,
  grades: 0,
  importErrors: 0,
  guardians: 0,
}

export function AdminPage({ tab }: { tab?: string }) {
  const query = useAdmin()
  const { school } = useSession()

  return (
    <Main>
      <PageHeader
        title={t('admin.title')}
        description={t('admin.desc')}
        audience={t('role.principal')}
      />
      <QueryGate query={query}>
        {query.data ? (
          <SearchTabs defaultValue={tab ?? 'users'}>
            <TabsList className='mb-4 flex-wrap'>
              <TabsTrigger value='users'>{t('admin.users')}</TabsTrigger>
              <TabsTrigger value='positions'>{t('admin.positions')}</TabsTrigger>
              <TabsTrigger value='invitations'>{t('admin.invitations')}</TabsTrigger>
              <TabsTrigger value='audit'>{t('admin.audit')}</TabsTrigger>
              <TabsTrigger value='settings'>{t('admin.settings')}</TabsTrigger>
            </TabsList>
            <TabsContent value='users'>
              <SimpleTable
                columns={[t('people.name'), t('admin.baseRole'), t('people.status')]}
                rows={query.data.memberships.map((membership) => {
                  const person = query.data.people.find((item) => item.id === membership.personId)
                  const position = query.data.positions.find((item) => item.id === membership.positionId)
                  return [
                    person ? displayName(person) : membership.personId,
                    position ? t(`role.${position.baseRole}` as 'role.principal') : '—',
                    <PersonStatusBadge
                      key={membership.id}
                      status={membership.inviteStatus === 'invited' ? 'invited' : 'active'}
                    />,
                  ]
                })}
              />
            </TabsContent>
            <TabsContent value='positions'>
              <PositionsEditor positions={query.data.positions} />
            </TabsContent>
            <TabsContent value='invitations'>
              <div className='grid max-w-lg gap-3 rounded-xl border bg-card p-4'>
                <div className='grid gap-2'>
                  <Label htmlFor='invite-phone'>{t('auth.phone')}</Label>
                  <div className='flex flex-wrap gap-2'>
                    <Input
                      id='invite-phone'
                      placeholder={t('auth.phonePlaceholder')}
                      className='min-h-11 flex-1'
                    />
                    <Button className='min-h-11' onClick={() => toast.success(t('toast.invited'))}>
                      {t('admin.invite')}
                    </Button>
                  </div>
                </div>
                <Button
                  variant='outline'
                  className='min-h-11 justify-self-start'
                  onClick={() => toast.success(t('admin.resend'))}
                >
                  {t('admin.resend')}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value='audit'>
              <SimpleTable
                columns={[t('people.date'), t('people.name'), t('admin.audit')]}
                rows={query.data.auditLog.map((item) => [
                  item.at ? formatJalali(item.at) : '—',
                  item.actor || '—',
                  item.action,
                ])}
              />
            </TabsContent>
            <TabsContent value='settings' className='grid max-w-lg gap-3'>
              <div className='grid gap-2'>
                <Label>{t('admin.schoolName')}</Label>
                <Input defaultValue={school.name} className='min-h-11' />
              </div>
              <p className='text-sm text-muted-foreground'>
                {t('admin.moneyUnit')}: {t(`common.unit.${school.moneyUnit}`)}
              </p>
              <p className='text-sm text-muted-foreground'>{t('admin.appearanceHint')}</p>
              <Button className='min-h-11' onClick={() => toast.success(t('toast.saved'))}>
                {t('common.save')}
              </Button>
            </TabsContent>
          </SearchTabs>
        ) : null}
      </QueryGate>
    </Main>
  )
}

function PositionsEditor({ positions }: { positions: Position[] }) {
  const [query, setQuery] = useState('')
  const [baseRole, setBaseRole] = useState<BaseRole>('teacher')
  const [name, setName] = useState(positions[0]?.name ?? '')
  const modules = useMemo(
    () =>
      (Object.keys(CATALOG) as ModuleId[]).filter((mod) =>
        query ? `${mod}`.includes(query) : true
      ),
    [query]
  )
  const preview = getNavGroups(baseRole, EMPTY_ATTENTION)
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.permission || permissionsForRole(baseRole).includes(item.permission)
      ),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className='grid gap-4'>
      <TileGrid
        items={positions.map((item) => ({
          id: item.id,
          title: item.name,
          hint: t(`role.${item.baseRole}`),
        }))}
      />
      <div className='grid gap-2 sm:max-w-xs'>
        <Label>{t('admin.positionName')}</Label>
        <Input value={name} onChange={(event) => setName(event.target.value)} className='min-h-11' />
      </div>
      <div className='flex flex-wrap gap-2'>
        {BASE_ROLES.map((role) => (
          <Button
            key={role}
            size='sm'
            className='min-h-11'
            variant={baseRole === role ? 'default' : 'outline'}
            onClick={() => setBaseRole(role)}
          >
            {t(`role.${role}`)}
          </Button>
        ))}
      </div>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('common.search')}
        className='max-w-xs min-h-11'
      />
      <p className='text-sm font-medium'>{t('admin.permissions')}</p>
      {modules.map((mod) => (
        <fieldset key={mod} className='rounded-lg border p-3'>
          <legend className='px-1 text-sm font-medium'>{mod}</legend>
          {Object.entries(CATALOG[mod]).map(([page, actions]) => (
            <div key={page} className='flex flex-wrap items-center gap-3 py-1 text-sm'>
              <span className='w-28'>{page}</span>
              {ACTIONS.filter((action) => (actions as readonly Action[]).includes(action)).map(
                (action) => (
                  <label key={action} className='flex min-h-11 items-center gap-1'>
                    <Checkbox defaultChecked={permissionsForRole(baseRole).includes(`${mod}.${page}.${action}` as never)} />
                    {t(`common.${action}` as 'common.view')}
                  </label>
                )
              )}
            </div>
          ))}
        </fieldset>
      ))}
      <div>
        <p className='mb-2 text-sm font-medium'>{t('admin.sidebarPreview')}</p>
        <p className='mb-2 text-xs text-muted-foreground'>{t('admin.previewRole')}</p>
        <ul className='grid gap-2 text-sm'>
          {preview.map((group) => (
            <li key={group.id}>
              <p className='font-medium'>{group.title}</p>
              <p className='text-muted-foreground'>
                {group.items.map((item) => item.title).join('، ')}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <Button
        className='max-w-xs min-h-11'
        onClick={() => {
          const parsed = positionSchema.safeParse({ name, baseRole })
          if (!parsed.success) {
            toast.error(t('common.error'))
            return
          }
          toast.success(t('toast.saved'))
        }}
      >
        {t('common.save')}
      </Button>
    </div>
  )
}
