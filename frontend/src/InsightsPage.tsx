import { useEffect, useState } from 'react'
import type { AccountInfo } from '@azure/msal-browser'
import { getInsights } from './api'
import './InsightsPage.css'

type MonthlyInsights = {
  month: string
  totalCarbonKg: number | null
  categories: { name: string; carbonKg: number | null }[]
  recommendations: { category: string; advice: string; savingsGbp: number; savingsKg: number }[]
  savings?: { gbp: number; kg: number }
}

const number = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })
const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
const monthName = new Intl.DateTimeFormat('en-GB', {
  month: 'long', year: 'numeric', timeZone: 'UTC',
})
const formatMonth = (month: string) => monthName.format(new Date(`${month}-01T00:00:00Z`))
const formatCarbon = (value: number) => `${number.format(value)} kg CO₂e`

type TrendPoint = Pick<MonthlyInsights, 'month' | 'totalCarbonKg'>

function InsightsResults({ months, selected }: { months: TrendPoint[]; selected: MonthlyInsights }) {
  const previousMonth = new Date(`${selected.month}-01T00:00:00Z`)
  previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1)
  const previous = months.find((item) => item.month === previousMonth.toISOString().slice(0, 7))
  const change = selected.totalCarbonKg !== null && previous?.totalCarbonKg != null
    ? selected.totalCarbonKg - previous.totalCarbonKg
    : null
  const peak = Math.max(1, ...months.map((item) => item.totalCarbonKg ?? 0))
  const ranked = [...selected.categories].sort((a, b) => (b.carbonKg ?? -1) - (a.carbonKg ?? -1))

  return (
    <>
      <section className="insights-card insights-summary" aria-labelledby="carbon-summary">
        <h2 id="carbon-summary">Total carbon impact</h2>
        <p className="insights-total">{selected.totalCarbonKg === null ? 'No data' : formatCarbon(selected.totalCarbonKg)}</p>
        <p>{change === null
          ? 'Month-to-month comparison unavailable.'
          : change === 0 ? 'Unchanged from the previous month.'
          : `${formatCarbon(Math.abs(change))} ${change > 0 ? 'higher' : 'lower'} than the previous month.`}</p>
      </section>

      <div className="insights-grid">
        <section className="insights-card" aria-labelledby="carbon-categories">
          <h2 id="carbon-categories">Carbon by category</h2>
          {ranked.length === 0 ? <p>No category breakdown for this month.</p> : (
            <ul className="insights-list">
              {ranked.map(({ name, carbonKg }) => (
                <li key={name}><span>{name}</span><strong>{carbonKg === null ? 'Not tracked' : formatCarbon(carbonKg)}</strong></li>
              ))}
            </ul>
          )}
        </section>

        <section className="insights-card" aria-labelledby="carbon-trend">
          <h2 id="carbon-trend">Monthly trend</h2>
          <ul className="insights-list insights-trend">
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
          </ul>
        </section>
      </div>

      <section className="insights-card" aria-labelledby="insights-recommendations">
        <h2 id="insights-recommendations">Recommendations</h2>
        {selected.savings && selected.recommendations.length > 0 && (
          <p>Estimated total savings: <strong>{money.format(selected.savings.gbp)}</strong> and <strong>{formatCarbon(selected.savings.kg)}</strong>.</p>
        )}
        {selected.recommendations.length === 0 ? <p>No recommendations for this month.</p> : (
          <ul className="insights-recommendations">
            {selected.recommendations.map((item) => (
              <li key={item.category}>
                <h3>{item.category}</h3>
                <p>{item.advice}</p>
                <dl>
                  <div><dt>Estimated money saved</dt><dd>{money.format(item.savingsGbp)}</dd></div>
                  <div><dt>Estimated carbon saved</dt><dd>{formatCarbon(item.savingsKg)}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

type InsightsConnection = Awaited<ReturnType<typeof getInsights>>

function MonthPicker({ months, month, onChange }: {
  months: TrendPoint[]
  month: string
  onChange: (month: string) => void
}) {
  return (
    <div className="insights-period">
      <label htmlFor="insights-month">Reporting month</label>
      <select id="insights-month" value={month} onChange={(event) => onChange(event.target.value)}>
        {months.map((item) => <option key={item.month} value={item.month}>{formatMonth(item.month)}</option>)}
      </select>
    </div>
  )
}

function LiveInsights({ connection }: { connection: InsightsConnection }) {
  const { months } = connection
  const [month, setMonth] = useState(months.at(-1)?.month ?? '')
  const [details, setDetails] = useState<MonthlyInsights>()
  const [error, setError] = useState<{ month: string; message: string }>()

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
        setError({ month, message: error instanceof Error ? error.message : 'Could not load this month.' })
      }
    })
    return () => controller.abort()
  }, [connection, month])

  if (!month) return <p>No spending insights yet. Save spending to see a monthly summary.</p>

  return (
    <>
      <MonthPicker months={months} month={month} onChange={setMonth} />
      {error?.month === month ? <p role="alert">{error.message}</p>
        : details?.month === month ? <InsightsResults months={months} selected={details} />
        : <p role="status">Loading monthly insights…</p>}
    </>
  )
}

export default function InsightsPage({ account }: { account: AccountInfo }) {
  const [connection, setConnection] = useState<InsightsConnection>()
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getInsights(account, controller.signal).then((result) => {
      if (!controller.signal.aborted) setConnection(result)
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load insights.')
    })
    return () => controller.abort()
  }, [account, attempt])

  return (
    <main className="spending-page insights-page">
      <h1>Spending insights</h1>
      {error ? (
        <div>
          <p role="alert">{error}</p>
          <button type="button" onClick={() => { setError(''); setAttempt(attempt + 1) }}>Retry insights</button>
        </div>
      ) : connection ? <LiveInsights connection={connection} /> : <p role="status">Loading insights…</p>}
    </main>
  )
}
