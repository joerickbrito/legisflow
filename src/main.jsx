import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { consumirHandoffSessao } from '@/lib/sislegisApi'
import { aplicarTema } from '@/lib/theme'

// Se esta janela foi aberta com uma sessão no hash (ex.: telão em outro monitor),
// consome a sessão ANTES de renderizar, para já entrar autenticado.
consumirHandoffSessao()

// Aplica o tema escolhido (claro/escuro/mesclado) antes de renderizar.
aplicarTema()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
