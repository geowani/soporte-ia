import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { syncAgentIdFromUser } from './lib/auth'
syncAgentIdFromUser()

window.addEventListener('storage', (e) => {
  if (e.key === 'user' || e.key === 'usuario') syncAgentIdFromUser()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <HashRouter>
    <App />
  </HashRouter>
)
