import { useEffect, useId, useRef, useState } from 'react'
import type { AccountInfo } from '@azure/msal-browser'
import { getCategories, saveSpending } from '../../services/api'
import type { Category } from '../../services/api'
import { customerErrorMessage } from '../../utils/customerError'
import { formatMonth } from '../../utils/formatMonth'
import { MAX_SPENDING_AMOUNT_GBP } from './spendingAmount'

type SpendingFormProps = {
  month: string
  account?: AccountInfo
  onSaved?: (month: string) => void
  onSavingChange?: (saving: boolean) => void
}

type SpendingCategory = Category & { subcategories: Category[] }

function SpendingForm({ month, account, onSaved, onSavingChange }: SpendingFormProps) {
  const fieldPrefix = useId()
  const requestPending = useRef(false)
  const [categories, setCategories] = useState<SpendingCategory[]>()
  const [categoryError, setCategoryError] = useState('')
  const [categoryAttempt, setCategoryAttempt] = useState(0)
  const [amounts, setAmounts] = useState<Record<number, string>>({})
  const [itemized, setItemized] = useState<Record<number, boolean>>({})
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
        setCategories(result.filter(({ parent_id }) => parent_id === null).map((category) => ({
          ...category,
          subcategories: result.filter(({ parent_id }) => parent_id === category.id),
        })))
      }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setCategoryError(customerErrorMessage(error, 'We couldn’t load spending categories. Please try again.'))
      }
    })
    return () => controller.abort()
  }, [categoryAttempt])

  const entries = categories?.flatMap(({ id, subcategories }) => {
    if (itemized[id]) {
      return subcategories.filter(({ id }) => amounts[id]).map((subcategory) => ({
        categoryID: id, subcategoryID: subcategory.id, amount: Number(amounts[subcategory.id]),
      }))
    }
    return [{ categoryID: id, amount: Number(amounts[id] ?? '') }]
  }) ?? []

  // Add the active amounts in pence, then convert back to pounds.
  const totalPence = entries.reduce((sum, { amount }) => {
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

  const renderAmount = (id: number, inputId: string, required = false) => (
    <input
      id={inputId}
      type="number"
      inputMode="decimal"
      min="0"
      max={MAX_SPENDING_AMOUNT_GBP}
      step="0.01"
      placeholder="0.00"
      value={amounts[id] ?? ''}
      onChange={(event) => setAmounts({ ...amounts, [id]: event.target.value })}
      required={required}
    />
  )

  return (
    <form
      id="manual-spending-form"
      aria-describedby="spending-help"
      noValidate
      onChange={() => {
        setConfirmation(null)
        setError('')
      }}
      onSubmit={async (event) => {
        event.preventDefault()
        if (!account || requestPending.current || !categories?.length || confirmation?.month === month) return
        if (!month) {
          setError('Choose a month for your spending.')
          return
        }
        const invalid = event.currentTarget.querySelector<HTMLInputElement>('input[type="number"]:invalid')
        if (invalid) {
          setError(invalid.validity.valueMissing
            ? 'Enter a total for each category, or £0 if you didn’t spend in it.'
            : 'Enter amounts between £0 and £100,000, using up to two decimal places.')
          invalid.focus()
          return
        }
        if (entries.length === 0) {
          setError('Enter at least one spending amount.')
          return
        }
        requestPending.current = true
        setSaving(true)
        onSavingChange?.(true)
        setConfirmation(null)
        setError('')
        try {
          await saveSpending(entries.map((entry) => ({
            ...entry, month: `${month}-01`, week: null,
          })), account)
          setConfirmation({ month, message: `Spending saved for ${formatMonth(month)} (${formattedTotal}).` })
          onSaved?.(month)
        } catch (error) {
          setError(customerErrorMessage(error, 'We couldn’t save your spending. Please try again.'))
        } finally {
          requestPending.current = false
          setSaving(false)
          onSavingChange?.(false)
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
        {categories?.map(({ id, name, subcategories }, index) => {
          const expanded = Boolean(itemized[id])
          const inputId = `${fieldPrefix}-amount-${index}`
          const labelId = `${fieldPrefix}-label-${index}`

          return (
            <fieldset className="spending-category" key={id} disabled={saving} aria-labelledby={labelId}>
              <div className="spending-category-row">
                {expanded ? <span id={labelId} className="spending-category-name">{name}</span>
                  : <label id={labelId} htmlFor={inputId}>{name} (£)</label>}
                {!expanded && renderAmount(id, inputId, true)}
                {subcategories.length > 0 && (
                  <label className="spending-breakdown">
                    <input
                      type="checkbox"
                      aria-label={`By subcategory for ${name}`}
                      checked={expanded}
                      onChange={(event) => setItemized({ ...itemized, [id]: event.target.checked })}
                    />
                    By subcategory
                  </label>
                )}
              </div>
              {expanded && (
                <div className="spending-subcategories">
                  {subcategories.map(({ id, name }, subIndex) => (
                    <div className="field" key={id}>
                      <label htmlFor={`${inputId}-${subIndex}`}>{name} (£)</label>
                      {renderAmount(id, `${inputId}-${subIndex}`)}
                    </div>
                  ))}
                </div>
              )}
            </fieldset>
          )
        })}
      </div>

      <div className="total">
        <span>Total entered</span>
        <strong>{formattedTotal}</strong>
      </div>

      <button className="save-button" type="submit" aria-busy={saving} disabled={saving || !account || !categories?.length || confirmation?.month === month}>
        {saving && <span className="button-spinner" aria-hidden="true" />}
        {saving ? 'Saving your spending…' : 'Save spending'}
      </button>
      {saving && <span className="visually-hidden" role="status">Saving your spending.</span>}
      {error && <p className="feedback-error" role="alert">{error}</p>}

      <p className="confirmation" role="status">
        {!onSaved && confirmation?.month === month ? confirmation.message : ''}
      </p>
    </form>
  )
}

export default SpendingForm
