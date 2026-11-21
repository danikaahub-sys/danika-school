import { toast } from 'sonner'
import { t } from '@/i18n/t'
import { useSession } from '@/hooks/use-session'
import { PageHeader } from '@/components/page-header'
import { QueryGate } from '@/components/query-gate'
import { SimpleTable } from '@/components/simple-table'
import { SearchTabs } from '@/components/search-tabs'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Can } from '@/components/can'
import { useResults } from './api'

export function ResultsPage({ tab }: { tab?: string }) {
  const { can, actorId, role } = useSession()
  const query = useResults()
  const canPublish = can('classroom.grades.publish')
  const rows = (query.data ?? []).filter((item) => {
    if (!canPublish) return item.status === 'published' && item.studentId === actorId
    return true
  })

  return (
    <Main>
      <PageHeader
        title={t('classroom.results')}
        description={canPublish ? t('classroom.desc') : t('classroom.publishedOnly')}
        audience={t(`role.${role}` as 'role.teacher')}
        actions={
          <Can permission='classroom.grades.publish'>
            <Button onClick={() => toast.success(t('toast.published'))}>{t('classroom.publish')}</Button>
          </Can>
        }
      />
      <QueryGate query={query}>
        <SearchTabs defaultValue={tab ?? 'publish'}>
          <TabsList>
            {canPublish ? <TabsTrigger value='publish'>{t('classroom.publish')}</TabsTrigger> : null}
            <TabsTrigger value='cards'>{t('classroom.reportCards')}</TabsTrigger>
          </TabsList>
          <TabsContent value='publish'>
            <SimpleTable
              columns={[t('people.name'), t('classroom.gradebook'), t('people.status')]}
              rows={rows.map((item) => [
                item.studentName || item.studentId,
                item.earned == null ? '—' : `${item.earned}/${item.maximum}`,
                item.status === 'published' ? t('common.publish') : t('classroom.draft'),
              ])}
            />
          </TabsContent>
          <TabsContent value='cards'>
            <SimpleTable
              columns={[t('people.name'), t('classroom.reportCards')]}
              rows={rows
                .filter((item) => item.status === 'published')
                .map((item) => [
                  item.studentName || item.studentId,
                  item.earned == null ? '—' : `${item.earned}/${item.maximum}`,
                ])}
            />
          </TabsContent>
        </SearchTabs>
      </QueryGate>
    </Main>
  )
}
