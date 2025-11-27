import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ConversationUIProvider } from './contexts/ConversationUIContext'

import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConversationUIProvider>
      <App />
    </ConversationUIProvider>
  </StrictMode>,
)
