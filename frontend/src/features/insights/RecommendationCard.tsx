import { useId, useState } from 'react'
import { RotateCw } from 'lucide-react'
import CategoryIcon from '../../app/CategoryIcon'
import { formatCarbon, formatMoney } from '../../utils/formatAmounts'
import type { MonthlyInsights } from './types'

export default function RecommendationCard({ category, advice, savingsGbp, savingsKg }: MonthlyInsights['recommendations'][number]) {
  const [revealed, setRevealed] = useState(false)
  const detailsId = useId()

  return (
    <li className="recommendation-card" data-revealed={revealed}>
      <button
        type="button"
        className="recommendation-toggle"
        aria-label={`${revealed ? 'Hide' : 'Reveal'} recommendation for ${category}`}
        aria-expanded={revealed}
        aria-controls={detailsId}
        aria-describedby={revealed ? detailsId : undefined}
        onClick={() => setRevealed((previous) => !previous)}
      />
      <div className="recommendation-face recommendation-front" aria-hidden={revealed}>
        <CategoryIcon name={category} />
        <h3>{category}</h3>
        <span className="recommendation-cue"><RotateCw size={16} aria-hidden="true" /> Reveal recommendation</span>
      </div>
      <div className="recommendation-face recommendation-back" aria-hidden={!revealed}>
        <h3>{category}</h3>
        <div id={detailsId}>
          <p>{advice}</p>
          <dl>
            <div><dt>Estimated money saved</dt><dd className="data-value">{formatMoney(savingsGbp)}</dd></div>
            <div><dt>Estimated carbon saved</dt><dd className="data-value">{formatCarbon(savingsKg)}</dd></div>
          </dl>
        </div>
        <span className="recommendation-cue"><RotateCw size={16} aria-hidden="true" /> Hide recommendation</span>
      </div>
    </li>
  )
}
