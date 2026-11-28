import { useState } from 'react'
import { toast } from 'sonner'
import { t } from '@/i18n/t'
import { formatJalali } from '@/lib/date'
import { PageHeader } from '@/components/page-header'
import { QueryGate } from '@/components/query-gate'
import { SimpleTable } from '@/components/simple-table'
import { SearchTabs } from '@/components/search-tabs'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCommunications, useSendAnnouncement } from './api'
import { messageSchema } from './schema'
import { useSession } from '@/hooks/use-session'

export function CommunicationsPage() {
  const query = useCommunications()
  const send = useSendAnnouncement()
  const { role } = useSession()
  const readOnly = role === 'student' || role === 'guardian'
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [channel, setChannel] = useState<'app' | 'sms' | 'both'>('app')

  return (
    <Main>
      <PageHeader
        title={t('comms.title')}
        description={readOnly ? t('classroom.readOnly') : t('comms.desc')}
        audience={t(`role.${role}` as 'role.principal')}
      />
      <SearchTabs defaultValue={readOnly ? 'log' : 'compose'}>
        <TabsList>
          {readOnly ? null : <TabsTrigger value='compose'>{t('comms.compose')}</TabsTrigger>}
          {readOnly ? null : <TabsTrigger value='templates'>{t('comms.templates')}</TabsTrigger>}
          <TabsTrigger value='log'>{t('comms.log')}</TabsTrigger>
        </TabsList>
        <TabsContent value='compose' className='mt-4 grid max-w-xl gap-3 rounded-xl border bg-card p-4'>
          <div className='grid gap-2'>
            <Label>{t('quick.announcement')}</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className='grid gap-2'>
            <Label>{t('comms.body')}</Label>
            <Textarea rows={4} value={body} onChange={(event) => setBody(event.target.value)} />
          </div>
          <div className='grid gap-2'>
            <Label>{t('comms.channel')}</Label>
            <Select value={channel} onValueChange={(value) => setChannel(value as typeof channel)}>
              <SelectTrigger className='min-h-11'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='app'>{t('comms.channel.app')}</SelectItem>
                <SelectItem value='sms'>{t('comms.channel.sms')}</SelectItem>
                <SelectItem value='both'>{t('comms.channel.both')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className='min-h-11'
            onClick={() => {
              const parsed = messageSchema.safeParse({ title, body, channel })
              if (!parsed.success) {
                toast.error(t('common.error'))
                return
              }
              send.mutate(
                {
                  title: parsed.data.title,
                  body: parsed.data.body,
                  channel: parsed.data.channel.toUpperCase(),
                  audience: { all: true },
                },
                {
                  onSuccess: () => toast.success(t('toast.posted')),
                  onError: () => toast.error(t('common.error')),
                }
              )
            }}
          >
            {t('comms.send')}
          </Button>
        </TabsContent>
        <TabsContent value='templates' className='pt-4'>
          <SimpleTable
            columns={[t('comms.templates'), t('comms.channel'), '']}
            rows={(query.data?.templates ?? []).map((item) => [
              item.title,
              <Badge key={`${item.id}-channel`} variant='secondary'>
                {t(`comms.channel.${item.channel}`)}
              </Badge>,
              <Button
                key={item.id}
                size='sm'
                variant='outline'
                className='min-h-11'
                onClick={() => {
                  setTitle(item.title)
                  setBody(item.body)
                  setChannel(item.channel)
                  toast.success(t('comms.useTemplate'))
                }}
              >
                {t('comms.useTemplate')}
              </Button>,
            ])}
          />
        </TabsContent>
        <TabsContent value='log' className='pt-4'>
          <QueryGate query={query}>
            <SimpleTable
              columns={[t('quick.announcement'), t('comms.channel'), t('people.date')]}
              rows={(query.data?.announcements ?? []).map((item) => [
                item.title,
                <Badge key={item.id} variant='secondary'>
                  {t(`comms.channel.${item.channel}`)}
                </Badge>,
                item.sentAt ? formatJalali(item.sentAt) : '—',
              ])}
            />
          </QueryGate>
        </TabsContent>
      </SearchTabs>
    </Main>
  )
}
