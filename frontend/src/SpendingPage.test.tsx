import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import SpendingPage from './SpendingPage'

const account = {
  homeAccountId: 'home',
  localAccountId: 'local',
  tenantId: 'tenant',
  environment: 'login.microsoftonline.com',
  username: 'learner@example.com',
}

vi.mock('./msal', () => ({
  msalInstance: { acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: 'entra-token' }) },
}))

afterEach(() => vi.unstubAllGlobals())

describe('SpendingPage', () => {
  // Each entry method should show its own controls and indicate the selected mode.
  it('switches between manual entry and CSV upload', async () => {
    const user = userEvent.setup()
    render(<SpendingPage />)

    expect(
      screen.getByRole('heading', { name: 'Enter spending manually' })
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Food (£)')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Upload CSV' }))

    expect(
      screen.getByRole('heading', { name: 'Upload a CSV file' })
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Choose a CSV file')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Upload CSV' })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  // The entered category amounts should add up in the confirmation for that month.
  it('saves all manual amounts together as monthly totals', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(Response.json([
        { id: 2, name: 'Food', parent_id: null },
        { id: 1, name: 'Travel', parent_id: null },
        { id: 3, name: 'Utilities', parent_id: null },
      ]))
      .mockResolvedValueOnce(Response.json({ access_token: 'app-token', user: { id: 'customer' } }))
      .mockResolvedValueOnce(Response.json({ spendingIds: [42, 43, 44] }))
    vi.stubGlobal('fetch', request)
    const user = userEvent.setup()
    render(<SpendingPage account={account} />)

    fireEvent.change(screen.getByLabelText('Spending month'), {
      target: { value: '2026-03' },
    })
    await user.type(screen.getByLabelText('Food (£)'), '12.50')
    await user.type(screen.getByLabelText('Travel (£)'), '20')
    await user.type(screen.getByLabelText('Utilities (£)'), '30')
    await user.click(
      screen.getByRole('button', { name: 'Save spending' })
    )

    expect(
      await screen.findByText(/Spending saved for 2026-03.*42, 43, 44/)
    ).toBeInTheDocument()
    const [url, options] = request.mock.calls[2]
    expect(url).toMatch(/\/api\/v1\/spend\/batch$/)
    expect(options.headers.Authorization).toBe('Bearer app-token')
    expect(JSON.parse(options.body)).toEqual([
      { customerID: 'customer', categoryID: 2, month: '2026-03-01', week: null, amount: 12.5 },
      { customerID: 'customer', categoryID: 1, month: '2026-03-01', week: null, amount: 20 },
      { customerID: 'customer', categoryID: 3, month: '2026-03-01', week: null, amount: 30 },
    ])
    expect(screen.getByText('£62.50')).toBeInTheDocument()
  })
})
