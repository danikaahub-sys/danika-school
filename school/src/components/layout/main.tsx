import { cn } from '@/lib/utils'

type MainProps = React.HTMLAttributes<HTMLElement> & {
  ref?: React.Ref<HTMLElement>
}

export function Main({ className, ...props }: MainProps) {
  return (
    <main
      className={cn(
        // Full-bleed content pane — only this area scrolls inside the fixed shell.
        'min-h-0 flex-1 overflow-y-auto p-4 md:p-8',
        className
      )}
      {...props}
    />
  )
}
