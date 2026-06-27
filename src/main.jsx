import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { consumirHandoffSessao } from '@/lib/sislegisApi'
import { aplicarTema, consumirHandoffAparencia } from '@/lib/theme'

// Se esta janela foi aberta com tema/paleta no hash (ex.: telão em outro monitor
// ou subdomínio, sem localStorage compartilhado), aplica ANTES de limpar o hash.
consumirHandoffAparencia()

// Se esta janela foi aberta com uma sessão no hash (ex.: telão em outro monitor),
// consome a sessão ANTES de renderizar, para já entrar autenticado. (Também limpa o hash.)
consumirHandoffSessao()

// Garante o tema aplicado (claro/escuro/mesclado).
aplicarTema()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
