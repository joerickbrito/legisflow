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

// ===== Paletas de cor da câmara (cor de detalhe) =====
// A paleta é uma preferência DA CÂMARA (salva no registro Camara), então vale
// para todos os usuários/telas daquela câmara. O modo claro/mesclado/escuro
// continua por dispositivo (acima).
export const PALETAS = [
  { v: 'azul', label: 'Azul Institucional', desc: 'Azul profundo com base bege/off-white. Padrão sóbrio e clássico.', cor: '#1e4d8b' },
  { v: 'dourado', label: 'Dourado', desc: 'Azul-marinho com dourado discreto nos detalhes. Ar cerimonial.', cor: '#b08114' },
  { v: 'verde', label: 'Verde', desc: 'Verde institucional sobre base neutra. Sóbrio e sereno.', cor: '#2f8f5b' },
  { v: 'vermelho', label: 'Vermelho', desc: 'Bordô sobre base neutra. Forte, sem exageros.', cor: '#b03a3a' },
];
const PALETAS_VALIDAS = PALETAS.map((p) => p.v);

export function aplicarPaleta(p) {
  if (typeof document === 'undefined') return;
  const val = PALETAS_VALIDAS.includes(p) ? p : 'azul';
  document.documentElement.dataset.paleta = val;
}

export function getPaletaAtual() {
  if (typeof document === 'undefined') return 'azul';
  return document.documentElement.dataset.paleta || 'azul';
}

// Consome tema/paleta vindos do hash da URL (ex.: janela do telão aberta em
// outro subdomínio, onde o localStorage não é compartilhado). Deve rodar ANTES
// de limpar o hash. Persiste o tema neste dispositivo e aplica tudo na hora.
export function consumirHandoffAparencia() {
  try {
    const h = window.location.hash || '';
    const mt = h.match(/[#&]tema=([^&]+)/);
    if (mt) {
      const t = decodeURIComponent(mt[1]);
      if (VALIDOS.includes(t)) {
        try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
        aplicarTema(t);
      }
    }
    const mp = h.match(/[#&]paleta=([^&]+)/);
    if (mp) aplicarPaleta(decodeURIComponent(mp[1]));
  } catch { /* ignore */ }
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
