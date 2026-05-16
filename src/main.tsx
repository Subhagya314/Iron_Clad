import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import faviconSrc from './assets/iron-clad-logo.png'
import { ConvexClientProvider } from './lib/convex.tsx'
import { ThemeProvider } from './lib/theme.tsx'

function installIronCladFavicon() {
  let link = document.querySelector(
    'link[data-iron-clad-favicon="1"]',
  ) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png'
    link.href = faviconSrc
    link.dataset.ironCladFavicon = '1'
    document.head.appendChild(link)
    return
  }
  link.href = faviconSrc
}
installIronCladFavicon()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexClientProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ConvexClientProvider>
  </StrictMode>,
)
