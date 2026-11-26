import { afterEach, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InsightsPage from './InsightsPage'

const account = {
  homeAccountId: 'home',
  localAccountId: 'local',
  tenantId: 'tenant',
  environment: 'login.microsoftonline.com',
  username: 'learner@example.com',
}

vi.mock('../../auth/msal', () => ({
  msalInstance: { acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: 'entra-token' }) },
}))

afterEach(() => vi.unstubAllGlobals())

it('lets the customer retry when loading trends fails', async () => {
  const request = vi.fn()
    .mockResolvedValueOnce(Response.json({ access_token: 'app-token' }))
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ access_token: 'app-token' }))
    .mockResolvedValueOnce(Response.json({ months: [] }))
  vi.stubGlobal('fetch', request)
  const user = userEvent.setup()
  render(<InsightsPage account={account} />)

  expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t load your spending insights. Please try again.')
  await user.click(screen.getByRole('button', { name: 'Retry insights' }))

  expect(await screen.findByText(/No spending insights yet/)).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Reporting month')).not.toBeInTheDocument()
})

it('lets the customer retry a monthly request and then switch months', async () => {
  let novemberRequests = 0
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const { pathname, searchParams } = new URL(url)
    switch (pathname) {
      case '/api/v1/auth/':
        return Response.json({ access_token: 'app-token' })
      case '/api/v1/trends/':
        return Response.json({ months: [
          { month: '2026-10-01', total_carbon_kg: 0 },
          { month: '2026-11-01', total_carbon_kg: 10 },
        ] })
      case '/api/v1/summary/':
        if (searchParams.get('month') === '2026-11-01') {
          novemberRequests += 1
          return novemberRequests === 1
            ? new Response(null, { status: 500 })
            : Response.json({ total_carbon_kg: 10, categories: [{ category: 'Food', carbon_kg: 10 }] })
        }
        return Response.json({ total_carbon_kg: 0, categories: [] })
      case '/api/v1/recommendations/':
        return Response.json({ recommendations: [] })
      case '/api/v1/savings/':
        return Response.json({ total_savings_gbp: 0, total_carbon_reduction_kg: 0 })
      default:
        throw new Error(`Unexpected request: ${url}`)
    }
  }))
  const user = userEvent.setup()
  render(<InsightsPage account={account} />)

  expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t load insights for this month. Please try again.')
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByText('Food')).toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText('Reporting month'), '2026-10')

  expect(await screen.findByText('No recommendations for this month.')).toBeInTheDocument()
  expect(screen.getByText('No category breakdown for this month.')).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('loads authenticated insights and changes the date on all monthly requests', async () => {
  const request = vi.fn(async (url: string) => {
    const { pathname } = new URL(url)
    switch (pathname) {
      case '/api/v1/auth/':
        return Response.json({ access_token: 'app-token' })
      case '/api/v1/trends/':
        return Response.json({ months: [
          { month: '2026-09-01', total_carbon_kg: 100, total_spend_gbp: 95 },
          { month: '2026-11-01', total_carbon_kg: 1182.33, total_spend_gbp: 426.11 },
        ] })
      case '/api/v1/summary/':
        return Response.json({ total_spend_gbp: 426.11, total_carbon_kg: 1182.33, categories: [{ category: 'Travel', carbon_kg: 1182.33, monthly_spend_gbp: 426.11 }] })
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

  const reveal = await screen.findByRole('button', { name: 'Reveal recommendation for Travel' })
  expect(reveal).toHaveAttribute('aria-expanded', 'false')
  expect(reveal).not.toHaveAccessibleDescription()
  reveal.focus()
  await user.keyboard('{Enter}')
  const hide = screen.getByRole('button', { name: 'Hide recommendation for Travel' })
  expect(hide).toBe(reveal)
  expect(hide).toHaveFocus()
  expect(hide).toHaveAttribute('aria-expanded', 'true')
  expect(hide).toHaveAccessibleDescription(/Switch one journey to public transport\./)
  expect(within(screen.getByRole('region', { name: 'Recommendations' })).getByText('£59.66')).toBeInTheDocument()
  await user.click(hide)
  expect(reveal).toHaveAttribute('aria-expanded', 'false')
  expect(reveal).not.toHaveAccessibleDescription()
  await user.click(reveal)
  expect(screen.getByText('There’s no spending from the previous month to compare.')).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Monthly spending' })).toHaveTextContent('£426.11')
  expect(screen.getByRole('heading', { name: '2 months of spending added' })).toBeInTheDocument()
  expect(screen.getByRole('progressbar', { name: /Recorded months/ })).toHaveAttribute('value', '2')
  await user.selectOptions(screen.getByLabelText('Reporting month'), '2026-09')
  expect(await screen.findByRole('button', { name: 'Reveal recommendation for Travel' })).toHaveAttribute('aria-expanded', 'false')

  const protectedCalls = vi.mocked(fetch).mock.calls.slice(1)
  expect(protectedCalls).toHaveLength(7)
  expect(new URL(String(protectedCalls[0][0])).searchParams.get('months')).toBe('12')
  for (const [, options] of protectedCalls) {
    expect(options?.headers).toEqual({ Authorization: 'Bearer app-token' })
  }
  for (const month of ['2026-11-01', '2026-09-01']) {
    const urls = protectedCalls.map(([url]) => new URL(String(url)))
    expect(urls.filter((url) => url.searchParams.get('month') === month).map((url) => url.pathname))
      .toEqual(['/api/v1/summary/', '/api/v1/recommendations/', '/api/v1/savings/'])
  }

  const november = screen.getByRole('button', { name: /Nov 2026, 1,182\.33/ })
  november.focus()
  await user.keyboard('{Enter}')
  expect(screen.getByLabelText('Reporting month')).toHaveValue('2026-11')
  expect(november).toHaveFocus()
  expect(november).toHaveAttribute('aria-pressed', 'true')
  expect(await screen.findByRole('button', { name: 'Reveal recommendation for Travel' })).toHaveAttribute('aria-expanded', 'false')
  const requested = request.mock.calls.length
  await user.click(screen.getByRole('button', { name: /^Spend$/ }))
  expect(screen.getByRole('region', { name: 'Spending over time' })).toBeInTheDocument()
  expect(november).toHaveAccessibleName('Nov 2026, £426.11')
  expect(november).toHaveAttribute('aria-pressed', 'true')
  expect(request).toHaveBeenCalledTimes(requested)
})
