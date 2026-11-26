import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { resolveSpendingCategories, saveSpending } from './api'
import { msalInstance } from './msal'

vi.mock('./msal', () => ({
  msalInstance: {
    acquireTokenSilent: vi.fn(),
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

it('asks the customer to sign in again when Microsoft requires interaction', async () => {
  vi.mocked(msalInstance.acquireTokenSilent).mockRejectedValueOnce(
    new InteractionRequiredAuthError('interaction_required', 'Please complete sign-in.'),
  )

  await expect(saveSpending(entries, account)).rejects.toMatchObject({
    customerMessage: 'Please sign out and sign in again.',
  })

  expect(request).not.toHaveBeenCalled()
})

it('does not submit spending when token exchange fails', async () => {
  request.mockResolvedValueOnce(new Response(null, { status: 401 }))
  vi.mocked(msalInstance.acquireTokenSilent).mockResolvedValueOnce({
    accessToken: 'entra-token',
  } as Awaited<ReturnType<typeof msalInstance.acquireTokenSilent>>)

  await expect(saveSpending(entries, account)).rejects.toMatchObject({
    message: 'Token exchange failed (401)',
    customerMessage: 'Please sign out and sign in again.',
  })

  expect(request).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/\/api\/v1\/auth\/$/),
    expect.objectContaining({ method: 'POST', body: JSON.stringify({ token: 'entra-token' }) }))
})

it.each([
  [409, 'Duplicate spending (category ID 1).', 'Save failed (HTTP 409)'],
  [409, { code: 'duplicate' }, 'Save failed (HTTP 409)'],
  [503, 'Unavailable', 'Save failed (HTTP 503)'],
])('handles a save error with status %s and detail %j', async (status, detail, message) => {
  vi.mocked(msalInstance.acquireTokenSilent).mockResolvedValueOnce({
    accessToken: 'entra-token',
  } as Awaited<ReturnType<typeof msalInstance.acquireTokenSilent>>)
  request
    .mockResolvedValueOnce(Response.json({ access_token: 'app-token', user: { id: 'customer' } }))
    .mockResolvedValueOnce(Response.json({ detail }, { status }))

  await expect(saveSpending(entries, account)).rejects.toMatchObject({
    message,
    ...(status === 409 && { customerMessage: expect.stringContaining('already been saved') }),
  })
  expect(request).toHaveBeenCalledTimes(2)
})

it('rejects a category when the only match is a subcategory', async () => {
  request.mockResolvedValueOnce(Response.json([{ id: 1, name: 'Food', parent_id: 2 }]))

  await expect(resolveSpendingCategories(['food'])).rejects.toThrow('The API does not offer the food category.')
})
