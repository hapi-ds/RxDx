import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { logger } from './services/logger'

// Log application start
logger.info('Application started', {
  version: import.meta.env.VITE_APP_VERSION || '0.1.0',
  environment: import.meta.env.MODE,
  sessionId: logger.getSessionId(),
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
