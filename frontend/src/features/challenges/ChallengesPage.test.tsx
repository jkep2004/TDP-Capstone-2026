import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ChallengeStatus } from '../../services/api'
import ChallengesPage from './ChallengesPage'

vi.mock('../../auth/msal', () => ({
  msalInstance: { acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: 'entra-token' }) },
}))

const account = {
  homeAccountId: 'home', localAccountId: 'local', tenantId: 'tenant',
  environment: 'login.microsoftonline.com', username: 'learner@example.com',
}

const requests = vi.fn<typeof fetch>()
const challenge = {
  category_id: 2, category: 'Food', recommendation: 'Reduce takeaway meals and batch cook.',
  lower_carbon_alternative: null, action: 'Cook at home instead of ordering a takeaway.',
}

beforeEach(() => {
  requests.mockReset()
  vi.stubGlobal('fetch', requests)
})
afterEach(() => vi.unstubAllGlobals())

function mockChallengeApi({ loseCompletionResponse = false } = {}) {
  let status: ChallengeStatus = 'NOT_STARTED'
  const writes: { month: string | null; status: ChallengeStatus; headers: HeadersInit | undefined }[] = []

  requests.mockImplementation(async (input, init) => {
    const url = new URL(String(input))
    const month = url.searchParams.get('month')
    switch (url.pathname) {
      case '/api/v1/auth/':
        return Response.json({ access_token: 'app-token' })
      case '/api/v1/trends/':
        return Response.json({ months: [{ month: '2026-10-01' }, { month: '2026-11-01' }] })
      case '/api/v1/challenges/medal':
        return Response.json(status === 'COMPLETED'
          ? { completed_challenges: 3, medal: 'Gold' }
          : { completed_challenges: 2, medal: 'Silver' })
      case '/api/v1/challenges/':
        return Response.json({ challenges: month === '2026-11-01' ? [{ ...challenge, status }] : [] })
      case '/api/v1/challenges/2':
        if (init?.method !== 'PATCH' || month !== '2026-11-01') return Response.json({}, { status: 422 })
        status = JSON.parse(String(init.body)).status
        writes.push({ month, status, headers: init.headers })
        if (status === 'COMPLETED' && loseCompletionResponse) throw new TypeError('Connection lost')
        return Response.json({ ...challenge, status })
      default:
        throw new Error(`Unexpected request: ${url.pathname}`)
    }
  })

  return writes
}

it('starts and completes a monthly challenge, then refreshes the account medal', async () => {
  const writes = mockChallengeApi()
  const user = userEvent.setup()
  const { container, unmount } = render(<ChallengesPage account={account} onAddSpending={vi.fn()} />)

  expect(await screen.findByText('1 more challenge to earn Gold.')).toBeVisible()
  const card = within(await screen.findByRole('region', { name: 'Food' }))
  expect(screen.getByLabelText('Challenge month')).toHaveValue('2026-11')
  expect(card.getByText('Cook at home instead of ordering a takeaway.')).toBeVisible()
  await user.click(card.getByRole('button', { name: 'Start challenge' }))
  await user.click(await card.findByRole('button', { name: 'Mark complete' }))

  await expect.poll(() => writes.map(({ status }) => status)).toEqual(['IN_PROGRESS', 'COMPLETED'])
  expect(writes.every(({ month }) => month === '2026-11-01')).toBe(true)
  expect(writes[0].headers).toEqual({ Authorization: 'Bearer app-token', 'Content-Type': 'application/json' })
  expect(await screen.findByText('Gold earned!')).toBeVisible()
  expect(card.getByRole('button', { name: 'Challenge complete' })).toHaveAttribute('aria-disabled', 'true')
  expect(container.querySelector('.challenge-confetti')).toHaveAttribute('aria-hidden', 'true')

  unmount()
  render(<ChallengesPage account={account} onAddSpending={vi.fn()} />)
  expect(await screen.findByText('Gold earned!')).toBeVisible()
  expect(await screen.findByRole('button', { name: 'Food Completed' })).toBeVisible()
  expect(document.querySelector('.challenge-confetti')).not.toBeInTheDocument()
})

it('shows the selected month’s challenges and keeps the account medal across months', async () => {
  mockChallengeApi()
  const user = userEvent.setup()
  render(<ChallengesPage account={account} onAddSpending={vi.fn()} />)

  expect(await screen.findByRole('button', { name: 'Food Available' })).toBeVisible()
  await user.selectOptions(screen.getByLabelText('Challenge month'), '2026-10')
  expect(await screen.findByText(/No challenges for October 2026/)).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Food Available' })).not.toBeInTheDocument()
  expect(screen.getByText('1 more challenge to earn Gold.')).toBeVisible()
})

it('recovers the saved challenge and medal after a lost completion response', async () => {
  const writes = mockChallengeApi({ loseCompletionResponse: true })
  const user = userEvent.setup()
  render(<ChallengesPage account={account} onAddSpending={vi.fn()} />)

  await user.click(await screen.findByRole('button', { name: 'Start challenge' }))
  await user.click(await screen.findByRole('button', { name: 'Mark complete' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Refresh the challenges and try again.')

  await user.click(screen.getByRole('button', { name: 'Refresh challenges' }))

  expect(await screen.findByRole('button', { name: 'Food Completed' })).toBeVisible()
  expect(await screen.findByText('Gold earned!')).toBeVisible()
  expect(writes.map(({ status }) => status)).toEqual(['IN_PROGRESS', 'COMPLETED'])
})
