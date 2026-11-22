import { clearCookies } from '@/test-utils/cookies'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { getCookie } from '@/lib/cookies'
import { ThemeProvider } from '@/context/theme-provider'
import { t } from '@/i18n/t'
import { ThemeToggle } from './theme-toggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearCookies()
    document.documentElement.classList.remove('light', 'dark')
  })

  it('toggles from light to dark and back', async () => {
    const screen = await render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    await userEvent.click(
      screen.getByRole('button', { name: t('theme.selectDark') })
    )
    await vi.waitFor(() => expect(getCookie('vite-ui-theme')).toBe('dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    await userEvent.click(
      screen.getByRole('button', { name: t('theme.selectLight') })
    )
    await vi.waitFor(() => expect(getCookie('vite-ui-theme')).toBe('light'))
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })
})
