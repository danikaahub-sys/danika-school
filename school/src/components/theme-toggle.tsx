import { Moon, Sun } from 'lucide-react'
import { t } from '@/i18n/t'
import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      size='icon'
      variant='ghost'
      className='rounded-full'
      aria-label={isDark ? t('theme.selectLight') : t('theme.selectDark')}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? (
        <Sun aria-hidden='true' />
      ) : (
        <Moon aria-hidden='true' />
      )}
    </Button>
  )
}
