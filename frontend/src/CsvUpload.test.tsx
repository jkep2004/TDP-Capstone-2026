import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import CsvUpload from './CsvUpload'

afterEach(() => vi.unstubAllGlobals())

const validCsv =
  'customer_id,week,travel,food,utilities\n' +
  '1,1,12.50,30,40\n' +
  '2,1,100,100,100\n' +
  '1,2,0,20.25,15'

function createCsvFile(contents: string) {
  const file = new File([contents], 'spending.csv', { type: 'text/csv' })
  Object.defineProperty(file, 'text', {
    value: vi.fn().mockResolvedValue(contents),
  })
  return file
}

describe('CsvUpload', () => {
  it('calculates carbon impact using only the previewed weekly rows', async () => {
    const customerId = 'b55b72a0-1df6-4d73-bf41-8110a29ac51d'
    const request = vi.fn().mockResolvedValueOnce(Response.json([
      { id: 1, name: 'Travel', parent_id: null },
      { id: 2, name: 'Food', parent_id: null },
      { id: 3, name: 'Utilities', parent_id: null },
    ])).mockResolvedValueOnce(Response.json({
      totalCarbonKg: 2,
      breakdown: [{ category: 1, amount: 12.5, carbonKg: 2 }],
    }))
    vi.stubGlobal('fetch', request)
    const user = userEvent.setup()
    render(<CsvUpload month="2026-10" customerId={customerId} />)

    await user.upload(screen.getByLabelText('Choose a CSV file'), createCsvFile(validCsv))
    await user.click(screen.getByRole('button', { name: 'Preview spending' }))
    await user.click(await screen.findByRole('button', { name: 'Calculate carbon impact' }))

    expect(await screen.findByText('2 kg CO₂e')).toBeInTheDocument()
    expect(request).toHaveBeenCalledTimes(2)
    expect(request.mock.calls[0][0]).toMatch(/\/api\/v1\/categories\/$/)
    const [url, options] = request.mock.calls[1]
    expect(url).toMatch(/\/api\/v1\/calculate\/$/)
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({
      spending: [
        { customerID: customerId, month: '2026-10-01', week: 1, categoryID: 1, amount: 12.5 },
        { customerID: customerId, month: '2026-10-01', week: 1, categoryID: 2, amount: 30 },
        { customerID: customerId, month: '2026-10-01', week: 1, categoryID: 3, amount: 40 },
        { customerID: customerId, month: '2026-10-01', week: 2, categoryID: 1, amount: 0 },
        { customerID: customerId, month: '2026-10-01', week: 2, categoryID: 2, amount: 20.25 },
        { customerID: customerId, month: '2026-10-01', week: 2, categoryID: 3, amount: 15 },
      ],
    })
  })

  // Preview only demo-customer rows and calculate their totals for the chosen month.
  it('previews valid records for the demo customer and excludes other customers', async () => {
    const user = userEvent.setup()
    render(<CsvUpload month="2026-10" />)

    const file = createCsvFile(validCsv)
    await user.upload(screen.getByLabelText('Choose a CSV file'), file)
    await user.click(screen.getByRole('button', { name: 'Preview spending' }))

    expect(
      await screen.findByRole('heading', { name: 'Spending preview' })
    ).toBeInTheDocument()
    expect(screen.getByText('Selected month:')).toHaveTextContent('October 2026')
    expect(
      within(screen.getByRole('table')).getAllByRole('row')
    ).toHaveLength(4)
    expect(screen.getByText('£117.75')).toBeInTheDocument()
    expect(screen.queryByText('£100.00')).not.toBeInTheDocument()
  })

  // Files without the required columns should show a clear validation error.
  it('shows an error when the selected CSV has invalid headers', async () => {
    const user = userEvent.setup()
    render(<CsvUpload month="2026-10" />)

    await user.upload(
      screen.getByLabelText('Choose a CSV file'),
      createCsvFile('customer_id,week,travel,food\n1,1,10,20')
    )
    await user.click(screen.getByRole('button', { name: 'Preview spending' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Use these columns:'
    )
  })
})
