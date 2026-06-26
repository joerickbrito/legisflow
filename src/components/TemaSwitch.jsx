// Seletor de tema compacto (Claro / Mesclado / Escuro) para a barra lateral.
// Visível para todos os usuários. Quando a sidebar está recolhida, vira um
// único botão que alterna entre os modos.
import { Sun, Moon, LayoutDashboard } from 'lucide-react';
import { useTema, setTema } from '@/lib/theme';
import { cn } from '@/lib/utils';

const OPCOES = [
  { v: 'claro', label: 'Claro', Icon: Sun },
  { v: 'mesclado', label: 'Mesclado', Icon: LayoutDashboard },
  { v: 'escuro', label: 'Escuro', Icon: Moon },
];

export default function TemaSwitch({ collapsed = false }) {
  const tema = useTema();
  const idx = Math.max(0, OPCOES.findIndex((o) => o.v === tema));
  const atual = OPCOES[idx];

  if (collapsed) {
    const prox = OPCOES[(idx + 1) % OPCOES.length];
    const Icon = atual.Icon;
    return (
      <button
        type="button"
        onClick={() => setTema(prox.v)}
        title={`Tema: ${atual.label} — clique para ${prox.label}`}
        aria-label={`Alternar tema (atual: ${atual.label})`}
        className="flex items-center justify-center w-full py-2 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
      >
        <Icon size={16} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-sidebar-accent/40 rounded-lg p-1" role="group" aria-label="Tema">
      {OPCOES.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => setTema(o.v)}
          title={o.label}
          aria-pressed={tema === o.v}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-colors',
            tema === o.v
              ? 'bg-sidebar-foreground/15 text-sidebar-foreground'
              : 'text-sidebar-foreground/50 hover:text-sidebar-foreground'
          )}
        >
          <o.Icon size={13} />
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}
