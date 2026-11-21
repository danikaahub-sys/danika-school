import { Tabs } from '@/components/ui/tabs'
import { useSearchTab } from '@/hooks/use-search-tab'

export function SearchTabs({
  defaultValue,
  children,
}: {
  defaultValue: string
  children: React.ReactNode
}) {
  const { tab, setTab } = useSearchTab(defaultValue)
  return (
    <Tabs value={tab} onValueChange={setTab}>
      {children}
    </Tabs>
  )
}
