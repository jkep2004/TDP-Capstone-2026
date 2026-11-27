import { ArrowRight, ChartNoAxesCombined, Leaf, Lightbulb } from 'lucide-react'

export default function OverviewTour({ hasHistory, hasRecommendations }: {
  hasHistory: boolean
  hasRecommendations: boolean
}) {
  const stops = [
    { heading: 'carbon-summary', label: 'See your impact', Icon: Leaf },
    { heading: hasHistory ? 'insights-history' : 'carbon-categories', label: 'Explore your spending', Icon: ChartNoAxesCombined },
    ...(hasRecommendations ? [{ heading: 'insights-recommendations', label: 'Find a way to save', Icon: Lightbulb }] : []),
  ]

  return (
    <nav id="overview-tour" className="overview-tour" aria-label="Overview guide">
      {stops.map(({ heading, label, Icon }) => (
        <button key={heading} className="button-secondary" type="button" onClick={() => {
          const target = document.getElementById(heading)
          target?.focus({ preventScroll: true })
          const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          target?.scrollIntoView?.({ block: 'start', behavior: reduced ? 'instant' : 'smooth' })
        }}>
          <Icon size={19} aria-hidden="true" /> {label} <ArrowRight size={16} aria-hidden="true" />
        </button>
      ))}
    </nav>
  )
}
