import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { userEvent, type Locator } from 'vitest/browser'
import { t } from '@/i18n/t'
import { ForgotPasswordForm } from './forgot-password-form'

const navigateMock = vi.fn()

vi.mock('@tanstack/react-router', async (orig) => {
  const actual = await orig<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/features/auth/session', () => ({
  sendOtp: vi.fn().mockResolvedValue({ sent: true }),
  resetPassword: vi.fn(),
}))

describe('ForgotPasswordForm', () => {
  let screen: RenderResult
  let phoneInput: Locator
  let continueButton: Locator

  beforeEach(async () => {
    vi.clearAllMocks()

    screen = await render(<ForgotPasswordForm />)
    phoneInput = screen.getByRole('textbox', { name: t('auth.phone') })
    continueButton = screen.getByRole('button', { name: t('common.continue') })
  })

  it('renders phone field and continue button', async () => {
    await expect.element(phoneInput).toBeInTheDocument()
    await expect.element(continueButton).toBeInTheDocument()
  })

  it('shows validation when submitting empty form', async () => {
    await userEvent.click(continueButton)
    await expect
      .element(screen.getByText(t('auth.phoneRequired')))
      .toBeInTheDocument()
  })

  it('resets the form and navigates to /otp on success', async () => {
    await userEvent.fill(phoneInput, '09120000000')
    await userEvent.click(continueButton)

    await vi.waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/otp',
        search: { phone: '09120000000', purpose: 'reset' },
      })
    )

    await expect.element(phoneInput).toHaveValue('')
  })
})
