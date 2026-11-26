import { useRef, useState } from 'react'
import type { AccountInfo } from '@azure/msal-browser'
import { ArrowRight, CloudUpload, Download, FileCheck, Leaf } from 'lucide-react'
import { calculateSpending, resolveSpendingCategories, saveSpending } from '../../services/api'
import { CustomerError, customerErrorMessage } from '../../utils/customerError'
import { formatCarbon, formatMoney } from '../../utils/formatAmounts'
import { formatMonth } from '../../utils/formatMonth'
import { parseSpendingCsv } from './parseSpendingCsv'
import type { SpendingRow } from './parseSpendingCsv'

const categories = ['travel', 'food', 'utilities'] as const
const categoryNames = { travel: 'Travel', food: 'Food', utilities: 'Utilities' }

type CsvUploadProps = {
  month: string
  customerId?: string
  account?: AccountInfo
  onSaved?: (month: string) => void
  onSavingChange?: (saving: boolean) => void
}

function CsvUpload({ month, customerId, account, onSaved, onSavingChange }: CsvUploadProps) {
  const requestPending = useRef(false)
  const dragDepth = useRef(0)
  const [file, setFile] = useState<File | null>(null)
  const [fileRows, setFileRows] = useState<SpendingRow[]>([])
  const [selectedGroup, setSelectedGroup] = useState(0)
  const customers = [...new Set(fileRows.map((row) => row.customer_id))]
  const rows = fileRows.filter((row) => row.customer_id === customers[selectedGroup])
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
  const [isDragging, setIsDragging] = useState(false)
  const [saved, setSaved] = useState<{ month: string; count: number }>()
  const busy = isReading || isCalculating || saving

  const clearCalculation = () => {
    setCalculation(undefined)
    setCalculationError('')
  }

  const selectFile = (selected: File | null) => {
    if (selected && !/\.csv$/i.test(selected.name) && selected.type !== 'text/csv') {
      setError('Choose a CSV file to add your spending.')
      return
    }
    setFile(selected)
    setFileRows([])
    setSaved(undefined)
    setSaveError('')
    setError('')
    clearCalculation()
  }

  const buildEntries = async () => {
    if (rows.some((row) => row.week > 5)) {
      throw new CustomerError('Week numbers must be between 1 and 5 within the selected month.')
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
    if (!month || !account || busy || requestPending.current || saved?.month === month) return
    requestPending.current = true
    setSaving(true)
    onSavingChange?.(true)
    setSaveError('')
    setSaved(undefined)
    try {
      const { entries } = await buildEntries()
      await saveSpending(entries, account)
      setSaved({ month, count: entries.length })
      onSaved?.(month)
    } catch (error) {
      setSaveError(customerErrorMessage(error, 'We couldn’t save your spending. Please try again.'))
    } finally {
      requestPending.current = false
      setSaving(false)
      onSavingChange?.(false)
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
          category: categoryNames[category],
          carbonKg: result.breakdown.filter((item) => item.category === categoryID)
            .reduce((total, item) => total + item.carbonKg, 0),
        })),
      })
    } catch (error) {
      setCalculationError(customerErrorMessage(error, 'We couldn’t calculate your carbon impact. Please try again.'))
    } finally {
      setIsCalculating(false)
    }
  }

  const selectedMonth = month ? formatMonth(month) : 'No month selected'

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
      const text = await file.text().catch(() => {
        throw new CustomerError('We couldn’t read this file. Please select it again.')
      })
      const parsedRows = parseSpendingCsv(text)

      setFileRows(parsedRows)
      setSelectedGroup(0)
    } catch (error) {
      setError(customerErrorMessage(error, 'We couldn’t read this file. Please select it again.'))
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

  const formatPence = (pence: number) => formatMoney(pence / 100)

  return (
    <div className="csv-entry">
      <div className="upload-zone" role="group" aria-label="Upload a spending file" data-dragging={isDragging} data-selected={Boolean(file)}
        onDragEnter={(event) => {
          if (busy || !event.dataTransfer.types.includes('Files')) return
          dragDepth.current += 1
          setIsDragging(true)
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1)
          if (dragDepth.current === 0) setIsDragging(false)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = busy ? 'none' : 'copy'
        }}
        onDrop={(event) => {
          event.preventDefault()
          dragDepth.current = 0
          setIsDragging(false)
          if (busy || !event.dataTransfer.files.length) return
          if (event.dataTransfer.files.length > 1) {
            setError('Choose one spending file at a time.')
            return
          }
          selectFile(event.dataTransfer.files[0])
        }}>
        <span className="upload-icon" aria-hidden="true">{file ? <FileCheck size={27} /> : <CloudUpload size={27} />}</span>
        {!file && <p>Drop your spending file here</p>}
        {file && rows.length === 0 && !error && <p role="status">File selected.</p>}
        <input
          id="spending-csv"
          className="visually-hidden"
          type="file"
          accept=".csv"
          disabled={busy}
          onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
        />
        <label className="file-picker" htmlFor="spending-csv">{file ? 'Choose another CSV file' : 'Choose a CSV file'}</label>
      </div>

      <div className="upload-actions">
        <a className="template-link" href={`${import.meta.env.BASE_URL}spending-template.csv`} download>
          <Download size={17} aria-hidden="true" /> Download a spending template
        </a>
        <button type="button" className="button-secondary" onClick={readFile} disabled={!file || busy}>
          {isReading ? 'Reading file…' : 'Preview spending'}
        </button>
      </div>

      {error && <p className="feedback-error" role="alert">{error}</p>}

      {rows.length > 0 && (
        <section className="csv-result" aria-labelledby="csv-preview-heading">
          <h3 id="csv-preview-heading">Spending preview</h3>

          {customers.length > 1 && (
            <div className="field">
              <label htmlFor="csv-group">Spending group</label>
              <p className="help-text">This file has more than one group. Check the preview and select the group with your spending.</p>
              <select id="csv-group" value={selectedGroup} disabled={busy} onChange={(event) => {
                setSelectedGroup(Number(event.target.value))
                clearCalculation()
                setSaved(undefined)
                setSaveError('')
              }}>
                {customers.map((customer, index) => <option key={customer} value={index}>Group {index + 1}</option>)}
              </select>
            </div>
          )}

          <div className="csv-preview" tabIndex={0} role="region" aria-label="Weekly spending table">
            <table className="spending-table">
              <caption>
                Weekly spending in the selected file
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

          <div className="total csv-total">
            <span>Total recorded spending</span>
            <strong className="data-value">
              {formatPence(
                totals.travel + totals.food + totals.utilities
              )}
            </strong>
          </div>

          <p className="help-text">
            These totals cover the weeks shown. Check they belong to {month ? selectedMonth : 'the month you select'} before saving.
          </p>
          <div className="csv-result-actions">
          <button className="save-button" type="button" onClick={save} aria-busy={saving} disabled={busy || !month || !account || saved?.month === month}>
            {saving && <span className="button-spinner" aria-hidden="true" />}
            {saving ? 'Saving your spending…' : 'Save spending'}
            {!saving && <ArrowRight size={18} aria-hidden="true" />}
          </button>
          <button className="button-secondary" type="button" onClick={calculate} disabled={busy || !month || !customerId}>
            <Leaf size={18} aria-hidden="true" /> {isCalculating ? 'Preparing your estimate…' : 'Estimate carbon impact'}
          </button>
          </div>
          {saving && <span className="visually-hidden" role="status">Saving your spending.</span>}
          {saveError && <p className="feedback-error" role="alert">{saveError}</p>}
          {!onSaved && saved?.month === month && (
            <p role="status">Saved {saved.count} {saved.count === 1 ? 'entry' : 'entries'} for {selectedMonth}.</p>
          )}
          {calculationError && <p className="feedback-error" role="alert">{calculationError}</p>}
          {calculation && (
            <div className="csv-estimate" role="status">
              <p>Estimated carbon footprint <strong>{formatCarbon(calculation.totalCarbonKg)}</strong></p>
              <ul>
                {calculation.categoryTotals.map(({ category, carbonKg }) => (
                  <li key={category}>
                    {category} <strong>{formatCarbon(carbonKg)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default CsvUpload
