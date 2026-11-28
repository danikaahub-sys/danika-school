import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/empty-state'

/** Tables this narrow read as a list, so they stop stretching across the page. */
const NARROW_COLUMN_COUNT = 2

type SimpleTableProps = {
  /** An empty header marks an actions column: it hugs its content at the row end. */
  columns: string[]
  rows: React.ReactNode[][]
  empty?: string
}

export function SimpleTable({ columns, rows, empty }: SimpleTableProps) {
  if (rows.length === 0) {
    return <EmptyState description={empty} />
  }
  const isActions = (index: number) => columns[index] === ''

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-card',
        columns.length <= NARROW_COLUMN_COUNT && 'max-w-2xl'
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className='bg-muted/50 hover:bg-muted/50'>
            {columns.map((column, index) => (
              <TableHead
                key={index}
                className={cn(
                  'h-11 px-4 text-xs text-muted-foreground',
                  isActions(index) && 'w-px'
                )}
              >
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              {row.map((cell, cellIndex) => (
                <TableCell
                  key={cellIndex}
                  className={cn(
                    'px-4 py-3',
                    cellIndex === 0 && 'font-medium',
                    isActions(cellIndex) && 'text-end'
                  )}
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
