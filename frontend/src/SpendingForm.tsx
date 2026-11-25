import { useState } from 'react'
import type { AccountInfo } from '@azure/msal-browser'
import { resolveSpendingCategories, saveSpending } from './api'

type SpendingFormProps = {
  month: string
  account?: AccountInfo
}

const categories = [
  { key: 'food', label: 'Food' },
  { key: 'travel', label: 'Travel' },
  { key: 'utilities', label: 'Utilities' },
] as const

function SpendingForm({ month, account }: SpendingFormProps) {
  const [amounts, setAmounts] = useState({
    food: '',
    travel: '',
    utilities: '',
  })
  const [confirmation, setConfirmation] = useState<{
    month: string
    message: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
        if (!month || !account || saving) return
        setSaving(true)
        setConfirmation(null)
        setError('')
        try {
          const available = await resolveSpendingCategories(categories.map(({ key }) => key))
          const result = await saveSpending(available.map(({ category, categoryID }) => ({
            categoryID, month: `${month}-01`, week: null, amount: Number(amounts[category]),
          })), account)
          setConfirmation({ month, message: `Spending saved for ${month} (${formattedTotal}). IDs: ${result.spendingIds.join(', ')}.` })
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Could not save spending.')
        } finally {
          setSaving(false)
        }
      }}
    >
      <div className="amount-fields">
        {categories.map((category) => (
          <div className="field" key={category.key}>
            <label htmlFor={category.key}>
              {category.label} (£)
            </label>
            <input
              id={category.key}
              name={category.key}
              type="number"
              inputMode="decimal"
              min="0"
              max="100000"
              disabled={saving}
              step="0.01"
              placeholder="0.00"
              value={amounts[category.key]}
              onChange={(event) =>
                setAmounts({
                  ...amounts,
                  [category.key]: event.target.value,
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

      <button type="submit" disabled={saving || !account || confirmation?.month === month}>
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
