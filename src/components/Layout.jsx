import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Calendar, Vote, Users, Building2,
  ScrollText, Inbox, ChevronLeft, ChevronRight, Menu, LogOut,
  Scale, Gavel, MessageSquare, BarChart3, Globe, BookOpen,
  FolderOpen, ChevronDown, ChevronRight as ChevRight,
  Monitor, UserCheck, FileDiff, UsersRound, Mail
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const navGroups = [
  {
    label: 'Principal',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ]
  },
  {
    label: 'Estrutura',
    items: [
      { path: '/casa-legislativa', icon: Building2, label: 'Casa Legislativa' },
      { path: '/legislaturas', icon: BookOpen, label: 'Legislaturas' },
      { path: '/parlamentares', icon: Users, label: 'Parlamentares' },
      { path: '/partidos', icon: Scale, label: 'Partidos' },
      { path: '/mesa-diretora', icon: Gavel, label: 'Mesa Diretora' },
      { path: '/comissoes', icon: Building2, label: 'Comissões' },
    ]
  },
  {
    label: 'Processo Legislativo',
    items: [
      { path: '/protocolo', icon: Inbox, label: 'Protocolo' },
      { path: '/proposicoes', icon: FolderOpen, label: 'Proposições' },
      { path: '/materias', icon: FileText, label: 'Matérias' },
      { path: '/emendas', icon: FileDiff, label: 'Emendas' },
      { path: '/tramitacoes', icon: ChevRight, label: 'Tramitações' },
      { path: '/pareceres', icon: MessageSquare, label: 'Pareceres' },
      { path: '/audiencias', icon: Users, label: 'Audiências Públicas' },
      { path: '/oficios', icon: Mail, label: 'Ofícios' },
    ]
  },
  {
    label: 'Sessões & Votação',
    items: [
      { path: '/sessoes', icon: Calendar, label: 'Sessões Plenárias' },
      { path: '/quorum', icon: UserCheck, label: 'Controle de Quórum' },
      { path: '/reuniao-comissao', icon: UsersRound, label: 'Reuniões de Comissão' },
      { path: '/votacao', icon: Vote, label: 'Registro de Votação' },
      { path: '/painel-eletronico', icon: Monitor, label: 'Painel Eletrônico', highlight: true },
    ]
  },
  {
    label: 'Normas & Documentos',
    items: [
      { path: '/normas', icon: ScrollText, label: 'Normas Jurídicas' },
      { path: '/documentos', icon: FolderOpen, label: 'Documentos Admin.' },
    ]
  },
  {
    label: 'Transparência',
    items: [
      { path: '/transparencia', icon: Globe, label: 'Portal Transparência' },
      { path: '/relatorios', icon: BarChart3, label: 'Relatórios' },
    ]
  },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(navGroups.map(() => true));
  const location = useLocation();

  function toggleGroup(i) {
    setExpandedGroups(eg => eg.map((v, idx) => idx === i ? !v : v));
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        "fixed md:relative z-50 flex flex-col h-full transition-all duration-300 ease-in-out",
        "bg-sidebar text-sidebar-foreground shadow-2xl border-r border-sidebar-border",
        collapsed ? "w-16" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Logo */}
        <div className={cn("flex items-center px-4 py-4 border-b border-sidebar-border flex-shrink-0", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && (
            <div>
              <div className="text-sidebar-primary font-heading font-bold text-base leading-tight">SisLegis</div>
              <div className="text-sidebar-foreground/50 text-[11px] font-body mt-0.5">Sistema Legislativo</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-1.5">
          {navGroups.map((group, gi) => (
            <div key={gi} className="mb-1">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(gi)}
                  className="flex items-center justify-between w-full px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors"
                >
                  {group.label}
                  {expandedGroups[gi] ? <ChevronDown size={10} /> : <ChevRight size={10} />}
                </button>
              )}
              {(collapsed || expandedGroups[gi]) && group.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 group text-sm",
                      active
                        ? "bg-sidebar-primary text-white shadow-md"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      item.highlight && !active && "ring-1 ring-sidebar-primary/50"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon size={16} className={cn("flex-shrink-0", item.highlight && !active && "text-sidebar-primary")} />
                    {!collapsed && <span className="truncate font-medium">{item.label}</span>}
                    {!collapsed && item.highlight && !active && (
                      <span className="ml-auto text-[9px] bg-sidebar-primary/25 text-sidebar-primary px-1.5 py-0.5 rounded-full font-bold tracking-wide">LIVE</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-1.5 py-2 border-t border-sidebar-border flex-shrink-0">
          <button
            onClick={() => base44.auth.logout()}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg w-full transition-colors text-sm",
              "text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <LogOut size={15} className="flex-shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-muted">
            <Menu size={20} />
          </button>
          <span className="font-heading font-semibold text-foreground text-sm">SisLegis</span>
          <div className="w-8" />
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}