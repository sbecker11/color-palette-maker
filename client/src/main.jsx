import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Echo configuration at initialization
if (import.meta.env.DEV) {
  const cfg = {
    VITE_HIGHLIGHT_REGION_ON_ROLLOVER: import.meta.env.VITE_HIGHLIGHT_REGION_ON_ROLLOVER,
    VITE_REGION_HIGHLIGHT_STROKE_WIDTH: import.meta.env.VITE_REGION_HIGHLIGHT_STROKE_WIDTH,
    VITE_REGION_HIGHLIGHT_FILL: import.meta.env.VITE_REGION_HIGHLIGHT_FILL,
    VITE_SWATCH_HIGHLIGHT_PERCENTAGE: import.meta.env.VITE_SWATCH_HIGHLIGHT_PERCENTAGE,
  }
  console.log('[Config]', cfg)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
