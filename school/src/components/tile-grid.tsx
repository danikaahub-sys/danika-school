import { EmptyState } from '@/components/empty-state'

type Tile = {
  id: string
  title: string
  hint?: string
}

/** Short name lists (grades, subjects, positions) read better as tiles than as a one-column table. */
export function TileGrid({ items, empty }: { items: Tile[]; empty?: string }) {
  if (items.length === 0) {
    return <EmptyState description={empty} />
  }
  return (
    <ul className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
      {items.map((item) => (
        <li key={item.id} className='rounded-xl border bg-card px-4 py-3'>
          <p className='font-medium'>{item.title}</p>
          {item.hint ? <p className='mt-1 text-xs text-muted-foreground'>{item.hint}</p> : null}
        </li>
      ))}
    </ul>
  )
}
