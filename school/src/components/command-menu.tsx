import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Laptop, Moon, Sun } from 'lucide-react'
import { t } from '@/i18n/t'
import { faIncludes } from '@/lib/fa-text'
import { displayName } from '@/mocks'
import { useSearch } from '@/context/search-provider'
import { useTheme } from '@/context/theme-provider'
import { useSession } from '@/hooks/use-session'
import { hasPermission } from '@/features/access/permissions'
import { useAttention } from '@/hooks/use-attention'
import { usePeople } from '@/features/people/api'
import { useFinance } from '@/features/finance/api'
import { getNavGroups } from '@/components/layout/data/sidebar-data'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { ScrollArea } from './ui/scroll-area'

export function CommandMenu() {
  const navigate = useNavigate()
  const { setTheme } = useTheme()
  const { open, setOpen } = useSearch()
  const { role, permissions } = useSession()
  const { counts } = useAttention()
  const [query, setQuery] = React.useState('')
  const searching = query.length >= 2
  const peopleQuery = usePeople(undefined, query, searching)
  const financeQuery = useFinance()

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      command()
    },
    [setOpen]
  )

  const groups = getNavGroups(role, counts)
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || hasPermission(permissions, item.permission)
      ),
    }))
    .filter((group) => group.items.length > 0)

  const peopleHits = searching
    ? (peopleQuery.data ?? []).filter((person) =>
        faIncludes(`${displayName(person)} ${person.nationalId ?? ''} ${person.phone ?? ''}`, query)
      )
    : []
  const receiptHits = searching
    ? (financeQuery.data?.receipts ?? []).filter((receipt) => faIncludes(receipt.ref, query))
    : []

  return (
    <CommandDialog modal open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={t('search.commandPlaceholder')}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <ScrollArea type='hover' className='h-72 pe-1'>
          <CommandEmpty>{t('common.noResults')}</CommandEmpty>
          {peopleHits.length > 0 ? (
            <CommandGroup heading={t('search.people')}>
              {peopleHits.slice(0, 8).map((person) => (
                <CommandItem
                  key={person.id}
                  value={displayName(person)}
                  onSelect={() =>
                    runCommand(() => navigate({ to: '/people/$personId', params: { personId: person.id } }))
                  }
                >
                  {displayName(person)}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {receiptHits.length > 0 ? (
            <CommandGroup heading={t('search.receipts')}>
              {receiptHits.map((receipt) => (
                <CommandItem
                  key={receipt.id}
                  value={receipt.ref}
                  onSelect={() =>
                    runCommand(() =>
                      navigate({
                        to: '/finance/students/$studentId',
                        params: { studentId: receipt.studentId },
                      })
                    )
                  }
                >
                  {receipt.ref}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {groups.map((group) => (
            <CommandGroup key={group.id} heading={group.title}>
              {group.items.map((item) =>
                item.url ? (
                  <CommandItem
                    key={item.id}
                    value={item.title}
                    onSelect={() =>
                      runCommand(() =>
                        navigate({
                          to: item.url ?? '/',
                          search: item.search,
                        } as never)
                      )
                    }
                  >
                    <ArrowLeft className='size-3 rtl:rotate-180' />
                    {item.title}
                  </CommandItem>
                ) : null
              )}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading={t('theme.theme')}>
            <CommandItem onSelect={() => runCommand(() => setTheme('light'))}>
              <Sun /> {t('theme.light')}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme('dark'))}>
              <Moon /> {t('theme.dark')}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme('system'))}>
              <Laptop /> {t('theme.system')}
            </CommandItem>
          </CommandGroup>
        </ScrollArea>
      </CommandList>
    </CommandDialog>
  )
}
