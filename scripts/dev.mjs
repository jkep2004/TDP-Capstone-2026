import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const frontend = fileURLToPath(new URL('../frontend/', import.meta.url))
const vite = fileURLToPath(new URL('../frontend/node_modules/vite/bin/vite.js', import.meta.url))
const apiPort = process.env.LOCAL_API_PORT || '8000'
const apiUrl = `http://127.0.0.1:${apiPort}`

const services = [
  ['Backend', spawn('python', [
    '-m', 'uvicorn', 'src.main:app', '--app-dir', 'api', '--host', '127.0.0.1', '--port', apiPort,
  ], { cwd: root, stdio: 'inherit' })],
  ['Frontend', spawn(process.execPath, [vite, '--host', 'localhost', '--port', '5173', '--strictPort'], {
    cwd: frontend,
    stdio: 'inherit',
    env: { ...process.env, VITE_API_URL: apiUrl, VITE_INSIGHTS_API_URL: apiUrl },
  })],
]

let stopping = false
function stop(exitCode) {
  if (stopping) return
  stopping = true
  process.exitCode = exitCode
  for (const [, child] of services) {
    if (child.exitCode === null && child.signalCode === null) child.kill()
  }
}

for (const [name, child] of services) {
  child.on('error', (error) => {
    console.error(`${name} could not start: ${error.message}`)
    stop(1)
  })
  child.on('exit', (code, signal) => stop(code ?? (signal === 'SIGINT' ? 0 : 1)))
}

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
