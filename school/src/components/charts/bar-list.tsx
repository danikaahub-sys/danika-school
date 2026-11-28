import { toFaDigits } from '@/lib/fa-text'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type BarListItem = {
  id: string
  label: string
  value: number
  display?: string
  color?: string
}

type BarListProps = {
  title: string
  items: BarListItem[]
  emptyLabel?: string
  className?: string
}

export function BarList({ title, items, emptyLabel, className }: BarListProps) {
  const max = Math.max(1, ...items.map((item) => item.value))

  return (
    <Card className={className}>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
      </CardHeader>
      <CardContent className='grid gap-2'>
        {items.length === 0 ? (
          <p className='py-6 text-center text-sm text-muted-foreground'>
            {emptyLabel}
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className='relative flex items-center gap-3 overflow-hidden rounded-lg border px-3 py-2'
            >
              <div
                className='pointer-events-none absolute inset-y-0 start-0 opacity-[0.08]'
                style={{
                  width: `${(item.value / max) * 100}%`,
                  background: item.color ?? 'var(--chart-1)',
                }}
              />
              <span className='relative min-w-0 flex-1 truncate text-sm font-medium'>
                {item.label}
              </span>
              <span
                className={cn(
                  'relative shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums'
                )}
              >
                {item.display ?? toFaDigits(item.value)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
