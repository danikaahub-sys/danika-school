import { useState, type ReactNode } from 'react'
import { toFaDigits } from '@/lib/fa-text'
import { cn } from '@/lib/utils'

export type TrendPoint = { date: string; value: number }

export type TrendMetric = {
  id: string
  label: string
  points: TrendPoint[]
  color?: string
  /** How to roll hovered-out values into the headline figure. */
  aggregate?: 'sum' | 'avg'
  formatValue?: (value: number) => string
}

function niceMax(v: number): number {
  if (v <= 0) return 1
  const pow = 10 ** Math.floor(Math.log10(v))
  const n = v / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

function defaultFormat(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (Math.abs(value) >= 1_000_000) {
    return toFaDigits(`${(value / 1_000_000).toFixed(1)}M`)
  }
  if (Math.abs(value) >= 10_000) {
    return toFaDigits(`${Math.round(value / 1000)}K`)
  }
  return toFaDigits(
    Number.isInteger(value) ? value : Math.round(value * 10) / 10
  )
}

function dateLabel(date?: string): string {
  if (!date) return ''
  if (/^\d{4}-\d{2}$/.test(date)) {
    const [y, m] = date.split('-')
    return toFaDigits(`${y}/${m}`)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [, m, d] = date.split('-')
    return toFaDigits(`${Number(m)}/${Number(d)}`)
  }
  return toFaDigits(date)
}

type TrendChartProps = {
  title?: string
  points?: TrendPoint[]
  color?: string
  aggregate?: 'sum' | 'avg'
  formatValue?: (value: number) => string
  metrics?: TrendMetric[]
  emptyLabel?: string
  rangeLabel?: string
  tall?: boolean
  className?: string
  headerRight?: ReactNode
}

export function TrendChart({
  title,
  points,
  color = 'var(--chart-1)',
  aggregate = 'sum',
  formatValue,
  metrics,
  emptyLabel,
  rangeLabel,
  tall,
  className,
  headerRight,
}: TrendChartProps) {
  const [hi, setHi] = useState<number | null>(null)
  const [metricId, setMetricId] = useState(metrics?.[0]?.id ?? '')

  const activeMetric = metrics?.find((m) => m.id === metricId) ?? metrics?.[0]
  const pts = activeMetric?.points ?? points ?? []
  const c = activeMetric?.color ?? color
  const chartTitle = activeMetric?.label ?? title ?? ''
  const chartAggregate = activeMetric?.aggregate ?? aggregate
  const fmt = activeMetric?.formatValue ?? formatValue ?? defaultFormat

  const values = pts.map((p) => p.value)
  const total =
    chartAggregate === 'avg'
      ? values.length === 0
        ? 0
        : values.reduce((a, b) => a + b, 0) / values.length
      : values.reduce((a, b) => a + b, 0)

  const max = niceMax(Math.max(0, ...values))
  const ticks = [max, max / 2, 0]
  const N = pts.length
  const mid = Math.floor(N / 2)
  const active = hi != null ? pts[hi] : null

  const barH = (v: number) => {
    if (v <= 0 || max <= 0) return 0
    return Math.max((v / max) * 100, 3)
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 text-card-foreground shadow-none',
        className
      )}
    >
      {(metrics && metrics.length > 1) || headerRight ? (
        <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
          {metrics && metrics.length > 1 ? (
            <div className='flex flex-wrap items-center gap-1 rounded-lg bg-muted p-0.5'>
              {metrics.map((m) => (
                <button
                  key={m.id}
                  type='button'
                  onClick={() => {
                    setMetricId(m.id)
                    setHi(null)
                  }}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-semibold transition',
                    (activeMetric?.id ?? metricId) === m.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}
          {headerRight}
        </div>
      ) : null}

      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0'>
          <div className='truncate text-xs font-medium text-muted-foreground'>
            {chartTitle}
          </div>
          <div
            className='text-2xl font-semibold tabular-nums leading-tight'
            style={active ? { color: c } : undefined}
          >
            {fmt(active ? active.value : total)}
          </div>
        </div>
        <span className='shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] font-medium tabular-nums text-muted-foreground'>
          {active ? dateLabel(active.date) : (rangeLabel ?? '')}
        </span>
      </div>

      {pts.length === 0 ? (
        <div
          className={cn(
            'mt-4 grid place-items-center text-sm text-muted-foreground',
            tall ? 'h-52' : 'h-36'
          )}
        >
          {emptyLabel}
        </div>
      ) : (
        <>
          <div className={cn('relative mt-4', tall ? 'h-52' : 'h-36')}>
            {ticks.map((tk, i) => (
              <div
                key={i}
                className='pointer-events-none absolute inset-x-0 flex items-center'
                style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
              >
                <div className='h-px flex-1 bg-border' />
                <span className='ms-1.5 w-10 shrink-0 text-end text-[9px] tabular-nums text-muted-foreground'>
                  {defaultFormat(tk)}
                </span>
              </div>
            ))}

            <div className='absolute inset-0 flex items-end gap-[2px] pe-12'>
              {pts.map((p, idx) => {
                const lit = hi == null || hi === idx
                return (
                  <div
                    key={p.date}
                    className='relative flex h-full flex-1 items-end justify-center'
                    onMouseEnter={() => setHi(idx)}
                    onMouseLeave={() => setHi(null)}
                  >
                    <div
                      className='w-full min-w-0 rounded-t-[3px] transition-[opacity,height] duration-200'
                      style={{
                        height: `${barH(p.value)}%`,
                        background: c,
                        opacity: lit ? 1 : 0.35,
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div className='mt-2 flex justify-between pe-12 text-[9px] tabular-nums text-muted-foreground'>
            <span>{dateLabel(pts[0]?.date)}</span>
            <span>{dateLabel(pts[mid]?.date)}</span>
            <span>{dateLabel(pts[N - 1]?.date)}</span>
          </div>
        </>
      )}
    </div>
  )
}
