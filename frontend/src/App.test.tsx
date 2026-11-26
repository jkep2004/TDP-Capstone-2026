import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import {
  InteractionStatus,
  Logger,
  PublicClientApplication,
  type AccountInfo,
} from '@azure/msal-browser'

import App from './App'
import { loginRequest } from './authConfig'
import { getCategories, getInsights } from './api'

vi.mock('./api', () => ({ getCategories: vi.fn(), getInsights: vi.fn() }))

vi.mock('@azure/msal-react', () => ({
  useIsAuthenticated: vi.fn(),
  useMsal: vi.fn(),
}))

const instance = new PublicClientApplication({
  auth: { clientId: 'test-client-id' },
})
const loginRedirect = vi.spyOn(instance, 'loginRedirect')
const logoutRedirect = vi.spyOn(instance, 'logoutRedirect')
const logger = new Logger({ loggerCallback: () => undefined })
const testAccount: AccountInfo = {
  homeAccountId: 'test-home-account',
  environment: 'login.microsoftonline.com',
  tenantId: 'test-tenant',
  username: 'learner@example.com',
  localAccountId: 'test-local-account',
}

function setAuthenticationState(authenticated: boolean) {
  vi.mocked(useIsAuthenticated).mockReturnValue(authenticated)
  vi.mocked(useMsal).mockReturnValue({
    instance,
    inProgress: InteractionStatus.None,
    accounts: authenticated ? [testAccount] : [],
    logger,
  })
}

describe('App', () => {
  beforeEach(() => {
    vi.mocked(getInsights).mockReset()
    vi.mocked(getCategories).mockResolvedValue([])
    vi.mocked(getInsights).mockResolvedValue({ months: [], loadMonth: vi.fn() })
    loginRedirect.mockReset()
    loginRedirect.mockResolvedValue(undefined)
    logoutRedirect.mockReset()
    logoutRedirect.mockResolvedValue(undefined)
    setAuthenticationState(false)
  })

  // Signed-out visitors should see the welcome screen, not spending data.
  it('shows the sign-in page when the user is signed out', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Welcome' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Sign in with Microsoft' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Monthly spending' })
    ).not.toBeInTheDocument()
  })

  // The sign-in action should send the configured scopes to MSAL.
  it('starts Microsoft sign-in when the sign-in button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      screen.getByRole('button', { name: 'Sign in with Microsoft' })
    )

    expect(loginRedirect).toHaveBeenCalledWith(loginRequest)
  })

  // A failed redirect should give the user visible feedback.
  it('shows an error when Microsoft sign-in cannot be started', async () => {
    loginRedirect.mockRejectedValueOnce(new Error('Sign-in unavailable'))
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      screen.getByRole('button', { name: 'Sign in with Microsoft' })
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t start sign-in. Please try again.'
    )
  })

  it('shows the empty insights state and lets users return to spending', async () => {
    setAuthenticationState(true)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Insights' }))
    expect(screen.getByRole('heading', { name: 'Spending insights' })).toBeInTheDocument()
    expect(await screen.findByText('No spending insights yet. Save spending to see a monthly summary.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'View example' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Spending' }))
    expect(screen.getByRole('heading', { name: 'Monthly spending' })).toBeInTheDocument()
  })

  it('shows the spending page and supports signing out when authenticated', async () => {
    setAuthenticationState(true)
    const user = userEvent.setup()
    render(<App />)
    expect(
      screen.getByRole('heading', { name: 'Monthly spending' })
    ).toBeInTheDocument()
    expect(screen.queryByText(/API session/)).not.toBeInTheDocument()
    expect(screen.getByText('learner@example.com')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(logoutRedirect).toHaveBeenCalledOnce()
  })
})
