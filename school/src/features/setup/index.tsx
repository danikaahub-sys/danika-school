import { toast } from 'sonner'
import { t } from '@/i18n/t'
import { weekdayName, formatJalali } from '@/lib/date'
import { PageHeader } from '@/components/page-header'
import { QueryGate } from '@/components/query-gate'
import { SimpleTable } from '@/components/simple-table'
import { SearchTabs } from '@/components/search-tabs'
import { JalaliDatePicker } from '@/components/jalali-date-picker'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSetup } from './api'
import { useState } from 'react'

const TABS = [
  ['years', 'setup.years'],
  ['grades', 'setup.grades'],
  ['classes', 'setup.classes'],
  ['subjects', 'setup.subjects'],
  ['assignments', 'setup.assignments'],
  ['timetable', 'setup.timetable'],
  ['calendar', 'setup.calendar'],
  ['policy', 'setup.policy'],
] as const

export function SetupPage({ tab }: { tab?: string }) {
  const query = useSetup()
  const data = query.data

  return (
    <Main>
      <PageHeader
        title={t('setup.title')}
        description={t('setup.desc')}
        audience={`${t('role.principal')}، ${t('role.deputy')}`}
        actions={
          <Button onClick={() => toast.success(t('setup.rollover'))}>{t('setup.rollover')}</Button>
        }
      />
      <QueryGate query={query}>
        {data ? (
          <SearchTabs defaultValue={tab ?? 'years'}>
            <TabsList className='mb-4 h-auto flex-wrap'>
              {TABS.map(([value, key]) => (
                <TabsTrigger key={value} value={value}>
                  {t(key)}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value='years'>
              <SimpleTable
                columns={[t('setup.years'), t('setup.active')]}
                rows={data.years.map((year) => [year.label, year.active ? t('common.yes') : t('common.no')])}
              />
            </TabsContent>
            <TabsContent value='grades'>
              <SimpleTable columns={[t('setup.grades')]} rows={data.grades.map((grade) => [grade.name])} />
            </TabsContent>
            <TabsContent value='classes'>
              <SimpleTable
                columns={[t('setup.grades'), t('setup.classes')]}
                rows={data.classes.map((item) => [
                  data.grades.find((grade) => grade.id === item.gradeId)?.name ?? '',
                  item.name,
                ])}
              />
            </TabsContent>
            <TabsContent value='subjects'>
              <SimpleTable columns={[t('setup.subjects')]} rows={data.subjects.map((item) => [item.name])} />
            </TabsContent>
            <TabsContent value='assignments'>
              <SimpleTable
                columns={[t('setup.classes'), t('setup.subjects'), t('role.teacher')]}
                rows={data.assignments.map((item) => [
                  data.classes.find((schoolClass) => schoolClass.id === item.classId)?.name ?? '',
                  data.subjects.find((subject) => subject.id === item.subjectId)?.name ?? '',
                  item.teacherName || item.teacherId,
                ])}
              />
            </TabsContent>
            <TabsContent value='timetable'>
              <p className='mb-3 text-sm text-muted-foreground'>{t('setup.bells')}</p>
              <SimpleTable
                columns={[t('setup.timetable'), ...data.periods.map((period) => period.name)]}
                rows={[1, 2, 3, 4, 5].map((day) => [
                  weekdayName(day),
                  ...data.periods.map((period) => {
                    const classId = data.classes[0]?.id
                    const cell = data.timetable.find(
                      (entry) =>
                        (!classId || entry.classId === classId) &&
                        entry.day === day &&
                        entry.periodId === period.id
                    )
                    return cell
                      ? data.subjects.find((subject) => subject.id === cell.subjectId)?.name
                      : '—'
                  }),
                ])}
              />
            </TabsContent>
            <TabsContent value='calendar'>
              <CalendarTab />
            </TabsContent>
            <TabsContent value='policy'>
              <p className='text-sm'>{t('setup.scale')}</p>
              <p className='mt-2 max-w-xl text-sm text-muted-foreground'>{t('setup.weightHint')}</p>
            </TabsContent>
          </SearchTabs>
        ) : null}
      </QueryGate>
    </Main>
  )
}

function CalendarTab() {
  const query = useSetup()
  const [selected, setSelected] = useState<Date | undefined>()
  return (
    <div className='space-y-4'>
      <JalaliDatePicker selected={selected} onSelect={setSelected} />
      <SimpleTable
        columns={[t('setup.calendar'), t('setup.closure')]}
        rows={(query.data?.closures ?? []).map((item) => [formatJalali(item.date), item.title])}
      />
    </div>
  )
}
