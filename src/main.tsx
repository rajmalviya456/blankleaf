import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { createAppStore, initStore } from './store/store'
import './styles/index.css'

// Temporary until persistence (Task 8) restores the saved session.
const store = initStore(createAppStore())
store.getState().newNote()

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
