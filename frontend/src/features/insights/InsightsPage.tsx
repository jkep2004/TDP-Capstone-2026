import { useEffect, useRef, useState } from 'react'
import type { AccountInfo } from '@azure/msal-browser'
import { getInsights } from '../../services/api'
import { customerErrorMessage } from '../../utils/customerError'
import { formatMonth } from '../../utils/formatMonth'
import { formatCarbon, formatMoney } from '../../utils/formatAmounts'
import './InsightsPage.css'

type MonthlyInsights = {
  month: string
  totalSpendGbp: number
  totalCarbonKg: number | null
  categories: { name: string; carbonKg: number | null; spendGbp: number }[]
  recommendations: { category: string; advice: string; savingsGbp: number; savingsKg: number }[]
  savings?: { gbp: number; kg: number }
}

type TrendPoint = Pick<MonthlyInsights, 'month' | 'totalCarbonKg'>

function InsightsResults({ months, selected }: { months: TrendPoint[]; selected: MonthlyInsights }) {
  const previousMonth = new Date(`${selected.month}-01T00:00:00Z`)
  previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1)
  const previous = months.find((item) => item.month === previousMonth.toISOString().slice(0, 7))
  const change = selected.totalCarbonKg !== null && previous?.totalCarbonKg != null
    ? Math.round((selected.totalCarbonKg - previous.totalCarbonKg) * 100) / 100
    : null
  const peak = Math.max(1, ...months.map((item) => item.totalCarbonKg ?? 0))
  const ranked = [...selected.categories].sort((a, b) => (b.carbonKg ?? -1) - (a.carbonKg ?? -1))

  return (
    <div className="insights-results">
      <div className="insights-overview">
        <section className="insights-card" aria-labelledby="spending-summary">
          <h2 id="spending-summary">Monthly spending</h2>
          <p className="insights-total">{formatMoney(selected.totalSpendGbp)}</p>
          <p>From the spending you added.</p>
        </section>
        <section className="insights-card insights-summary" aria-labelledby="carbon-summary">
          <h2 id="carbon-summary">Estimated carbon footprint</h2>
          <p className="insights-total">{selected.totalCarbonKg === null ? 'Estimate unavailable' : formatCarbon(selected.totalCarbonKg)}</p>
          <p>{change === null
            ? 'There’s no spending from the previous month to compare.'
            : change === 0 ? 'Unchanged from the previous month.'
            : `${formatCarbon(Math.abs(change))} ${change > 0 ? 'higher' : 'lower'} than the previous month.`}</p>
        </section>
        {selected.savings && (
          <section className="insights-card" aria-labelledby="savings-summary">
            <h2 id="savings-summary">Potential savings</h2>
            <p className="insights-total">{formatMoney(selected.savings.gbp)}</p>
            <p>{formatCarbon(selected.savings.kg)} in potential carbon savings.</p>
          </section>
        )}
      </div>

      <div className="insights-grid">
        <section className="insights-card" aria-labelledby="carbon-categories">
          <h2 id="carbon-categories">Spending by category</h2>
          {ranked.length === 0 ? <p>No category breakdown for this month.</p> : (
            <ul className="insights-list">
              {ranked.map(({ name, carbonKg, spendGbp }) => (
                <li key={name}>
                  <span>{name}</span><strong>{formatMoney(spendGbp)}</strong>
                  <span className="category-carbon">{carbonKg === null ? 'Carbon estimate unavailable' : `${formatCarbon(carbonKg)} estimated`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="insights-card" aria-labelledby="carbon-trend">
          <h2 id="carbon-trend">Estimated carbon over time</h2>
          {months.length ? <ul className="insights-list insights-trend">
            {months.map((item) => (
              <li key={item.month}>
                <span>{formatMonth(item.month)}</span>
                <strong>{item.totalCarbonKg === null ? 'No data' : formatCarbon(item.totalCarbonKg)}</strong>
                {item.totalCarbonKg !== null && (
                  <div className="insights-track" aria-hidden="true">
                    <span style={{ width: `${item.totalCarbonKg / peak * 100}%` }} />
                  </div>
                )}
              </li>
            ))}
          </ul> : <p>Add more months of spending to see a trend.</p>}
        </section>
      </div>

      <section className="insights-card" aria-labelledby="insights-recommendations">
        <h2 id="insights-recommendations">Recommendations</h2>
        {selected.recommendations.length === 0 ? <p>No recommendations for this month.</p> : (
          <ul className="insights-recommendations">
            {selected.recommendations.map((item) => (
              <li key={item.category}>
                <h3>{item.category}</h3>
                <p>{item.advice}</p>
                <dl>
                  <div><dt>Estimated money saved</dt><dd>{formatMoney(item.savingsGbp)}</dd></div>
                  <div><dt>Estimated carbon saved</dt><dd>{formatCarbon(item.savingsKg)}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

type InsightsConnection = Awaited<ReturnType<typeof getInsights>>

function MonthPicker({ months, month, onChange }: {
  months: string[]
  month: string
  onChange: (month: string) => void
}) {
  return (
    <div className="insights-period">
      <label htmlFor="insights-month">Reporting month</label>
      <select id="insights-month" value={month} onChange={(event) => onChange(event.target.value)}>
        {months.map((item) => <option key={item} value={item}>{formatMonth(item)}</option>)}
      </select>
    </div>
  )
}

function LiveInsights({ connection, savedMonth, onAddSpending }: {
  connection: InsightsConnection
  savedMonth?: string
  onAddSpending?: () => void
}) {
  const { months } = connection
  const availableMonths = [...new Set([...months.map(({ month }) => month), ...(savedMonth ? [savedMonth] : [])])].sort()
  const [month, setMonth] = useState(savedMonth ?? availableMonths.at(-1) ?? '')
  const [details, setDetails] = useState<MonthlyInsights>()
  const [error, setError] = useState<{ month: string; message: string }>()
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!month) return
    const controller = new AbortController()
    connection.loadMonth(month, controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setDetails(result)
        setError(undefined)
      }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setError({ month, message: customerErrorMessage(error, 'We couldn’t load insights for this month. Please try again.') })
      }
    })
    return () => controller.abort()
  }, [connection, month, attempt])

  if (!month) return (
    <section className="insights-card">
      <h2>No spending insights yet</h2>
      <p>Add a month of spending to see your carbon estimate and ways to save.</p>
      {onAddSpending && <button type="button" onClick={onAddSpending}>Add spending</button>}
    </section>
  )

  return (
    <>
      <MonthPicker months={availableMonths} month={month} onChange={setMonth} />
      {error?.month === month ? (
        <div>
          <p className="feedback-error" role="alert">{error.message}</p>
          <button type="button" onClick={() => {
            setError(undefined)
            setAttempt((previous) => previous + 1)
          }}>Try again</button>
        </div>
      )
        : details?.month === month ? <InsightsResults key={month} months={months} selected={details} />
        : <p className="feedback-progress" role="status">Preparing insights for {formatMonth(month)}…</p>}
    </>
  )
}

export default function InsightsPage({ account, savedMonth, onAddSpending }: {
  account: AccountInfo
  savedMonth?: string
  onAddSpending?: () => void
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const [connection, setConnection] = useState<InsightsConnection>()
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (savedMonth) heading.current?.focus()
  }, [savedMonth])

  useEffect(() => {
    const controller = new AbortController()
    getInsights(account, controller.signal).then((result) => {
      if (!controller.signal.aborted) setConnection(result)
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setError(customerErrorMessage(error, 'We couldn’t load your spending insights. Please try again.'))
      }
    })
    return () => controller.abort()
  }, [account, attempt])

  return (
    <main className="spending-page insights-page">
      <h1 ref={heading} tabIndex={-1} aria-describedby={savedMonth ? 'save-notice' : undefined}>Spending insights</h1>
      {savedMonth && (
        <p id="save-notice" className="save-notice" role="status">
          <span aria-hidden="true">✓</span>
          <span>Spending saved for {formatMonth(savedMonth)}.</span>
        </p>
      )}
      {error ? (
        <div>
          <p className="feedback-error" role="alert">{error}</p>
          <button type="button" onClick={() => { setError(''); setAttempt(attempt + 1) }}>Retry insights</button>
        </div>
      ) : connection ? <LiveInsights connection={connection} savedMonth={savedMonth} onAddSpending={onAddSpending} />
        : <p className="feedback-progress" role="status">Preparing your spending insights…</p>}
    </main>
  )
}
