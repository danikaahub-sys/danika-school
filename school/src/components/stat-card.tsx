import { Link } from '@tanstack/react-router'
import { toFaDigits } from '@/lib/fa-text'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type StatTone = 'default' | 'warn' | 'bad'

type StatCardLink =
  | { to: '/classroom/attendance' }
  | { to: '/classroom/results' }
  | { to: '/people/import' }
  | { to: '/finance'; search?: { tab: 'queue' } }
  | { to: '/people'; search?: { tab: 'guardians' } }

export type StatDelta = {
  value: number
  goodWhen: 'up' | 'down'
  suffix?: string
}

type StatCardProps = {
  title: string
  value: React.ReactNode
  hint?: string
  footer?: string
  tone?: StatTone
  link?: StatCardLink
  delta?: StatDelta
  className?: string
}

const toneClass: Record<StatTone, string> = {
  default: '',
  warn: 'border-amber-500/40',
  bad: 'border-destructive/40',
}

const valueToneClass: Record<StatTone, string> = {
  default: '',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-destructive',
}

function DeltaBadge({ delta }: { delta: StatDelta }) {
  const up = delta.value > 0
  const flat = !Number.isFinite(delta.value) || delta.value === 0
  const good =
    flat ||
    (delta.goodWhen === 'up' && up) ||
    (delta.goodWhen === 'down' && !up)
  const abs = Math.abs(Math.round(delta.value * 10) / 10)
  const label = flat
    ? `${toFaDigits('0')}${delta.suffix ?? ''}`
    : `${up ? '↑' : '↓'} ${toFaDigits(abs)}${delta.suffix ?? ''}`

  return (
    <Badge
      variant='outline'
      className={cn(
        'tabular-nums',
        flat
          ? 'text-muted-foreground'
          : good
            ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
            : 'border-destructive/40 text-destructive'
      )}
    >
      {label}
    </Badge>
  )
}

export function StatCard({
  title,
  value,
  hint,
  footer,
  tone = 'default',
  link,
  delta,
  className,
}: StatCardProps) {
  const body = (
    <>
      <CardHeader className='pb-0'>
        <CardDescription>{title}</CardDescription>
        <CardTitle
          className={cn(
            'text-2xl font-semibold tabular-nums',
            valueToneClass[tone]
          )}
        >
          {value}
        </CardTitle>
        {delta ? (
          <CardAction>
            <DeltaBadge delta={delta} />
          </CardAction>
        ) : null}
      </CardHeader>
      {hint || footer ? (
        <CardContent className='space-y-1 pt-2 text-xs text-muted-foreground'>
          {hint ? <p>{hint}</p> : null}
          {footer ? <p>{footer}</p> : null}
        </CardContent>
      ) : null}
    </>
  )

  if (!link) {
    return (
      <Card className={cn('justify-start gap-0 py-4', toneClass[tone], className)}>
        {body}
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'justify-start gap-0 py-4 transition-colors hover:bg-muted/40 focus-within:ring-2 focus-within:ring-ring',
        toneClass[tone],
        className
      )}
    >
      {'search' in link && link.search ? (
        <Link
          to={link.to}
          search={link.search}
          className='block rounded-xl outline-none'
        >
          {body}
        </Link>
      ) : (
        <Link to={link.to} className='block rounded-xl outline-none'>
          {body}
        </Link>
      )}
    </Card>
  )
}
