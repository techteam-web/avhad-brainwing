import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// The guidelines set Archivo for headings and Avenir for everything else. Archivo is
// open, so it ships with the site. Avenir is Linotype's and cannot be self-hosted without
// a licence, so it is used where the device already has it (every Apple device) and
// Nunito Sans — the nearest open humanist geometric — is shipped for everywhere else.
import '@fontsource-variable/archivo'
import '@fontsource-variable/nunito-sans'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
