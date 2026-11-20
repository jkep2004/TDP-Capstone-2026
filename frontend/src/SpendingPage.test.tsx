import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import SpendingPage from './SpendingPage'

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
  it('calculates and confirms a manual spending submission for the selected month', async () => {
    const user = userEvent.setup()
    render(<SpendingPage />)

    fireEvent.change(screen.getByLabelText('Spending month'), {
      target: { value: '2026-03' },
    })
    await user.type(screen.getByLabelText('Food (£)'), '12.50')
    await user.type(screen.getByLabelText('Travel (£)'), '20')
    await user.type(screen.getByLabelText('Utilities (£)'), '30')
    await user.click(
      screen.getByRole('button', { name: 'Submit demo spending' })
    )

    expect(
      await screen.findByText(/Demo submission for 2026-03: £62\.50\./)
    ).toBeInTheDocument()
    expect(screen.getByText('£62.50')).toBeInTheDocument()
  })
})
