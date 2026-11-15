import './App.css'
import SpendingForm from './SpendingForm'

function App() {
  return (
    <main className="spending-page">
      <header>
        <p className="eyebrow">Carbon & Savings Advisor</p>
        <h1>Monthly spending</h1>
        <p className="intro">
          Enter your monthly totals to start understanding your carbon impact.
        </p>
      </header>

      <section className="spending-card" aria-labelledby="form-heading">
        <h2 id="form-heading">Enter spending manually</h2>
        <p id="spending-help" className="help-text">
          All amounts are in pounds (£). Enter 0 if you spent nothing
          in a category.
        </p>
        <SpendingForm />
      </section>
    </main>
  )
}

export default App