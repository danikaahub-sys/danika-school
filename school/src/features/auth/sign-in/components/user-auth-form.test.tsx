import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { t } from '@/i18n/t'
import { UserAuthForm } from './user-auth-form'

const FORM_MESSAGES = {
  identifierEmpty: t('auth.identifierRequired'),
  passwordEmpty: t('auth.passwordRequired'),
} as const

const navigate = vi.fn()
const loginWithPassword = vi.fn()

vi.mock('@/features/auth/session', () => ({
  loginWithPassword: (...args: unknown[]) => loginWithPassword(...args),
  sendOtp: vi.fn(),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    Link: ({
      children,
      to,
      className,
      ...rest
    }: {
      children?: React.ReactNode
      to: string
      className?: string
    }) => (
      <a href={to} className={className} {...rest}>
        {children}
      </a>
    ),
  }
})

vi.mock('@/lib/utils', async (orig) => ({
  ...(await orig()),
  sleep: vi.fn(() => Promise.resolve()),
}))

describe('UserAuthForm', () => {
  describe('Rendering without redirectTo', () => {
    let screen: RenderResult
    let identifierInput: Locator
    let passwordInput: Locator
    let signInButton: Locator
    let forgotPasswordLink: Locator

    beforeEach(async () => {
      vi.clearAllMocks()
      screen = await render(<UserAuthForm />)
      identifierInput = screen.getByRole('textbox', { name: t('auth.identifier') })
      passwordInput = screen.getByLabelText(t('auth.password'))
      signInButton = screen.getByRole('button', { name: t('auth.signIn') })
      forgotPasswordLink = screen.getByText(t('auth.forgotPassword'))
    })

    it('renders fields, submit button, and forgot password link', async () => {
      await expect.element(identifierInput).toBeInTheDocument()
      await expect.element(passwordInput).toBeInTheDocument()
      await expect.element(signInButton).toBeInTheDocument()
      await expect.element(forgotPasswordLink).toBeInTheDocument()
    })

    it('shows validation messages when submitting empty form', async () => {
      await userEvent.click(signInButton)

      await expect
        .element(screen.getByText(FORM_MESSAGES.identifierEmpty))
        .toBeInTheDocument()
      await expect
        .element(screen.getByText(FORM_MESSAGES.passwordEmpty))
        .toBeInTheDocument()
    })

    it('authenticates and navigates to default route on success', async () => {
      loginWithPassword.mockResolvedValue({ entered: true, memberships: [] })
      await userEvent.fill(identifierInput, 'principal')
      await userEvent.fill(passwordInput, '1234567')

      await userEvent.click(signInButton)

      await vi.waitFor(() =>
        expect(loginWithPassword).toHaveBeenCalledWith('principal', '1234567')
      )
      await vi.waitFor(() =>
        expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true })
      )
    })
  })

  it('navigates to redirectTo when provided', async () => {
    vi.clearAllMocks()

    const { getByRole, getByLabelText } = await render(
      <UserAuthForm redirectTo='/admin' />
    )

    await userEvent.fill(
      getByRole('textbox', { name: t('auth.identifier') }),
      'principal'
    )
    await userEvent.fill(getByLabelText(t('auth.password')), '1234567')

    loginWithPassword.mockResolvedValue({ entered: true, memberships: [] })
    await userEvent.click(getByRole('button', { name: t('auth.signIn') }))

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/admin',
        replace: true,
      })
    )
  })
})
