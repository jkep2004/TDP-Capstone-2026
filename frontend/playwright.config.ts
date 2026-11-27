import { createSign, generateKeyPairSync, randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const apiUrl = 'http://127.0.0.1:8003'
const frontendUrl = 'http://localhost:5173'
const customerId = '00000000-0000-0000-0000-000000000102'
const tenantId = '00000000-0000-4000-8000-000000000001'
const apiClientId = '00000000-0000-4000-8000-000000000002'
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const now = Math.floor(Date.now() / 1000)
const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'playwright' })).toString('base64url')
const claims = Buffer.from(JSON.stringify({
  aud: apiClientId,
  iss: `https://login.microsoftonline.com/${tenantId}/v2.0`,
  tid: tenantId,
  oid: customerId,
  preferred_username: 'playwright@example.test',
  scp: 'access_as_user',
  iat: now,
  nbf: now,
  exp: now + 600,
})).toString('base64url')
const unsignedToken = `${header}.${claims}`
const signature = createSign('RSA-SHA256').update(unsignedToken).sign(privateKey, 'base64url')

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL: frontendUrl },
  webServer: [
    {
      command: 'python tests/e2e/serve_api.py',
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      url: `${apiUrl}/api/v1/health/database`,
      timeout: 30_000,
      env: {
        PYTHONPATH: fileURLToPath(new URL('../api/', import.meta.url)),
        DB_SERVER: '127.0.0.1',
        DB_NAME: 'CapstoneE2E',
        DB_ADMIN_USER: 'sa',
        DB_ADMIN_PASSWORD: process.env.E2E_SQL_PASSWORD ?? '',
        ENTRA_TENANT_ID: tenantId,
        ENTRA_API_CLIENT_ID: apiClientId,
        APP_JWT_SECRET: randomBytes(32).toString('hex'),
        APP_JWT_ALGORITHM: 'HS256',
        APP_JWT_EXPIRE_MINUTES: '10',
        E2E_ENTRA_PUBLIC_KEY: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      },
    },
    {
      command: 'npm run dev -- --config e2e/vite.config.ts --host localhost --port 5173 --strictPort',
      url: frontendUrl,
      env: {
        VITE_API_URL: apiUrl,
        VITE_INSIGHTS_API_URL: apiUrl,
        VITE_ENTRA_API_CLIENT_ID: apiClientId,
        VITE_E2E_ENTRA_TOKEN: `${unsignedToken}.${signature}`,
        VITE_E2E_CUSTOMER_ID: customerId,
        VITE_E2E_TENANT_ID: tenantId,
      },
    },
  ],
})
