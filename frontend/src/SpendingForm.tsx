import { useState } from 'react'

type SpendingFormProps = {
  month: string
}

const categories = [
  { key: 'food', label: 'Food' },
  { key: 'travel', label: 'Travel' },
  { key: 'utilities', label: 'Utilities' },
] as const

function SpendingForm({ month }: SpendingFormProps) {
  // Store each input as text so the form can show exactly what was typed.
  const [amounts, setAmounts] = useState({
    food: '',
    travel: '',
    utilities: '',
  })
  // Keep the demo confirmation tied to its month, so changing months hides it.
  const [confirmation, setConfirmation] = useState<{
    month: string
    message: string
  } | null>(null)

  // Add in pence to avoid small rounding errors when summing money amounts.
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
      onChange={() => setConfirmation(null)}
      onSubmit={(event) => {
        // This demo shows a confirmation but does not send or save the data.
        event.preventDefault()
        setConfirmation(
          {
            month,
            message:
              `Demo submission for ${month}: ${formattedTotal}. ` +
              'Nothing has been saved to the database or calculated yet.',
          }
        )
      }}
    >
      <div className="amount-fields">
        {/* Create one input for each spending category. */}
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

      <p className="help-text">
        Demo mode: submissions are temporary, do not save data, and will clear
        when the page refreshes.
      </p>

      <button type="submit">Submit demo spending</button>

      <p className="confirmation" role="status">
        {confirmation?.month === month ? confirmation.message : ''}
      </p>
    </form>
  )
}

export default SpendingForm
