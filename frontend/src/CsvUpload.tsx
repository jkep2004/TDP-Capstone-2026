import { useState } from 'react'
import type { AccountInfo } from '@azure/msal-browser'
import { parseSpendingCsv } from './utils/parseSpendingCsv'
import type { SpendingRow } from './utils/parseSpendingCsv'
import { calculateSpending, resolveSpendingCategories, saveSpending } from './api'

const categories = ['travel', 'food', 'utilities'] as const

type CsvUploadProps = {
  month: string
  customerId?: string
  account?: AccountInfo
}

function CsvUpload({ month, customerId, account }: CsvUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [fileRows, setFileRows] = useState<SpendingRow[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<number>()
  const customers = [...new Set(fileRows.map((row) => row.customer_id))]
  const rows = fileRows.filter((row) => row.customer_id === selectedCustomer)
  const [isReading, setIsReading] = useState(false)
  const [error, setError] = useState('')
  const [calculation, setCalculation] = useState<{
    totalCarbonKg: number
    categoryTotals: { category: string; carbonKg: number }[]
  }>()
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculationError, setCalculationError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState<{ month: string; ids: number[] }>()
  const busy = isReading || isCalculating || saving

  const clearCalculation = () => {
    setCalculation(undefined)
    setCalculationError('')
  }

  const buildEntries = async () => {
    if (rows.some((row) => row.week > 5)) {
      throw new Error('Week numbers must be between 1 and 5 within the selected month.')
    }
    const categoryIds = await resolveSpendingCategories(categories)
    const entries = rows.flatMap((row) =>
      categoryIds.map(({ category, categoryID }) => ({
        month: `${month}-01`, week: row.week, categoryID, amount: row[category],
      }))
    )
    return { categoryIds, entries }
  }

  const save = async () => {
    if (!month || !account || busy) return
    setSaving(true)
    setSaveError('')
    setSaved(undefined)
    try {
      const { entries } = await buildEntries()
      const result = await saveSpending(entries, account)
      setSaved({ month, ids: result.spendingIds })
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save spending.')
    } finally {
      setSaving(false)
    }
  }

  const calculate = async () => {
    if (!month || !customerId) return
    clearCalculation()
    setIsCalculating(true)
    try {
      const { categoryIds, entries } = await buildEntries()
      const result = await calculateSpending(entries.map((entry) => ({ ...entry, customerID: customerId })))
      setCalculation({
        totalCarbonKg: result.totalCarbonKg,
        categoryTotals: categoryIds.map(({ category, categoryID }) => ({
          category,
          carbonKg: result.breakdown.filter((item) => item.category === categoryID)
            .reduce((total, item) => total + item.carbonKg, 0),
        })),
      })
    } catch (error) {
      setCalculationError(error instanceof Error ? error.message : 'Calculation failed.')
    } finally {
      setIsCalculating(false)
    }
  }

  const selectedMonth = month
    ? new Intl.DateTimeFormat('en-GB', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${month}-01T00:00:00Z`))
    : 'No month selected'

  const readFile = async () => {
    if (!file) {
      return
    }

    setError('')
    clearCalculation()
    setFileRows([])
    setSaved(undefined)
    setSaveError('')
    setIsReading(true)

    try {
      const text = await file.text()
      const parsedRows = parseSpendingCsv(text)

      setFileRows(parsedRows)
      setSelectedCustomer(parsedRows[0]?.customer_id)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'We couldn’t read this file. Please select it again.'
      )
    } finally {
      setIsReading(false)
    }
  }

  // Add amounts in pence to calculate the preview totals.
  const totals = rows.reduce(
    (sum, row) => ({
      travel: sum.travel + Math.round(row.travel * 100),
      food: sum.food + Math.round(row.food * 100),
      utilities: sum.utilities + Math.round(row.utilities * 100),
    }),
    { travel: 0, food: 0, utilities: 0 }
  )

  const formatPence = (pence: number) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(pence / 100)

  return (
    <div>
      <p className="help-text">
        Selected month: <strong>{selectedMonth}</strong>
      </p>

      <div className="field">
        <label htmlFor="spending-csv">Choose a CSV file</label>

        <input
          id="spending-csv"
          type="file"
          accept=".csv"
          disabled={busy}
          onChange={(event) => {
            const selectedFile = event.target.files?.[0] ?? null

            setFile(selectedFile)
            setFileRows([])
            setSaved(undefined)
            setSaveError('')
            setError('')
            clearCalculation()
          }}
        />
      </div>

      {file && (
        <p role="status">
          Selected file: <strong>{file.name}</strong>
        </p>
      )}

      <p className="help-text">
        Preview the file, then save the selected rows to your signed-in account.
      </p>

      <button
        type="button"
        onClick={readFile}
        disabled={!file || busy}
      >
        {isReading ? 'Reading file…' : 'Preview spending'}
      </button>

      {error && <p role="alert">{error}</p>}

      {rows.length > 0 && (
        <section aria-labelledby="csv-preview-heading">
          <h3 id="csv-preview-heading">Spending preview</h3>

          {customers.length > 1 && (
            <div className="field">
              <label htmlFor="csv-customer">Customer in file</label>
              <select id="csv-customer" value={selectedCustomer} disabled={busy} onChange={(event) => {
                setSelectedCustomer(Number(event.target.value))
                clearCalculation()
                setSaved(undefined)
                setSaveError('')
              }}>
                {customers.map((customer) => <option key={customer} value={customer}>{customer}</option>)}
              </select>
            </div>
          )}

          <div className="csv-preview">
            <table className="spending-table">
              <caption>
                Recorded weekly spending for customer {selectedCustomer} in the file
              </caption>

              <thead>
                <tr>
                  <th scope="col">Week</th>
                  <th scope="col">Travel</th>
                  <th scope="col">Food</th>
                  <th scope="col">Utilities</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.customer_id}-${row.week}`}>
                    <th scope="row">{row.week}</th>
                    <td>
                      {formatPence(Math.round(row.travel * 100))}
                    </td>
                    <td>
                      {formatPence(Math.round(row.food * 100))}
                    </td>
                    <td>
                      {formatPence(Math.round(row.utilities * 100))}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td>{formatPence(totals.travel)}</td>
                  <td>{formatPence(totals.food)}</td>
                  <td>{formatPence(totals.utilities)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="total">
            <span>Total recorded spending</span>
            <strong>
              {formatPence(
                totals.travel + totals.food + totals.utilities
              )}
            </strong>
          </div>

          <p className="help-text">
            These totals cover only the weeks provided. The file has
            no dates, so it cannot confirm coverage of the selected
            month.
          </p>
          <button type="button" onClick={save} disabled={busy || !month || !account || saved?.month === month}>
            {saving ? 'Saving…' : 'Save spending'}
          </button>
          {saveError && <p role="alert">{saveError}</p>}
          {saved?.month === month && <p role="status">Saved {saved.ids.length} entries. IDs: {saved.ids.join(', ')}.</p>}
          <button type="button" onClick={calculate} disabled={busy || !month || !customerId}>
            {isCalculating ? 'Calculating…' : 'Calculate carbon impact'}
          </button>
          {calculationError && <p role="alert">{calculationError}</p>}
          {calculation && (
            <div role="status">
              <p>Total carbon impact: <strong>{calculation.totalCarbonKg} kg CO₂e</strong></p>
              <ul>
                {calculation.categoryTotals.map(({ category, carbonKg }) => (
                  <li key={category}>
                    {category}: {carbonKg} kg CO₂e
                  </li>
                ))}
              </ul>
              <p>Estimated using your uploaded spending and category emission factors.</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default CsvUpload
