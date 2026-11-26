import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { MsalProvider } from "@azure/msal-react";

import './styles/index.css'
import App from './app/App';
import { msalInstance } from "./auth/msal";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </StrictMode>
);
