import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { callApi, resolveSpendingCategories, saveSpending } from './api'
import { msalInstance } from './msal'

vi.mock('./msal', () => ({
  msalInstance: {
    acquireTokenSilent: vi.fn(),
    getActiveAccount: vi.fn(),
    getAllAccounts: vi.fn(() => []),
  },
}))

const account = {
  homeAccountId: 'home', localAccountId: 'local', tenantId: 'tenant',
  environment: 'login.microsoftonline.com', username: 'learner@example.com',
}
const entries = [{ month: '2026-03-01', week: null, categoryID: 1, amount: 12 }]
const request = vi.fn<typeof fetch>()

beforeEach(() => {
  request.mockReset()
  vi.mocked(msalInstance.acquireTokenSilent).mockReset()
  vi.stubGlobal('fetch', request)
})

afterEach(() => vi.unstubAllGlobals())

it('refuses to call the API when no account is available', async () => {
  await expect(callApi()).rejects.toThrow('User not authenticated')

  expect(msalInstance.acquireTokenSilent).not.toHaveBeenCalled()
  expect(request).not.toHaveBeenCalled()
})

it('does not submit spending when token exchange fails', async () => {
  request.mockResolvedValueOnce(new Response(null, { status: 401 }))
  vi.mocked(msalInstance.acquireTokenSilent).mockResolvedValueOnce({
    accessToken: 'entra-token',
  } as Awaited<ReturnType<typeof msalInstance.acquireTokenSilent>>)

  await expect(saveSpending(entries, account)).rejects.toThrow('Token exchange failed (401)')

  expect(request).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/\/api\/v1\/auth\/$/),
    expect.objectContaining({ method: 'POST', body: JSON.stringify({ token: 'entra-token' }) }))
})

it.each([
  [409, 'Spending already exists for this month.', 'Spending already exists for this month.'],
  [409, { code: 'duplicate' }, 'Save failed (HTTP 409)'],
  [503, 'Unavailable', 'Save failed (HTTP 503)'],
])('handles a save error with status %s and detail %j', async (status, detail, message) => {
  vi.mocked(msalInstance.acquireTokenSilent).mockResolvedValueOnce({
    accessToken: 'entra-token',
  } as Awaited<ReturnType<typeof msalInstance.acquireTokenSilent>>)
  request
    .mockResolvedValueOnce(Response.json({ access_token: 'app-token', user: { id: 'customer' } }))
    .mockResolvedValueOnce(Response.json({ detail }, { status }))

  await expect(saveSpending(entries, account)).rejects.toThrow(message)
  expect(request).toHaveBeenCalledTimes(2)
})

it('rejects a category when the only match is a subcategory', async () => {
  request.mockResolvedValueOnce(Response.json([{ id: 1, name: 'Food', parent_id: 2 }]))

  await expect(resolveSpendingCategories(['food'])).rejects.toThrow('The API does not offer the food category.')
})
