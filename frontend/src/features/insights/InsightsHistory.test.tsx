import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import InsightsHistory from './InsightsHistory'

it('filters history by calendar months without changing the selected reporting month', async () => {
  const months = [
    { month: '2026-01', totalCarbonKg: 120, totalSpendGbp: 250 },
    { month: '2026-05', totalCarbonKg: 100, totalSpendGbp: 200 },
    { month: '2026-07', totalCarbonKg: 80, totalSpendGbp: 175 },
    { month: '2026-10', totalCarbonKg: 60, totalSpendGbp: 125 },
  ]
  const onSelect = vi.fn()
  const user = userEvent.setup()
  render(<InsightsHistory months={months} current="2026-10" onSelect={onSelect} />)

  const range = screen.getByLabelText('History range')
  expect(range).toHaveValue('6')
  expect(screen.getByRole('button', { name: /May 2026/ })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Jan 2026/ })).not.toBeInTheDocument()
  await user.selectOptions(range, '3')
  expect(screen.queryByRole('button', { name: /Jul 2026/ })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Oct 2026/ })).toHaveAttribute('aria-pressed', 'true')
  await user.selectOptions(range, '12')
  expect(onSelect).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: /Jan 2026/ }))
  expect(onSelect).toHaveBeenCalledExactlyOnceWith('2026-01')
})
