import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getCategories, saveSpending } from './api'
import SpendingForm from './SpendingForm'

vi.mock('./api', () => ({
  getCategories: vi.fn(),
  saveSpending: vi.fn(),
}))

const account = {
  homeAccountId: 'home', localAccountId: 'local', tenantId: 'tenant',
  environment: 'login.microsoftonline.com', username: 'learner@example.com',
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getCategories).mockResolvedValue([
    { id: 1, name: 'Food', parent_id: null },
    { id: 2, name: 'Travel', parent_id: null },
    { id: 3, name: 'Utilities', parent_id: null },
  ])
})

it('disables saving when the customer is signed out', async () => {
  render(<SpendingForm month="2026-03" />)

  await screen.findByRole('spinbutton', { name: /Food/ })
  expect(screen.getByRole('button', { name: 'Save spending' })).toBeDisabled()
})

it('starts with saving disabled and lets the customer retry a failed category request', async () => {
  vi.mocked(getCategories).mockRejectedValueOnce(new Error('Could not load categories (HTTP 503)'))
  const user = userEvent.setup()
  render(<SpendingForm month="2026-03" account={account} />)

  expect(screen.getByText('Loading spending categories…')).toBeInTheDocument()
  const save = screen.getByRole('button', { name: 'Save spending' })
  expect(save).toBeDisabled()
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load categories (HTTP 503)')
  expect(save).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Retry loading categories' }))

  expect(await screen.findByRole('spinbutton', { name: /Food/ })).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(save).toBeEnabled()
})

it('shows an empty state and disables saving when the API returns no categories', async () => {
  vi.mocked(getCategories).mockResolvedValueOnce([])
  render(<SpendingForm month="2026-03" account={account} />)

  expect(await screen.findByText('No spending categories are available.')).toBeInTheDocument()
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Save spending' })).toBeDisabled()
})

it('blocks a save when every subcategory amount is blank', async () => {
  vi.mocked(getCategories).mockResolvedValueOnce([
    { id: 1, name: 'Food', parent_id: null },
    { id: 2, name: 'Groceries', parent_id: 1 },
  ])
  const user = userEvent.setup()
  render(<SpendingForm month="2026-03" account={account} />)

  await user.click(await screen.findByRole('checkbox', { name: 'By subcategory for Food' }))
  await user.click(screen.getByRole('button', { name: 'Save spending' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Enter at least one spending amount.')
  expect(saveSpending).not.toHaveBeenCalled()
})

it.each(['-1', '0.001', '100001'])('blocks an invalid amount of %s', async (amount) => {
  const user = userEvent.setup()
  render(<SpendingForm month="2026-03" account={account} />)
  const food = await screen.findByRole('spinbutton', { name: /Food/ })
  await user.type(food, amount)
  await user.type(screen.getByRole('spinbutton', { name: /Travel/ }), '0')
  await user.type(screen.getByRole('spinbutton', { name: /Utilities/ }), '0')
  await user.click(screen.getByRole('button', { name: 'Save spending' }))

  expect(food).toBeInvalid()
  expect(saveSpending).not.toHaveBeenCalled()
})

it('keeps entered amounts after a failed save and allows a retry', async () => {
  vi.mocked(saveSpending)
    .mockRejectedValueOnce(new Error('Save failed (HTTP 503)'))
    .mockResolvedValueOnce({ spendingIds: [11, 12, 13] })
  const user = userEvent.setup()
  render(<SpendingForm month="2026-03" account={account} />)
  const food = await screen.findByRole('spinbutton', { name: /Food/ })
  const save = screen.getByRole('button', { name: 'Save spending' })
  await user.type(food, '0.10')
  await user.type(screen.getByRole('spinbutton', { name: /Travel/ }), '0.20')
  await user.type(screen.getByRole('spinbutton', { name: /Utilities/ }), '0')
  await user.click(save)

  expect(await screen.findByRole('alert')).toHaveTextContent('Save failed (HTTP 503)')
  expect(food).toHaveValue(0.1)
  expect(save).toBeEnabled()
  await user.click(save)

  expect(await screen.findByText(/Spending saved for 2026-03 \(\u00a30\.30\)/)).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(save).toBeDisabled()
  expect(saveSpending).toHaveBeenCalledTimes(2)
})
