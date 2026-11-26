import { useEffect, useState } from 'react'
import type { AccountInfo } from '@azure/msal-browser'
import { getCategories, saveSpending } from './api'
import type { Category } from './api'

type SpendingFormProps = {
  month: string
  account?: AccountInfo
}

function SpendingForm({ month, account }: SpendingFormProps) {
  const [categories, setCategories] = useState<Category[]>()
  const [categoryError, setCategoryError] = useState('')
  const [categoryAttempt, setCategoryAttempt] = useState(0)
  const [amounts, setAmounts] = useState<Record<number, string>>({})
  const [confirmation, setConfirmation] = useState<{
    month: string
    message: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getCategories(controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setCategories(result.filter((category) => category.parent_id === null))
      }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setCategoryError(error instanceof Error ? error.message : 'Could not load categories.')
      }
    })
    return () => controller.abort()
  }, [categoryAttempt])

  // Add amounts in pence, then convert back to pounds.
  const totalPence = Object.values(amounts).reduce((sum, value) => {
    const amount = Number(value)
    return sum + (
      Number.isFinite(amount) && amount >= 0
        ? Math.round(amount * 100)
        : 0
    )
  }, 0)

  const formattedTotal = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(totalPence / 100)

  return (
    <form
      id="manual-spending-form"
      aria-describedby="spending-help"
      onChange={() => {
        setConfirmation(null)
        setError('')
      }}
      onSubmit={async (event) => {
        event.preventDefault()
        if (!month || !account || saving || !categories?.length || confirmation?.month === month) return
        setSaving(true)
        setConfirmation(null)
        setError('')
        try {
          const result = await saveSpending(categories.map(({ id }) => ({
            categoryID: id, month: `${month}-01`, week: null, amount: Number(amounts[id]),
          })), account)
          setConfirmation({ month, message: `Spending saved for ${month} (${formattedTotal}). IDs: ${result.spendingIds.join(', ')}.` })
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Could not save spending.')
        } finally {
          setSaving(false)
        }
      }}
    >
      {categoryError ? (
        <div>
          <p role="alert">{categoryError}</p>
          <button type="button" onClick={() => {
            setCategoryError('')
            setCategoryAttempt((attempt) => attempt + 1)
          }}>Retry loading categories</button>
        </div>
      ) : !categories ? <p role="status">Loading spending categories…</p>
        : categories.length === 0 ? <p role="status">No spending categories are available.</p> : null}

      <div className="amount-fields">
        {categories?.map(({ id, name }) => (
          <div className="field" key={id}>
            <label htmlFor={`spending-category-${id}`}>
              {name} (£)
            </label>
            <input
              id={`spending-category-${id}`}
              name={`spending-category-${id}`}
              type="number"
              inputMode="decimal"
              min="0"
              max="100000"
              disabled={saving}
              step="0.01"
              placeholder="0.00"
              value={amounts[id] ?? ''}
              onChange={(event) =>
                setAmounts({
                  ...amounts,
                  [id]: event.target.value,
                })
              }
              required
            />
          </div>
        ))}
      </div>

      <div className="total">
        <span>Total entered</span>
        <strong>{formattedTotal}</strong>
      </div>

      <button type="submit" disabled={saving || !account || !categories?.length || confirmation?.month === month}>
        {saving ? 'Saving…' : 'Save spending'}
      </button>
      {error && <p role="alert">{error}</p>}

      <p className="confirmation" role="status">
        {confirmation?.month === month ? confirmation.message : ''}
      </p>
    </form>
  )
}

export default SpendingForm
