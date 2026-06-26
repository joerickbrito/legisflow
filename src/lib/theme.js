// Tema da aplicação — 3 modos:
//   'claro'    → site e painéis claros
//   'escuro'   → site e painéis escuros (classe .dark no <html>)
//   'mesclado' → conteúdo claro + sidebar escura (padrão) + painel de votação escuro
//
// Preferência salva em localStorage (não é dado sensível). Aplica a classe .dark
// no <html> apenas no modo escuro; o modo mesclado força o painel escuro via wrapper.
import { useEffect, useState } from 'react';

const KEY = 'sislegis_tema';
const VALIDOS = ['claro', 'escuro', 'mesclado'];
const PADRAO = 'mesclado';

export function getTema() {
  try {
    const t = localStorage.getItem(KEY);
    return VALIDOS.includes(t) ? t : PADRAO;
  } catch {
    return PADRAO;
  }
}

export function aplicarTema(t = getTema()) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  if (t === 'escuro') el.classList.add('dark');
  else el.classList.remove('dark');
}

export function setTema(t) {
  if (!VALIDOS.includes(t)) return;
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  aplicarTema(t);
  try { window.dispatchEvent(new Event('sislegis-tema')); } catch { /* ignore */ }
}

// O painel de votação (telão/vereador) deve ser escuro em todos os modos, exceto no claro.
export function painelEscuro(t = getTema()) {
  return t !== 'claro';
}

// Hook reativo: re-renderiza quando o tema muda (inclusive em outra aba/janela).
export function useTema() {
  const [tema, set] = useState(getTema());
  useEffect(() => {
    const h = () => set(getTema());
    window.addEventListener('sislegis-tema', h);
    window.addEventListener('storage', h);
    return () => {
      window.removeEventListener('sislegis-tema', h);
      window.removeEventListener('storage', h);
    };
  }, []);
  return tema;
}
