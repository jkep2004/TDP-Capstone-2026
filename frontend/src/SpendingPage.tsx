import { useState } from 'react'
import type { AccountInfo } from '@azure/msal-browser'

import './SpendingPage.css'
import CsvUpload from './CsvUpload'
import SpendingForm from './SpendingForm'
import WeeklySpendingForm from './WeeklySpendingForm'

function SpendingPage({ account }: { account?: AccountInfo } = {}) {
  const [month, setMonth] = useState('')
  const [mode, setMode] = useState<'manual' | 'csv' | 'weekly'>('manual')

  return (
    <main className="spending-page">
      <header>
        <p className="eyebrow">Carbon & Savings Advisor</p>
        <h1>Monthly spending</h1>
        <p className="intro">
          Enter your monthly totals to start understanding your carbon impact.
        </p>
      </header>

      <section className="spending-card" aria-labelledby="form-heading">
        <div className="mode-switch" role="group" aria-label="Spending entry method">
          <button
            type="button"
            className="mode-button"
            aria-pressed={mode === 'manual'}
            onClick={() => setMode('manual')}
          >
            Manual entry
          </button>
          <button
            type="button"
            className="mode-button"
            aria-pressed={mode === 'csv'}
            onClick={() => setMode('csv')}
          >
            Upload CSV
          </button>
          {account && (
            <button type="button" className="mode-button" aria-pressed={mode === 'weekly'}
              onClick={() => setMode('weekly')}>
              Save weekly spending
            </button>
          )}
        </div>

        <h2 id="form-heading">
          {mode === 'manual' ? 'Enter spending manually' : mode === 'csv' ? 'Upload a CSV file' : 'Enter weekly spending'}
        </h2>
        <p id="spending-help" className="help-text">
          {mode === 'manual'
            ? 'All amounts are in pounds (£). Enter 0 if you spent nothing in a category.'
            : mode === 'csv' ? 'Choose the month that this CSV would apply to.'
            : 'Save one category for a week within the selected month.'}
        </p>

        <div className="field">
          <label htmlFor="month">Spending month</label>
          <input
            id="month"
            name="month"
            type="month"
            form={mode === 'weekly' ? 'weekly-spending-form' : 'manual-spending-form'}
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            required
          />
        </div>

        <div hidden={mode !== 'manual'}>
          <SpendingForm month={month} />
        </div>
        <div hidden={mode !== 'csv'}>
          <CsvUpload month={month} customerId={account?.localAccountId} />
        </div>
        {account && mode === 'weekly' && <WeeklySpendingForm account={account} month={month} />}
      </section>
    </main>
  )
}

export default SpendingPage
