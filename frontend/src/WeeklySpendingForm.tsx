import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { AccountInfo } from '@azure/msal-browser'
import { getCategories, saveSpending } from './api'
import type { Category } from './api'

export default function WeeklySpendingForm({ account, month }: { account: AccountInfo; month: string }) {
  const [saving, setSaving] = useState(false)
  const [spendingId, setSpendingId] = useState<number>()
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>()
  const [categoryError, setCategoryError] = useState('')

  useEffect(() => {
    let active = true
    getCategories().then((items) => {
      if (active) setCategories(items.filter((item) => item.parent_id === null))
    }).catch((error: unknown) => {
      if (active) setCategoryError(error instanceof Error ? error.message : 'Could not load categories.')
    })
    return () => { active = false }
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!month || saving) return

    const fields = new FormData(event.currentTarget)
    setSaving(true)
    setError('')
    setSpendingId(undefined)
    try {
      const result = await saveSpending({
        month: `${month}-01`,
        week: Number(fields.get('week')),
        categoryID: Number(fields.get('category')),
        amount: Number(fields.get('amount')),
      }, account)
      setSpendingId(result.spendingId)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save spending.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form id="weekly-spending-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="spending-week">Week of month</label>
        <input id="spending-week" name="week" type="number" min="1" max="5" step="1" disabled={saving} required />
      </div>
      <div className="field">
        <label htmlFor="spending-category">Category</label>
        <select id="spending-category" name="category" disabled={saving || !categories?.length} required defaultValue="">
          <option value="">{categoryError ? 'Categories unavailable' : categories ? 'Choose a category' : 'Loading categories…'}</option>
          {categories?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="spending-amount">Amount (£)</label>
        <input id="spending-amount" name="amount" type="number" min="0" max="100000" step="0.01" disabled={saving} required />
      </div>
      <button type="submit" disabled={saving || !month || !categories?.length}>{saving ? 'Saving…' : 'Save spending'}</button>
      {categoryError && <p role="alert">{categoryError}</p>}
      {error && <p role="alert">{error}</p>}
      {spendingId !== undefined && <p role="status">Spending saved. Spending ID {spendingId}.</p>}
    </form>
  )
}
