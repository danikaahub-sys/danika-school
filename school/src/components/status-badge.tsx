import { t } from '@/i18n/t'
import type { AttendanceStatus, Person, Receipt, Score } from '@/mocks'
import { Badge } from '@/components/ui/badge'

type StatusTone = 'good' | 'warn' | 'bad' | 'neutral'

const toneClass: Record<StatusTone, string> = {
  good: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  bad: 'border-destructive/30 bg-destructive/10 text-destructive',
  neutral: 'text-muted-foreground',
}

export function StatusBadge({
  tone = 'neutral',
  children,
}: {
  tone?: StatusTone
  children: React.ReactNode
}) {
  return (
    <Badge variant='outline' className={toneClass[tone]}>
      {children}
    </Badge>
  )
}

const attendanceTone: Record<AttendanceStatus, StatusTone> = {
  present: 'good',
  absent: 'bad',
  late: 'warn',
  excused: 'neutral',
  unmarked: 'neutral',
}

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  return <StatusBadge tone={attendanceTone[status]}>{t(`classroom.${status}`)}</StatusBadge>
}

export function SessionBadge({ status }: { status: string }) {
  return status === 'submitted' ? (
    <StatusBadge tone='good'>{t('classroom.submitted')}</StatusBadge>
  ) : (
    <StatusBadge>{t('classroom.draft')}</StatusBadge>
  )
}

const scoreTone: Record<Score['status'], StatusTone> = {
  published: 'good',
  draft: 'neutral',
  missing: 'warn',
  exempt: 'neutral',
}

export function ScoreBadge({ status }: { status: Score['status'] }) {
  return (
    <StatusBadge tone={scoreTone[status]}>
      {status === 'published' ? t('common.publish') : t(`classroom.${status}`)}
    </StatusBadge>
  )
}

export function PublishBadge({ published }: { published: boolean }) {
  return published ? (
    <StatusBadge tone='good'>{t('common.publish')}</StatusBadge>
  ) : (
    <StatusBadge>{t('classroom.draft')}</StatusBadge>
  )
}

export function ReceiptBadge({ status }: { status: Receipt['status'] }) {
  return status === 'pending' ? (
    <StatusBadge tone='warn'>{t('finance.pending')}</StatusBadge>
  ) : (
    <StatusBadge tone={status === 'posted' ? 'good' : 'neutral'}>{t('finance.posted')}</StatusBadge>
  )
}

const personTone: Record<Person['status'], StatusTone> = {
  active: 'good',
  invited: 'warn',
  deactivated: 'neutral',
}

export function PersonStatusBadge({ status }: { status: Person['status'] }) {
  return <StatusBadge tone={personTone[status]}>{t(`people.status.${status}`)}</StatusBadge>
}
