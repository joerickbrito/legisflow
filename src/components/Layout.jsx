import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Calendar, Vote, Users, Building2,
  ScrollText, Inbox, ChevronLeft, ChevronRight, Menu, LogOut,
  Scale, Gavel, MessageSquare, BarChart3, Globe, BookOpen,
  FolderOpen, ChevronDown, ChevronRight as ChevRight,
  Monitor, UserCheck, FileDiff, UsersRound, Mail, Shield, Settings
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useTenant, ROLE_LABELS } from '@/lib/TenantContext';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

const getNavGroups = (isSuperAdmin, isAdminCamara, userRole) => {
  const groups = [
    {
      label: 'Principal',
      items: [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
      ]
    },
  ];

  // Super Admin exclusive
  if (isSuperAdmin) {
    groups.push({
      label: 'Super Admin',
      items: [
        { path: '/gerenciar-camaras', icon: Building2, label: 'Câmaras', highlight: true },
        { path: '/gerenciar-usuarios', icon: Shield, label: 'Usuários' },
        { path: '/auditoria', icon: ScrollText, label: 'Auditoria' },
      ]
    });
  }

  // Admin Câmara
  if (isAdminCamara && !isSuperAdmin) {
    groups.push({
      label: 'Administração',
      items: [
        { path: '/gerenciar-usuarios', icon: Users, label: 'Usuários' },
        { path: '/casa-legislativa', icon: Building2, label: 'Casa Legislativa' },
        { path: '/auditoria', icon: ScrollText, label: 'Auditoria' },
      ]
    });
  }

  // Estrutura (todos exceto consulta pública)
  if (userRole !== 'CONSULTA_PUBLICA') {
    groups.push({
      label: 'Estrutura',
      items: [
        { path: '/legislaturas', icon: BookOpen, label: 'Legislaturas' },
        { path: '/parlamentares', icon: Users, label: 'Parlamentares' },
        { path: '/partidos', icon: Scale, label: 'Partidos' },
        { path: '/mesa-diretora', icon: Gavel, label: 'Mesa Diretora' },
        { path: '/comissoes', icon: Building2, label: 'Comissões' },
      ]
    });

    groups.push({
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
    });

    groups.push({
      label: 'Sessões & Votação',
      items: [
        { path: '/sessoes', icon: Calendar, label: 'Sessões Plenárias' },
        { path: '/quorum', icon: UserCheck, label: 'Controle de Quórum' },
        { path: '/reuniao-comissao', icon: UsersRound, label: 'Reuniões de Comissão' },
        { path: '/votacao', icon: Vote, label: 'Registro de Votação' },
        { path: '/painel-eletronico', icon: Monitor, label: 'Painel Eletrônico', highlight: true },
      ]
    });

    groups.push({
      label: 'Normas & Documentos',
      items: [
        { path: '/normas', icon: ScrollText, label: 'Normas Jurídicas' },
        { path: '/documentos', icon: FolderOpen, label: 'Documentos Admin.' },
      ]
    });
  }

  groups.push({
    label: 'Transparência',
    items: [
      { path: '/transparencia', icon: Globe, label: 'Portal Transparência' },
      { path: '/relatorios', icon: BarChart3, label: 'Relatórios' },
    ]
  });

  return groups;
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { isSuperAdmin, isAdminCamara, userRole, camara, ROLE_LABELS: RL } = useTenant();
  const { user } = useAuth();

  const navGroups = getNavGroups(isSuperAdmin, isAdminCamara, userRole);
  const [expandedGroups, setExpandedGroups] = useState(navGroups.map(() => true));

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
            <div className="min-w-0">
              <div className="text-sidebar-primary font-heading font-bold text-base leading-tight truncate">
                {camara?.sigla || camara?.nome || 'SisLegis'}
              </div>
              <div className="text-sidebar-foreground/50 text-[10px] font-body mt-0.5 truncate">
                {isSuperAdmin ? 'Super Admin' : (camara?.nome || 'Sistema Legislativo')}
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* User info */}
        {!collapsed && user && (
          <div className="px-4 py-2.5 border-b border-sidebar-border/50 bg-sidebar-accent/30">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user.full_name || user.email}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{ROLE_LABELS[userRole] || userRole}</p>
          </div>
        )}

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
          <span className="font-heading font-semibold text-foreground text-sm">{camara?.sigla || 'SisLegis'}</span>
          <div className="w-8" />
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}