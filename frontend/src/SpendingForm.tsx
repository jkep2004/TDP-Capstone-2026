import { useState } from 'react'

const categories = [
  { key: 'food', label: 'Food' },
  { key: 'travel', label: 'Travel' },
  { key: 'utilities', label: 'Utilities' },
] as const

function SpendingForm() {
  const [month, setMonth] = useState('')
  const [amounts, setAmounts] = useState({
    food: '',
    travel: '',
    utilities: '',
  })
  const [confirmation, setConfirmation] = useState('')

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
      aria-describedby="spending-help"
      onChange={() => setConfirmation('')}
      onSubmit={(event) => {
        event.preventDefault()
        setConfirmation(
          `Demo submission for ${month}: ${formattedTotal}. ` +
          'Nothing has been saved to the database or calculated yet.'
        )
      }}
    >
      <div className="field">
        <label htmlFor="month">Spending month</label>
        <input
          id="month"
          name="month"
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          required
        />
      </div>

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
        Demo mode: does not save data and will clear when page refreshes

      </p>

      <button type="submit">Submit spending</button>

      <p className="confirmation" role="status">
        {confirmation}
      </p>
    </form>
  )
}

export default SpendingForm
