import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { MsalProvider } from "@azure/msal-react";

import './index.css'
import App from './App.tsx';
import { msalInstance } from "./msal";

async function bootstrap() {
  await msalInstance.initialize();

  await msalInstance.handleRedirectPromise();

  createRoot(
    document.getElementById("root")!
  ).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>
  );
}

bootstrap();