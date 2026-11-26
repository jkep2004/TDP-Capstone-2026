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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json([])))
    const user = userEvent.setup()
    render(<SpendingPage />)

    expect(
      screen.getByRole('heading', { name: 'Enter spending manually' })
    ).toBeInTheDocument()

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
  it('renders top-level categories from the API and saves monthly totals using their IDs', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(Response.json([
        { id: 27, name: 'Housing', parent_id: null },
        { id: 42, name: 'Rent', parent_id: 27 },
        { id: 31, name: 'Shopping', parent_id: null },
      ]))
      .mockResolvedValueOnce(Response.json({ access_token: 'app-token', user: { id: 'customer' } }))
      .mockResolvedValueOnce(Response.json({ spendingIds: [42, 43] }))
    vi.stubGlobal('fetch', request)
    const user = userEvent.setup()
    render(<SpendingPage account={account} />)

    fireEvent.change(screen.getByLabelText('Spending month'), {
      target: { value: '2026-03' },
    })
    await user.type(await screen.findByRole('spinbutton', { name: /Housing/ }), '12.50')
    await user.type(screen.getByRole('spinbutton', { name: /Shopping/ }), '20')
    expect(screen.queryByRole('spinbutton', { name: /Rent|Food|Travel|Utilities/ })).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Save spending' })
    )

    expect(
      await screen.findByText('Spending saved for March 2026 (£32.50).')
    ).toBeInTheDocument()
    expect(request).toHaveBeenCalledTimes(3)
    expect(request.mock.calls[0][0]).toMatch(/\/api\/v1\/categories\/$/)
    const [url, options] = request.mock.calls[2]
    expect(url).toMatch(/\/api\/v1\/spend\/batch$/)
    expect(options.headers.Authorization).toBe('Bearer app-token')
    expect(JSON.parse(options.body)).toEqual([
      { customerID: 'customer', categoryID: 27, month: '2026-03-01', week: null, amount: 12.5 },
      { customerID: 'customer', categoryID: 31, month: '2026-03-01', week: null, amount: 20 },
    ])
    expect(screen.getByText('£32.50')).toBeInTheDocument()
  })

  it('saves multiple subcategory amounts with their parent ID and counts each amount once', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(Response.json([
        { id: 27, name: 'Housing', parent_id: null },
        { id: 42, name: 'Rent', parent_id: 27 },
        { id: 43, name: 'Mortgage', parent_id: 27 },
        { id: 44, name: 'Repairs', parent_id: 27 },
        { id: 31, name: 'Shopping', parent_id: null },
        { id: 51, name: 'Clothing', parent_id: 31 },
      ]))
      .mockResolvedValueOnce(Response.json({ access_token: 'app-token', user: { id: 'customer' } }))
      .mockResolvedValueOnce(Response.json({ spendingIds: [101, 102, 103] }))
    vi.stubGlobal('fetch', request)
    const user = userEvent.setup()
    render(<SpendingPage account={account} />)

    fireEvent.change(screen.getByLabelText('Spending month'), { target: { value: '2026-03' } })
    await user.type(await screen.findByRole('spinbutton', { name: /Housing/ }), '500')
    const breakdown = screen.getByRole('checkbox', { name: 'By subcategory for Housing' })
    await user.click(breakdown)
    expect(screen.queryByRole('spinbutton', { name: /Housing|Clothing/ })).not.toBeInTheDocument()
    await user.type(screen.getByRole('spinbutton', { name: /Rent/ }), '120.10')
    await user.type(screen.getByRole('spinbutton', { name: /Mortgage/ }), '15.20')
    await user.click(breakdown)
    expect(screen.getByRole('spinbutton', { name: /Housing/ })).toHaveValue(500)
    await user.click(breakdown)
    await user.type(screen.getByRole('spinbutton', { name: /Shopping/ }), '20')
    expect(screen.getByText('£155.30')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save spending' }))

    expect(await screen.findByText('Spending saved for March 2026 (£155.30).')).toBeInTheDocument()
    expect(request).toHaveBeenCalledTimes(3)
    expect(JSON.parse(request.mock.calls[2][1].body)).toEqual([
      { customerID: 'customer', categoryID: 27, subcategoryID: 42, month: '2026-03-01', week: null, amount: 120.1 },
      { customerID: 'customer', categoryID: 27, subcategoryID: 43, month: '2026-03-01', week: null, amount: 15.2 },
      { customerID: 'customer', categoryID: 31, month: '2026-03-01', week: null, amount: 20 },
    ])
  })
})
