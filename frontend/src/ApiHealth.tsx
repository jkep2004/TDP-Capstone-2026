import { useState } from 'react'
import { checkHealth } from './api'

export default function ApiHealth() {
  const [results, setResults] = useState<string[]>([])
  const [checking, setChecking] = useState(false)

  const runChecks = async () => {
    setChecking(true)
    setResults([])
    const checks = [
      ['API', '/health/'],
      ['Database', '/health/database'],
    ] as const

    const outcomes = await Promise.all(checks.map(async ([label, path]) => {
      try {
        const result = await checkHealth(path)
        return `${label} health: ${result.status} (API v${result.version})`
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Request failed'
        return `${label} health: ${message}`
      }
    }))

    setResults(outcomes)
    setChecking(false)
  }

  return (
    <div>
      <button type="button" onClick={runChecks} disabled={checking}>
        {checking ? 'Checking health…' : 'Check API and database health'}
      </button>
      <div role="status">
        {results.map((result) => <div key={result}>{result}</div>)}
      </div>
    </div>
  )
}
