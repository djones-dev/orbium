import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/terminal.css'
import './styles/crt.css'
import { useUIStore } from './stores/uiStore'

// Expose store for console debugging
(window as any).useUIStore = useUIStore;

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
