import { useEffect, useId, useRef, useState } from 'react'
import type { AccountInfo } from '@azure/msal-browser'
import { CalendarDays, FileUp, PencilLine } from 'lucide-react'
import { formatMonth } from '../../utils/formatMonth'

import './SpendingPage.css'
import CsvUpload from './CsvUpload'
import SpendingForm from './SpendingForm'

function SpendingPage({ account, onSaved }: { account?: AccountInfo; onSaved?: (month: string) => void } = {}) {
  const [month, setMonth] = useState('')
  const [mode, setMode] = useState<'manual' | 'csv'>('manual')
  const [saving, setSaving] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const resolveReplacement = useRef<((replace: boolean) => void) | null>(null)
  const saveButton = useRef<HTMLButtonElement | null>(null)
  const dialogTitle = useId()
  const dialogDescription = useId()

  useEffect(() => () => resolveReplacement.current?.(false), [])
  useEffect(() => {
    if (!saving && saveButton.current) {
      saveButton.current.focus()
      saveButton.current = null
    }
  }, [saving])

  const confirmReplacement = async () => {
    const prompt = dialog.current
    if (!prompt) return false
    saveButton.current = prompt.closest('main')?.querySelector('.save-button[aria-busy="true"]') ?? null
    prompt.returnValue = ''
    prompt.showModal()
    return new Promise<boolean>((resolve) => { resolveReplacement.current = resolve })
  }

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
                ? 'Enter at least one amount. Blank categories and subcategories count as £0.'
                : 'Choose the month the spending in your file belongs to.'}
            </p>
          </div>
          <div className="field entry-month">
            <label htmlFor="month"><CalendarDays size={16} aria-hidden="true" /> Spending month</label>
            <div className="entry-month-control">
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
              {!month && <span className="entry-month-placeholder" aria-hidden="true">Choose a month</span>}
            </div>
          </div>
        </div>

        <div hidden={mode !== 'manual'}>
          <SpendingForm month={month} account={account} onSaved={onSaved} onSavingChange={setSaving} confirmReplacement={confirmReplacement} />
        </div>
        <div hidden={mode !== 'csv'}>
          <CsvUpload month={month} customerId={account?.localAccountId} account={account} onSaved={onSaved} onSavingChange={setSaving} confirmReplacement={confirmReplacement} />
        </div>
      </section>

      <dialog ref={dialog} className="replace-spending-dialog" aria-labelledby={dialogTitle}
        aria-describedby={dialogDescription} onClose={(event) => {
          resolveReplacement.current?.(event.currentTarget.returnValue === 'replace')
          resolveReplacement.current = null
        }}>
        <h2 id={dialogTitle}>Replace saved spending?</h2>
        <p id={dialogDescription}>
          {month && `You already have spending saved for ${formatMonth(month)}. Replacing it will remove all previous entries for that month.`}
        </p>
        <div className="replace-spending-actions">
          <button type="button" className="button-secondary" onClick={() => dialog.current?.close()}>Keep saved spending</button>
          <button type="button" className="save-button" onClick={() => dialog.current?.close('replace')}>Replace spending</button>
        </div>
      </dialog>
    </main>
  )
}

export default SpendingPage
