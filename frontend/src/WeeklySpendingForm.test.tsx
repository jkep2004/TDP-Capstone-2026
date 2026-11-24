import { afterEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeeklySpendingForm from './WeeklySpendingForm'

const account = {
  homeAccountId: 'home',
  localAccountId: 'local',
  tenantId: 'tenant',
  environment: 'login.microsoftonline.com',
  username: 'learner@example.com',
}

vi.mock('./msal', () => ({
  msalInstance: {
    acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: 'entra-token' }),
  },
}))

afterEach(() => vi.unstubAllGlobals())

it('saves a weekly entry with the application token and shows the database row ID', async () => {
  const customerId = 'b55b72a0-1df6-4d73-bf41-8110a29ac51d'
  const request = vi.fn()
    .mockResolvedValueOnce(Response.json([{ id: 5, name: 'Housing', parent_id: null }]))
    .mockResolvedValueOnce(Response.json({ access_token: 'app-token', user: { id: customerId } }))
    .mockResolvedValueOnce(Response.json({ spendingId: 42 }))
  vi.stubGlobal('fetch', request)

  const user = userEvent.setup()
  render(<WeeklySpendingForm account={account} month="2026-11" />)
  await user.type(screen.getByLabelText('Week of month'), '2')
  await screen.findByRole('option', { name: 'Housing' })
  await user.selectOptions(screen.getByLabelText('Category'), '5')
  await user.type(screen.getByLabelText('Amount (£)'), '12.50')
  await user.click(screen.getByRole('button', { name: 'Save spending' }))

  expect(await screen.findByRole('status')).toHaveTextContent('Spending ID 42')
  expect(request).toHaveBeenCalledTimes(3)
  expect(request.mock.calls[0][0]).toMatch(/\/api\/v1\/categories\/$/)
  const [authUrl, authOptions] = request.mock.calls[1]
  expect(authUrl).toMatch(/\/api\/v1\/auth\/$/)
  expect(JSON.parse(authOptions.body)).toEqual({ token: 'entra-token' })
  const [spendUrl, spendOptions] = request.mock.calls[2]
  expect(spendUrl).toMatch(/\/api\/v1\/spend\/$/)
  expect(spendOptions.method).toBe('POST')
  expect(spendOptions.headers.Authorization).toBe('Bearer app-token')
  expect(JSON.parse(spendOptions.body)).toEqual({
    customerID: customerId,
    month: '2026-11-01',
    week: 2,
    categoryID: 5,
    amount: 12.5,
  })
})
