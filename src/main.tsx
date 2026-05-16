import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ConvexClientProvider } from './lib/convex.tsx'
import { ThemeProvider } from './lib/theme.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexClientProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ConvexClientProvider>
  </StrictMode>,
)
