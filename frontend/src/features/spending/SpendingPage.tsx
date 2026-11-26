import { useState } from 'react'
import type { AccountInfo } from '@azure/msal-browser'
import { CalendarDays, FileUp, PencilLine } from 'lucide-react'

import './SpendingPage.css'
import CsvUpload from './CsvUpload'
import SpendingForm from './SpendingForm'

function SpendingPage({ account, onSaved }: { account?: AccountInfo; onSaved?: (month: string) => void } = {}) {
  const [month, setMonth] = useState('')
  const [mode, setMode] = useState<'manual' | 'csv'>('manual')
  const [saving, setSaving] = useState(false)

  return (
    <main id="spending-content" className="spending-page entry-page" tabIndex={-1}>
      <header className="page-heading">
        <h1>Monthly spending</h1>
        <p className="intro">
          Add a month of spending to see your estimated carbon footprint and potential savings.
        </p>
      </header>

      <section className="spending-card" aria-labelledby="form-heading">
        <div className="mode-switch" role="group" aria-label="Spending entry method">
          <button
            type="button"
            className="mode-button"
            disabled={saving}
            aria-pressed={mode === 'manual'}
            onClick={() => setMode('manual')}
          >
            <PencilLine size={17} aria-hidden="true" /> Manual entry
          </button>
          <button
            type="button"
            className="mode-button"
            disabled={saving}
            aria-pressed={mode === 'csv'}
            onClick={() => setMode('csv')}
          >
            <FileUp size={17} aria-hidden="true" /> Upload CSV
          </button>
        </div>

        <div className="entry-heading">
          <div>
            <h2 id="form-heading">{mode === 'manual' ? 'Enter spending manually' : 'Upload a CSV file'}</h2>
            <p id="spending-help" className="help-text">
              {mode === 'manual'
                ? 'Enter £0 for categories you didn’t spend in. If you break down a category, you can leave unused amounts blank.'
                : 'Choose the month the spending in your file belongs to.'}
            </p>
          </div>
          <div className="field entry-month">
            <label htmlFor="month"><CalendarDays size={16} aria-hidden="true" /> Spending month</label>
            <input
            id="month"
            name="month"
            type="month"
            form="manual-spending-form"
            value={month}
            disabled={saving}
            onChange={(event) => setMonth(event.target.value)}
            required
            />
          </div>
        </div>

        <div hidden={mode !== 'manual'}>
          <SpendingForm month={month} account={account} onSaved={onSaved} onSavingChange={setSaving} />
        </div>
        <div hidden={mode !== 'csv'}>
          <CsvUpload month={month} customerId={account?.localAccountId} account={account} onSaved={onSaved} onSavingChange={setSaving} />
        </div>
      </section>
    </main>
  )
}

export default SpendingPage
