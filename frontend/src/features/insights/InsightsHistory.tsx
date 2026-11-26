import { useId, useState } from 'react'
import type { CSSProperties } from 'react'
import { formatCarbon, formatMoney } from '../../utils/formatAmounts'
import { formatMonth } from '../../utils/formatMonth'

export type TrendPoint = { month: string; totalCarbonKg: number | null; totalSpendGbp: number | null }

const shortMonth = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' })
const chartPeriod = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const axisNumber = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })
const axisMoney = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 2 })
const historyRanges = [3, 6, 12]

function monthIndex(month: string) {
  const [year, number] = month.split('-').map(Number)
  return year * 12 + number
}

export default function InsightsHistory({ months, current, onSelect }: {
  months: TrendPoint[]
  current: string
  onSelect: (month: string) => void
}) {
  const rangeId = useId()
  const [metric, setMetric] = useState<'carbon' | 'spending'>('carbon')
  const [range, setRange] = useState(6)
  const carbon = metric === 'carbon'
  const latestMonth = months.at(-1)?.month
  const earliestMonth = months[0]?.month
  const latestIndex = latestMonth ? monthIndex(latestMonth) : 0
  const span = earliestMonth ? latestIndex - monthIndex(earliestMonth) + 1 : 0
  const ranges = historyRanges.filter((_, index) => index === 0 || span > historyRanges[index - 1])
  const visibleRange = Math.min(range, ranges.at(-1) ?? 3)
  const points = months.filter(({ month }) => monthIndex(month) > latestIndex - visibleRange)
    .map(({ month, totalCarbonKg, totalSpendGbp }) => ({ month, reading: carbon ? totalCarbonKg : totalSpendGbp }))
  const available = points.some(({ reading }) => reading !== null)
  const peak = Math.max(1, ...points.map(({ reading }) => reading ?? 0))
  const unit = 10 ** Math.floor(Math.log10(peak / 3))
  const step = Math.ceil(peak / (3 * unit)) * unit
  const ceiling = 3 * step

  return (
    <section className="insights-card history-panel" aria-labelledby="insights-history" data-metric={metric}>
      <header className="panel-heading">
        <h2 id="insights-history" tabIndex={-1}>{carbon ? 'Estimated carbon over time' : 'Spending over time'}</h2>
        {available && <span className="chart-unit">{carbon ? 'kg CO₂e' : '£'}</span>}
      </header>
      {months.length > 0 && (
        <div className="history-toolbar">
          <div className="history-metrics" role="group" aria-label="History metric">
            <button type="button" aria-pressed={carbon} onClick={() => setMetric('carbon')}>Carbon</button>
            <button type="button" aria-pressed={!carbon} onClick={() => setMetric('spending')}>Spend</button>
          </div>
          {ranges.length > 1 && (
            <label className="history-range" htmlFor={rangeId}>
              <span className="visually-hidden">History range</span>
              <select id={rangeId} value={visibleRange} onChange={(event) => setRange(Number(event.target.value))}>
                {ranges.map((months) => <option key={months} value={months}>Last {months} months</option>)}
              </select>
            </label>
          )}
        </div>
      )}
      {available ? (
        <div className="history-chart">
          <div className="history-axis" aria-hidden="true">
            {[ceiling, 2 * step, step, 0].map((value) => <span key={value}>{(carbon ? axisNumber : axisMoney).format(value)}</span>)}
          </div>
          <ol className="history-points" style={{ '--periods': points.length } as CSSProperties} aria-label={carbon ? 'Monthly carbon estimates' : 'Monthly spending totals'}>
            {points.map(({ month, reading }) => {
              const date = formatMonth(month)
              const dateValue = new Date(`${month}-01T00:00:00Z`)
              const period = chartPeriod.format(dateValue)
              const value = reading === null ? 'Unavailable' : (carbon ? formatCarbon(reading) : formatMoney(reading))
              const style = { '--measure': `${(reading ?? 0) / ceiling * 100}%` } as CSSProperties
              return (
                <li key={month}>
                  <button type="button" className="history-point" aria-label={`${period}, ${value}`} aria-pressed={month === current}
                    onClick={() => onSelect(month)}>
                    <span className="history-track" aria-hidden="true">
                      {reading !== null && <span key={metric} className="history-bar" style={style} />}
                    </span>
                    <span className="history-date" aria-hidden="true">{shortMonth.format(dateValue)}</span>
                    <span className="history-full-date" aria-hidden="true">{period}</span>
                    <span className="history-reading" aria-hidden="true">{value}</span>
                  </button>
                  <span className="history-tooltip" aria-hidden="true"><strong>{date}</strong>{value}</span>
                </li>
              )
            })}
          </ol>
        </div>
      ) : <p className="quiet-state">{months.length ? 'There’s no data for this view.' : 'Add more months of spending to see a trend.'}</p>}
    </section>
  )
}
