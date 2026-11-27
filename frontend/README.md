# React + TypeScript + Vite

## Browser end-to-end test

In GitHub Actions, open **DevSecOps CI/CD Pipeline**, then **Browser End-to-End Tests**. The job seeds an isolated SQL Server database, starts Vite and FastAPI, and uses Playwright to sign in as the synthetic C102 customer, save Groceries spending, and check both the saved result and the November 2026 seeded insights.

The browser uses a test identity and FastAPI validates its token against a temporary signing key. The test exercises the application's token exchange, spending and insights routes, and SQL persistence. The Microsoft-hosted login page is covered by the manual deployed sign-in check.

For local runs, use a fresh disposable SQL Server on `127.0.0.1:1433` with ODBC Driver 18 and the API dependencies installed. Set `DB_SERVER` to `127.0.0.1,1433`, `DB_NAME` to `CapstoneE2E`, and `DB_ADMIN_USER` to `sa`. Set `DB_ADMIN_PASSWORD` and `E2E_SQL_PASSWORD` to its password. From the repository root, seed the database with `python infra/database/init_db.py --with-test-data`. Then run the following from `frontend`, with ports 5173 and 8003 free.

```powershell
npm.cmd ci
npx.cmd playwright install chromium
npm.cmd run test:e2e -- --headed
```

Use a fresh database for another run because the test saves a fixed month for C102.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
