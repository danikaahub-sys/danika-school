import { createContext, useContext, useEffect, useState } from 'react'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

type Theme = 'dark' | 'light'

const DEFAULT_THEME: Theme = 'light'
const THEME_COOKIE_NAME = 'vite-ui-theme'
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  defaultTheme: Theme
  resolvedTheme: Theme
  theme: Theme
  setTheme: (theme: Theme) => void
  resetTheme: () => void
}

function readStoredTheme(storageKey: string, fallback: Theme): Theme {
  const saved = getCookie(storageKey)
  if (saved === 'light' || saved === 'dark') return saved
  if (saved === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return fallback
}

const initialState: ThemeProviderState = {
  defaultTheme: DEFAULT_THEME,
  resolvedTheme: 'light',
  theme: DEFAULT_THEME,
  setTheme: () => null,
  resetTheme: () => null,
}

const ThemeContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
  storageKey = THEME_COOKIE_NAME,
  ...props
}: ThemeProviderProps) {
  const [theme, _setTheme] = useState<Theme>(() =>
    readStoredTheme(storageKey, defaultTheme)
  )

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }, [theme])

  const setTheme = (next: Theme) => {
    setCookie(storageKey, next, THEME_COOKIE_MAX_AGE)
    _setTheme(next)
  }

  const resetTheme = () => {
    removeCookie(storageKey)
    _setTheme(DEFAULT_THEME)
  }

  return (
    <ThemeContext
      value={{
        defaultTheme,
        resolvedTheme: theme,
        resetTheme,
        theme,
        setTheme,
      }}
      {...props}
    >
      {children}
    </ThemeContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext)

  if (!context) throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
