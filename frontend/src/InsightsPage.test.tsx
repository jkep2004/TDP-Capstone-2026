import { afterEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InsightsPage from './InsightsPage'

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

it('loads authenticated insights and changes the date on all monthly requests', async () => {
  const request = vi.fn(async (url: string) => {
    const { pathname } = new URL(url)
    switch (pathname) {
      case '/api/v1/auth/':
        return Response.json({ access_token: 'app-token' })
      case '/api/v1/trends/':
        return Response.json({ months: [
          { month: '2026-09-01', total_carbon_kg: 100 },
          { month: '2026-11-01', total_carbon_kg: 1182.33 },
        ] })
      case '/api/v1/summary/':
        return Response.json({ total_carbon_kg: 1182.33, categories: [{ category: 'Travel', carbon_kg: 1182.33 }] })
      case '/api/v1/recommendations/':
        return Response.json({ recommendations: [{
          category: 'Travel', advice: 'Switch one journey to public transport.',
          projected_savings_gbp: 59.66, projected_carbon_reduction_kg: 165.53,
        }] })
      case '/api/v1/savings/':
        return Response.json({ total_savings_gbp: 59.66, total_carbon_reduction_kg: 165.53 })
      default:
        return new Response(null, { status: 404 })
    }
  })
  vi.stubGlobal('fetch', request)
  const user = userEvent.setup()
  render(<InsightsPage account={account} />)

  expect(await screen.findByText('Switch one journey to public transport.')).toBeInTheDocument()
  expect(screen.getByText('Month-to-month comparison unavailable.')).toBeInTheDocument()
  expect(screen.getAllByText('£59.66')).toHaveLength(2)
  await user.selectOptions(screen.getByLabelText('Reporting month'), '2026-09')
  expect(await screen.findByText('Switch one journey to public transport.')).toBeInTheDocument()

  const protectedCalls = vi.mocked(fetch).mock.calls.slice(1)
  expect(protectedCalls).toHaveLength(7)
  for (const [, options] of protectedCalls) {
    expect(options?.headers).toEqual({ Authorization: 'Bearer app-token' })
  }
  for (const month of ['2026-11-01', '2026-09-01']) {
    const urls = protectedCalls.map(([url]) => new URL(String(url)))
    expect(urls.filter((url) => url.searchParams.get('month') === month).map((url) => url.pathname))
      .toEqual(['/api/v1/summary/', '/api/v1/recommendations/', '/api/v1/savings/'])
  }
})
