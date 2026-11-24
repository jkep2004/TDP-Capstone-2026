import { useState } from 'react'
import { checkHealth } from './api'

export default function ApiHealth() {
  const [result, setResult] = useState('')
  const [checking, setChecking] = useState(false)

  const runCheck = async () => {
    setChecking(true)
    setResult('')
    try {
      const health = await checkHealth()
      setResult(`API health: ${health.status} (API v${health.version})`)
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'API health check failed')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={runCheck} disabled={checking}>
        {checking ? 'Checking API health…' : 'Check API health'}
      </button>
      <div role="status">{result}</div>
    </div>
  )
}
