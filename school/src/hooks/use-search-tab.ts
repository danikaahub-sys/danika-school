import { useNavigate, useSearch } from '@tanstack/react-router'

export function useSearchTab(fallback: string) {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { tab?: string }
  const tab = search.tab ?? fallback

  function setTab(next: string) {
    navigate({
      search: (previous: Record<string, unknown>) => ({ ...previous, tab: next }),
    } as never)
  }

  return { tab, setTab }
}
