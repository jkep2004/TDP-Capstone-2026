import { ChartNoAxesCombined, CircleCheck } from 'lucide-react'

const milestones = [3, 6, 12]

export default function SpendingMilestones({ count }: { count: number }) {
  const next = milestones.find((target) => count < target)
  const achieved = milestones.filter((target) => count >= target).at(-1)
  return (
    <section className="spending-milestones" aria-labelledby="milestones-heading">
      <span className="milestone-icon" aria-hidden="true">
        {achieved ? <CircleCheck size={23} /> : <ChartNoAxesCombined size={23} />}
      </span>
      <div>
        <h2 id="milestones-heading">{count} {count === 1 ? 'month' : 'months'} of spending added</h2>
        <p>{next ? `${next - count} more ${next - count === 1 ? 'month' : 'months'} to reach the ${next}-month milestone.` : 'You’ve reached the 12-month milestone.'}</p>
      </div>
      <div className="milestone-scale">
        <progress aria-label="Recorded months toward the 12-month milestone" value={count} max={12} />
        <ul aria-label="Spending milestones">
          {milestones.map((target) => (
            <li key={target} data-reached={count >= target}>
              {count >= target && <CircleCheck size={14} aria-hidden="true" />}
              {target} months
              <span className="visually-hidden">{count >= target ? ' reached' : ' upcoming'}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
