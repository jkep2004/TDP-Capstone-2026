import { useState } from 'react'
import { parseSpendingCsv } from './utils/parseSpendingCsv'
import type { SpendingRow } from './utils/parseSpendingCsv'
import { calculateSpending } from './api'

const categories = ['travel', 'food', 'utilities'] as const

type CsvUploadProps = {
  month: string
}

function CsvUpload({ month }: CsvUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<SpendingRow[]>([])
  const [isReading, setIsReading] = useState(false)
  const [error, setError] = useState('')
  const [calculation, setCalculation] = useState<Awaited<ReturnType<typeof calculateSpending>>>()
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculationError, setCalculationError] = useState('')

  const clearCalculation = () => {
    setCalculation(undefined)
    setCalculationError('')
  }

  const calculate = async () => {
    clearCalculation()
    setIsCalculating(true)
    try {
      const spending = rows.flatMap((row) =>
        categories.map((category) => ({
          CustomerID: row.customer_id,
          week: row.week,
          category,
          amount: row[category],
        }))
      )
      setCalculation(await calculateSpending(spending))
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
    setRows([])
    setIsReading(true)

    try {
      const text = await file.text()
      const parsedRows = parseSpendingCsv(text)

      // Temporary demo selection, not authentication or access control.
      const customerRows = parsedRows.filter(
        (row) => row.customer_id === 1
      )

      if (customerRows.length === 0) {
        throw new Error(
          'This file contains no records for demo customer 1.'
        )
      }

      setRows(customerRows)
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
          disabled={isReading || isCalculating}
          onChange={(event) => {
            const selectedFile = event.target.files?.[0] ?? null

            setFile(selectedFile)
            setRows([])
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
        The preview reads the file locally. Calculation sends the previewed spending to the API.
      </p>

      <button
        type="button"
        onClick={readFile}
        disabled={!file || isReading || isCalculating}
      >
        {isReading ? 'Reading file…' : 'Preview spending'}
      </button>

      {error && <p role="alert">{error}</p>}

      {rows.length > 0 && (
        <section aria-labelledby="csv-preview-heading">
          <h3 id="csv-preview-heading">Spending preview</h3>

          <p className="help-text">
            Demo customer 1 only · {rows.length} weeks included.
            Other customers are excluded from this preview.
          </p>

          <div className="csv-preview">
            <table className="spending-table">
              <caption>
                Recorded weekly spending for demo customer 1
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
          <button type="button" onClick={calculate} disabled={isCalculating}>
            {isCalculating ? 'Calculating…' : 'Calculate carbon impact'}
          </button>
          {calculationError && <p role="alert">{calculationError}</p>}
          {calculation && (
            <div role="status">
              <p>Total carbon impact: <strong>{calculation.totalCarbonKg} kg CO₂e</strong></p>
              <ul>
                {categories.map((category) => (
                  <li key={category}>
                    {category}: {calculation.breakdown
                      .filter((item) => item.category === category)
                      .reduce((total, item) => total + item.carbonKg, 0)} kg CO₂e
                  </li>
                ))}
              </ul>
              <p>The current API returns placeholder carbon values.</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default CsvUpload
