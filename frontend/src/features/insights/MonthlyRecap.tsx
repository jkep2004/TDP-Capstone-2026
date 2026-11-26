import { useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Leaf, Lightbulb, TrendingDown, TrendingUp, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatCarbon, formatMoney } from '../../utils/formatAmounts'
import { formatMonth } from '../../utils/formatMonth'
import type { MonthlyInsights } from './types'

type Slide = { title: string; value: string; detail: string; Icon: LucideIcon }

function buildSlides(details: MonthlyInsights, change: number | null): Slide[] {
  const highest = details.categories.reduce<MonthlyInsights['categories'][number] | undefined>((best, category) => {
    return (category.carbonKg ?? 0) > (best?.carbonKg ?? 0) ? category : best
  }, undefined)
  const footprint = details.totalCarbonKg
  const hasCarbon = footprint !== null && Number.isFinite(footprint)
  const slides: Slide[] = [{
    title: hasCarbon ? 'Your estimated footprint' : 'Your monthly spending',
    value: hasCarbon ? formatCarbon(footprint) : formatMoney(details.totalSpendGbp),
    detail: highest ? `${highest.name} was your biggest source of estimated emissions.` : 'Based on the spending you added for this month.',
    Icon: Leaf,
  }]

  if (change !== null && Number.isFinite(change)) {
    slides.push({
      title: 'Compared with last month',
      value: change === 0 ? 'No change' : `${formatCarbon(Math.abs(change))} ${change < 0 ? 'lower' : 'higher'}`,
      detail: 'This compares the estimated footprints of the spending you added for both months.',
      Icon: change > 0 ? TrendingUp : TrendingDown,
    })
  }

  const recommendation = details.recommendations.reduce<MonthlyInsights['recommendations'][number] | undefined>((best, item) => {
    return !best || item.savingsGbp > best.savingsGbp ? item : best
  }, undefined)
  if (recommendation) {
    slides.push({
      title: 'One change to try',
      value: Number.isFinite(recommendation.savingsGbp) && recommendation.savingsGbp > 0
        ? `${formatMoney(recommendation.savingsGbp)} in potential savings`
        : recommendation.category,
      detail: recommendation.advice,
      Icon: Lightbulb,
    })
  }
  return slides
}

export default function MonthlyRecap({ details, change, onClose }: {
  details: MonthlyInsights
  change: number | null
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const dialogTitle = useId()
  const [index, setIndex] = useState(0)
  const slides = buildSlides(details, change)
  const current = slides[index]
  const last = index === slides.length - 1

  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal()
    heading.current?.focus()
  }, [index])

  return (
    <dialog ref={dialog} className="monthly-recap" aria-labelledby={dialogTitle} onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' && index > 0) {
          event.preventDefault()
          setIndex(index - 1)
        }
        if (event.key === 'ArrowRight' && !last) {
          event.preventDefault()
          setIndex(index + 1)
        }
      }}>
      <div className="recap-frame">
        <header className="recap-header">
          <p id={dialogTitle}>{formatMonth(details.month)} recap</p>
          <button className="recap-close" type="button" aria-label="Close recap" onClick={() => dialog.current?.close()}>
            <X size={22} aria-hidden="true" />
          </button>
        </header>
        <div className="recap-progress" role="progressbar" aria-label="Recap progress" aria-valuemin={0} aria-valuemax={slides.length} aria-valuenow={index + 1}>
          {slides.map(({ title }, step) => <span key={title} data-complete={step <= index} />)}
        </div>
        <section className="recap-slide" key={index}>
          <span className="recap-mark"><current.Icon size={30} strokeWidth={1.7} aria-hidden="true" /></span>
          <h2 ref={heading} tabIndex={-1}>{current.title}</h2>
          <p className="recap-value data-value">{current.value}</p>
          <p>{current.detail}</p>
        </section>
        <footer className="recap-controls">
          <button className="recap-back" type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            <ArrowLeft size={17} aria-hidden="true" /> Back
          </button>
          <span aria-live="polite" aria-atomic="true">{index + 1} of {slides.length}</span>
          <button className="recap-next" type="button" onClick={() => last ? dialog.current?.close() : setIndex(index + 1)}>
            {last ? 'Done' : 'Next'} {!last && <ArrowRight size={17} aria-hidden="true" />}
          </button>
        </footer>
      </div>
    </dialog>
  )
}
