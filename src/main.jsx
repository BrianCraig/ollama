import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { SettingsProvider } from './contexts/SettingsContext'
import { ConversationsProvider } from './contexts/ConversationsContext'
import { ConversationUIProvider } from './contexts/ConversationUIContext'

import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SettingsProvider>
      <ConversationsProvider>
        <ConversationUIProvider>
          <App />
        </ConversationUIProvider>
      </ConversationsProvider>
    </SettingsProvider>
  </StrictMode>,
)
