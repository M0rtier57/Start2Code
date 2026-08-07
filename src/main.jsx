import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App.jsx'
import { ToastProvider } from './components/ui'
import { AuthProvider } from './lib/AuthContext'
import { CurriculumProvider } from './lib/CurriculumContext'
import { I18nProvider } from './i18n'
import './index.css'

// The app started, so whatever the recovery handler in index.html was worried
// about is resolved. Clearing it here — rather than on window load — means a
// build that never boots cannot reload in a loop.
sessionStorage.removeItem('s2c:recovering')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <CurriculumProvider>
              <App />
            </CurriculumProvider>
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>
)
