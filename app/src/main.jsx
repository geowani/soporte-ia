import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// ⬇️ importa el helper y sincroniza al arrancar
import { syncAgentIdFromUser } from './lib/auth'
syncAgentIdFromUser()

// si otra pestaña cambia el usuario, mantenlo sincronizado
window.addEventListener('storage', (e) => {
  if (e.key === 'user' || e.key === 'usuario') syncAgentIdFromUser()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <HashRouter>
    <App />
  </HashRouter>
)
