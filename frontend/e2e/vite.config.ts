import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const msalFixture = fileURLToPath(new URL('./msal.ts', import.meta.url))

export default defineConfig({
  plugins: [react()],
  // Activate the identity fixture only when Playwright launches this config.
  resolve: {
    alias: [
      { find: /^@azure\/msal-react$/, replacement: msalFixture },
      { find: /^\.\.?\/auth\/msal$/, replacement: msalFixture },
    ],
  },
})
