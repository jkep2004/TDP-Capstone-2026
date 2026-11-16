import { useState } from 'react'
import './App.css'
import CsvUpload from './CsvUpload'
import SpendingForm from './SpendingForm'

function App() {
  // Keep the selected month and entry method available to the whole page.
  const [month, setMonth] = useState('')
  const [mode, setMode] = useState<'manual' | 'csv'>('manual')

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
        </div>

        <h2 id="form-heading">
          {mode === 'manual' ? 'Enter spending manually' : 'Upload a CSV file'}
        </h2>
        <p id="spending-help" className="help-text">
          {mode === 'manual'
            ? 'All amounts are in pounds (£). Enter 0 if you spent nothing in a category.'
            : 'Choose the month that this CSV would apply to.'}
        </p>

        <div className="field">
          <label htmlFor="month">Spending month</label>
          <input
            id="month"
            name="month"
            type="month"
            form="manual-spending-form"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            required
          />
        </div>

        {/* Show the chosen entry form and pass it the selected month. */}
        <div hidden={mode !== 'manual'}>
          <SpendingForm month={month} />
        </div>
        <div hidden={mode !== 'csv'}>
          <CsvUpload month={month} />
        </div>
      </section>
    </main>
  )
}

export default App