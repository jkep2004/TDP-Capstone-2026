import { ArrowRight, ChartNoAxesCombined, Leaf, Wallet } from 'lucide-react'

const steps = [
  { title: 'Add your spending', description: 'Enter monthly totals or upload a spending file.', Icon: Wallet },
  { title: 'See your footprint', description: 'Find out which categories contribute most to your estimated emissions.', Icon: ChartNoAxesCombined },
  { title: 'Find ways to save', description: 'Explore practical suggestions based on the spending you add.', Icon: Leaf },
]

export default function OverviewWelcome({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <section className="overview-welcome" aria-labelledby="overview-welcome-heading">
      <div className="welcome-intro">
        <span className="welcome-mark"><Leaf size={24} strokeWidth={1.65} aria-hidden="true" /></span>
        <h2 id="overview-welcome-heading">Start with one month</h2>
        <p>See where your money goes, what it means for your carbon footprint and where you could save.</p>
        <div className="welcome-actions">
          <button type="button" onClick={onStart}>Add your first month <ArrowRight size={18} aria-hidden="true" /></button>
          <button className="welcome-skip" type="button" onClick={onSkip}>Skip for now</button>
        </div>
      </div>
      <ol className="welcome-steps">
        {steps.map(({ title, description, Icon }) => (
          <li key={title}>
            <span className="welcome-step-icon"><Icon size={21} strokeWidth={1.7} aria-hidden="true" /></span>
            <div><h3>{title}</h3><p>{description}</p></div>
          </li>
        ))}
      </ol>
    </section>
  )
}
