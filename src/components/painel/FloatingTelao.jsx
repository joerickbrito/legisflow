// Janela flutuante do telão — renderiza DENTRO da página (não depende de popup,
// então funciona em qualquer navegador/preview). Pode ser arrastada, maximizada,
// e tem um botão para "soltar" numa janela separada (ideal para jogar na TV).

import { useState } from 'react';
import { X, Maximize2, Minimize2, ExternalLink, GripHorizontal } from 'lucide-react';
import TelaoVotacao from '@/components/painel/TelaoVotacao';

export default function FloatingTelao({ votacaoAtiva, camara, onRefresh, onClose }) {
  const [pos, setPos] = useState({ x: 60, y: 60 });
  const [maximized, setMaximized] = useState(false);

  function onDragStart(e) {
    if (maximized) return;
    e.preventDefault();
    const offsetX = e.clientX - pos.x;
    const offsetY = e.clientY - pos.y;
    function onMove(ev) {
      const x = Math.max(0, Math.min(ev.clientX - offsetX, window.innerWidth - 120));
      const y = Math.max(0, Math.min(ev.clientY - offsetY, window.innerHeight - 60));
      setPos({ x, y });
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const style = maximized
    ? { top: 0, left: 0, width: '100vw', height: '100vh', borderRadius: 0 }
    : { top: pos.y, left: pos.x, width: 'min(1000px, 92vw)', height: 'min(640px, 86vh)' };

  return (
    <div
      className="fixed z-[100] bg-gray-950 overflow-hidden shadow-2xl ring-1 ring-white/10 flex flex-col rounded-xl"
      style={style}
    >
      {/* Barra de título (arrastar) */}
      <div
        onMouseDown={onDragStart}
        className={`flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-white/10 select-none ${maximized ? '' : 'cursor-move'}`}
      >
        <div className="flex items-center gap-2 text-white/70 text-xs font-medium">
          <GripHorizontal size={14} className="text-white/40" />
          Telão de Votação {maximized ? '' : '— arraste para mover'}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => window.open('/telao', 'telao_votacao', 'width=1280,height=720')}
            title="Abrir em janela separada (para a TV / 2º monitor)"
            className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ExternalLink size={14} />
          </button>
          <button
            onClick={() => setMaximized(m => !m)}
            title={maximized ? 'Restaurar' : 'Tela cheia'}
            className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            title="Fechar"
            className="p-1.5 rounded text-white/50 hover:text-white hover:bg-red-500/40 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Conteúdo do telão (preenche o restante) */}
      <div className="flex-1 min-h-0">
        <TelaoVotacao votacaoAtiva={votacaoAtiva} camara={camara} onRefresh={onRefresh} embedded />
      </div>
    </div>
  );
}
