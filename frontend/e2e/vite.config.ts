import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const msalFixture = fileURLToPath(new URL('./msal.ts', import.meta.url))

export default defineConfig({
  // The test identity changes module resolution, so keep its dependency bundles separate.
  cacheDir: 'node_modules/.vite-e2e',
  plugins: [react()],
  // Activate the identity fixture only when Playwright launches this config.
  resolve: {
    alias: [
      { find: /^@azure\/msal-react$/, replacement: msalFixture },
      { find: /^\.\.?\/auth\/msal$/, replacement: msalFixture },
    ],
  },
})
