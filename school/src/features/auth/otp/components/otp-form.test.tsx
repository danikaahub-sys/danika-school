import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { t } from '@/i18n/t'
import { OtpForm } from './otp-form'

const navigate = vi.fn()
const verifyOtp = vi.fn()
const finishGlobalAuth = vi.fn()

vi.mock('@tanstack/react-router', async (orig) => {
  const actual = await orig<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: () => navigate }
})

vi.mock('@/features/auth/session', () => ({
  verifyOtp: (...args: unknown[]) => verifyOtp(...args),
  finishGlobalAuth: (...args: unknown[]) => finishGlobalAuth(...args),
}))

describe('OtpForm', () => {
  let screen: RenderResult
  let otpInput: Locator
  let verifyButton: Locator

  beforeEach(async () => {
    vi.clearAllMocks()

    screen = await render(<OtpForm phone='09120000000' />)
    otpInput = screen.getByLabelText(t('auth.otpLabel'))
    verifyButton = screen.getByRole('button', { name: t('auth.verify') })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('disables Verify until 6 digits are entered', async () => {
    await expect.element(verifyButton).toBeDisabled()

    await userEvent.fill(otpInput, '12345')
    await expect.element(verifyButton).toBeDisabled()

    await userEvent.fill(otpInput, '123456')
    await expect.element(verifyButton).toBeEnabled()
  })

  it('submits the OTP and navigates after timeout', async () => {
    verifyOtp.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' })
    finishGlobalAuth.mockResolvedValue({ entered: true, memberships: [] })

    await userEvent.fill(otpInput, '123456')
    await userEvent.click(verifyButton)

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true })
    )
  })
})
