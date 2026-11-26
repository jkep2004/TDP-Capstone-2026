import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AccountInfo } from '@azure/msal-browser'
import { CalendarDays, ChartNoAxesCombined, CircleCheck, Coins, Leaf, Play, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import CategoryIcon from '../../app/CategoryIcon'
import { getInsights } from '../../services/api'
import { customerErrorMessage } from '../../utils/customerError'
import { formatMonth } from '../../utils/formatMonth'
import { formatCarbon, formatCarbonNumber, formatMoney } from '../../utils/formatAmounts'
import InsightsHistory from './InsightsHistory'
import type { TrendPoint } from './InsightsHistory'
import MonthlyRecap from './MonthlyRecap'
import OverviewWelcome from './OverviewWelcome'
import SpendingMilestones from './SpendingMilestones'
import type { MonthlyInsights } from './types'
import './InsightsPage.css'
import './OverviewExperience.css'

function compareCarbon(months: TrendPoint[], details?: MonthlyInsights) {
  if (!details || details.totalCarbonKg === null) return null
  const previousMonth = new Date(`${details.month}-01T00:00:00Z`)
  previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1)
  const previous = months.find((point) => point.month === previousMonth.toISOString().slice(0, 7))
  if (previous?.totalCarbonKg == null) return null
  const change = Math.round((details.totalCarbonKg - previous.totalCarbonKg) * 100) / 100
  return Number.isFinite(change) ? change : null
}

function InsightsResults({ months, month, selected, change, onSelect, status }: {
  months: TrendPoint[]
  month: string
  selected?: MonthlyInsights
  change: number | null
  onSelect: (month: string) => void
  status?: ReactNode
}) {
  const ranked = [...(selected?.categories ?? [])].sort((a, b) => b.spendGbp - a.spendGbp)
  const totalCategorySpend = ranked.reduce((total, { spendGbp }) => total + (Number.isFinite(spendGbp) ? spendGbp : 0), 0)
  const recommendations = [...(selected?.recommendations ?? [])].sort((a, b) => b.savingsGbp - a.savingsGbp)

  return (
    <div className="insights-results">
      {selected ? <div className="insights-overview" key={selected.month}>
        <section className="insights-card footprint-panel" aria-labelledby="carbon-summary">
          <div className="footprint-heading">
            <h2 id="carbon-summary">Estimated carbon footprint</h2>
            <span className="footprint-icon"><Leaf size={22} strokeWidth={1.6} aria-hidden="true" /></span>
          </div>
          <p className="footprint-value data-value">
            {selected.totalCarbonKg === null || !Number.isFinite(selected.totalCarbonKg) ? 'Estimate unavailable' : (
              <>{formatCarbonNumber(selected.totalCarbonKg)} <span className="footprint-unit">kg CO₂e</span></>
            )}
          </p>
          <div className="footprint-comparison">
            {change !== null && change !== 0 && (
              <span className={change < 0 ? 'change-down' : 'change-up'}>
                {change < 0 ? <TrendingDown size={18} aria-hidden="true" /> : <TrendingUp size={18} aria-hidden="true" />}
              </span>
            )}
            <p>{change === null
              ? 'There’s no spending from the previous month to compare.'
              : change === 0 ? 'Unchanged from the previous month.'
                : `${formatCarbon(Math.abs(change))} ${change > 0 ? 'higher' : 'lower'} than the previous month.`}</p>
          </div>
        </section>
        <div className="overview-support">
          <section className="insights-card overview-metric" aria-labelledby="spending-summary">
            <span className="metric-icon"><Wallet size={19} aria-hidden="true" /></span>
            <div>
              <h2 id="spending-summary">Monthly spending</h2>
              <p className="insights-total data-value">{formatMoney(selected.totalSpendGbp)}</p>
            </div>
          </section>
          {selected.savings && (
            <section className="insights-card overview-metric savings-metric" aria-labelledby="savings-summary">
              <span className="metric-icon"><Coins size={19} aria-hidden="true" /></span>
              <div>
                <h2 id="savings-summary">Potential savings</h2>
                <p className="insights-total data-value">{formatMoney(selected.savings.gbp)}</p>
                <p className="metric-note">{formatCarbon(selected.savings.kg)} in potential carbon savings.</p>
              </div>
            </section>
          )}
        </div>
      </div> : status}

      <div className="insights-grid">
        <InsightsHistory months={months} current={month} onSelect={onSelect} />
        {selected && <section className="insights-card breakdown-panel" aria-labelledby="carbon-categories">
          <h2 id="carbon-categories">Spending by category</h2>
          {ranked.length === 0 ? <p className="quiet-state">No category breakdown for this month.</p> : (
            <ul className="insights-list">
              {ranked.map(({ name, carbonKg, spendGbp }) => {
                const percentage = totalCategorySpend > 0 && Number.isFinite(spendGbp)
                  ? Math.max(0, spendGbp / totalCategorySpend * 100)
                  : 0
                return (
                  <li key={name} className="breakdown-row">
                    <CategoryIcon name={name} />
                    <div className="breakdown-data">
                      <div><span>{name}</span><strong className="data-value">{formatMoney(spendGbp)}</strong></div>
                      <span className="category-carbon">{carbonKg === null ? 'Carbon estimate unavailable' : `${formatCarbon(carbonKg)} estimated`}</span>
                      <span className="category-track" aria-hidden="true"><span style={{ width: `${percentage}%` }} /></span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>}
      </div>

      {selected && <section className="insights-card recommendations-panel" aria-labelledby="insights-recommendations">
        <h2 id="insights-recommendations">Recommendations</h2>
        {recommendations.length === 0 ? <p className="quiet-state">No recommendations for this month.</p> : (
          <ul className="insights-recommendations">
            {recommendations.map((item) => (
              <li key={item.category}>
                <CategoryIcon name={item.category} />
                <div className="recommendation-action">
                  <h3>{item.category}</h3>
                  <p>{item.advice}</p>
                </div>
                <dl>
                  <div><dt>Estimated money saved</dt><dd className="recommendation-money data-value">{formatMoney(item.savingsGbp)}</dd></div>
                  <div><dt>Estimated carbon saved</dt><dd className="data-value">{formatCarbon(item.savingsKg)}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>}
    </div>
  )
}

function InsightsLoading({ message }: { message: string }) {
  return (
    <div className="insights-loading" role="status">
      <p>{message}</p>
      <div className="skeleton-layout" aria-hidden="true">
        <div className="skeleton-card skeleton-hero"><span /><span /><span /></div>
        <div className="skeleton-support">
          <div className="skeleton-card"><span /><span /></div>
          <div className="skeleton-card"><span /><span /></div>
        </div>
      </div>
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
      <label htmlFor="insights-month"><CalendarDays size={17} aria-hidden="true" /> Reporting month</label>
      <select id="insights-month" value={month} onChange={(event) => onChange(event.target.value)}>
        {months.map((item) => <option key={item} value={item}>{formatMonth(item)}</option>)}
      </select>
    </div>
  )
}

function LiveInsights({ connection, savedMonth, onAddSpending, introDismissed, onDismissIntro }: {
  connection: InsightsConnection
  savedMonth?: string
  onAddSpending?: () => void
  introDismissed: boolean
  onDismissIntro?: () => void
}) {
  const { months } = connection
  const availableMonths = [...new Set([...months.map(({ month }) => month), ...(savedMonth ? [savedMonth] : [])])].sort()
  const [month, setMonth] = useState(savedMonth ?? availableMonths.at(-1) ?? '')
  const [details, setDetails] = useState<MonthlyInsights>()
  const [error, setError] = useState<{ month: string; message: string }>()
  const [attempt, setAttempt] = useState(0)
  const [recapOpen, setRecapOpen] = useState(false)
  const recapTrigger = useRef<HTMLButtonElement>(null)
  const emptyHeading = useRef<HTMLHeadingElement>(null)

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

  if (!month && !introDismissed && onAddSpending && onDismissIntro) return (
    <OverviewWelcome onStart={onAddSpending} onSkip={() => {
      onDismissIntro()
      requestAnimationFrame(() => emptyHeading.current?.focus())
    }} />
  )

  if (!month) return (
    <section className="insights-card insights-empty">
      <span className="metric-icon"><ChartNoAxesCombined size={23} aria-hidden="true" /></span>
      <h2 ref={emptyHeading} tabIndex={-1}>No spending insights yet</h2>
      <p>Add a month of spending to see your carbon estimate and ways to save.</p>
      {onAddSpending && <button type="button" onClick={onAddSpending}>Add your first month</button>}
    </section>
  )

  const selected = details?.month === month ? details : undefined
  const change = compareCarbon(months, selected)
  const canOpenRecap = selected && (Number.isFinite(selected.totalCarbonKg) || Number.isFinite(selected.totalSpendGbp))

  return (
    <>
      <div className="overview-actions">
        <MonthPicker months={availableMonths} month={month} onChange={setMonth} />
        {canOpenRecap && (
          <button type="button" ref={recapTrigger} className="recap-trigger" aria-haspopup="dialog" onClick={() => setRecapOpen(true)}>
            <Play size={17} aria-hidden="true" /> View monthly recap
          </button>
        )}
      </div>
      {months.length > 0 && <SpendingMilestones count={months.length} />}
      <InsightsResults months={months} month={month} selected={selected} change={change} onSelect={setMonth}
        status={error?.month === month ? (
        <div className="insights-recovery">
          <p className="feedback-error" role="alert">{error.message}</p>
          <button className="button-secondary" type="button" onClick={() => {
            setError(undefined)
            setAttempt((previous) => previous + 1)
          }}>Try again</button>
        </div>
        ) : <InsightsLoading message={`Preparing insights for ${formatMonth(month)}…`} />}
      />
      {recapOpen && selected && <MonthlyRecap details={selected} change={change} onClose={() => {
        setRecapOpen(false)
        recapTrigger.current?.focus()
      }} />}
    </>
  )
}

export default function InsightsPage({ account, savedMonth, onAddSpending, introDismissed = false, onDismissIntro }: {
  account: AccountInfo
  savedMonth?: string
  onAddSpending?: () => void
  introDismissed?: boolean
  onDismissIntro?: () => void
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
    <main id="insights-content" className="spending-page insights-page" tabIndex={-1}>
      <header className="page-heading">
        <h1 ref={heading} tabIndex={-1} aria-describedby={savedMonth ? 'save-notice' : undefined}>Spending insights</h1>
      </header>
      {savedMonth && (
        <p id="save-notice" className="save-notice" role="status">
          <CircleCheck size={20} aria-hidden="true" />
          <span>Spending saved for {formatMonth(savedMonth)}.</span>
        </p>
      )}
      {error ? (
        <div className="insights-recovery">
          <p className="feedback-error" role="alert">{error}</p>
          <button className="button-secondary" type="button" onClick={() => { setError(''); setAttempt(attempt + 1) }}>Retry insights</button>
        </div>
      ) : connection ? <LiveInsights connection={connection} savedMonth={savedMonth} onAddSpending={onAddSpending}
        introDismissed={introDismissed} onDismissIntro={onDismissIntro} />
        : <InsightsLoading message="Preparing your spending insights…" />}
    </main>
  )
}
