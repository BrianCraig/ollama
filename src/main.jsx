import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { SettingsProvider } from './contexts/SettingsContext'
import { ConversationUIProvider } from './contexts/ConversationUIContext'

import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SettingsProvider>
      <ConversationUIProvider>
        <App />
      </ConversationUIProvider>
    </SettingsProvider>
  </StrictMode>,
)
