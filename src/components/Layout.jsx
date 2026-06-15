import { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Calendar, Vote, Users, Building2,
  ScrollText, Inbox, ChevronLeft, ChevronRight, Menu, LogOut,
  Scale, Gavel, MessageSquare, BarChart3, Globe, BookOpen,
  FolderOpen, ChevronDown, ChevronRight as ChevRight,
  Monitor, UserCheck, FileDiff, UsersRound, Mail, Shield, Settings, SlidersHorizontal,
  Landmark, Stamp, ClipboardList, DollarSign, BookMarked, ArrowLeftRight
} from 'lucide-react';
import { useTenant, ROLE_LABELS } from '@/lib/TenantContext';
import { useAuth } from '@/lib/AuthContext';
import { canShowMenuItem } from '@/lib/perfis';
import { cn } from '@/lib/utils';

const getNavGroups = (user, isInChamberContext) => {
  if (!user) return [];

  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isAdminCamaraProfile = user.role === 'ADMIN_CAMARA';
  const seesAll = isSuperAdmin || isAdminCamaraProfile;

  // Admin (Master ou Câmara) vê tudo; demais perfis são filtrados por permissão
  const filterItems = (items) => seesAll
    ? items
    : items.filter(item => canShowMenuItem(user, item.path));

  // ─── CONTEXTO 1: PAINEL MASTER (SUPER_ADMIN sem câmara ativa) ───
  if (isSuperAdmin && !isInChamberContext) {
    const groups = [
      {
        label: 'Principal',
        items: [
          { path: '/painel-master', icon: LayoutDashboard, label: 'Dashboard Global', highlight: true },
        ]
      },
      {
        label: 'Gestão',
        items: [
          { path: '/gerenciar-camaras', icon: Building2, label: 'Câmaras' },
          { path: '/gerenciar-usuarios', icon: Users, label: 'Usuários' },
          { path: '/configuracoes', icon: SlidersHorizontal, label: 'Configurações' },
        ]
      },
      {
        label: 'Segurança',
        items: [
          { path: '/auditoria', icon: ScrollText, label: 'Auditoria Global' },
        ]
      },
    ];
    return groups.filter(g => g.items.length > 0);
  }

  // ─── CONTEXTO 2: DENTRO DE UMA CÂMARA (menu completo) ───
  const groups = [
    {
      label: 'Principal',
      items: [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard da Câmara' },
      ]
    },
    {
      label: 'Estrutura',
      items: filterItems([
        { path: '/legislaturas', icon: BookOpen, label: 'Legislaturas' },
        { path: '/parlamentares', icon: Users, label: 'Parlamentares' },
        { path: '/partidos', icon: Scale, label: 'Partidos' },
        { path: '/mesa-diretora', icon: Gavel, label: 'Mesa Diretora' },
        { path: '/comissoes', icon: Building2, label: 'Comissões' },
      ]),
    },
    {
      label: 'Processo Legislativo',
      items: filterItems([
        { path: '/projetos-lei', icon: FileText, label: 'Projetos de Lei' },
        { path: '/leis', icon: Landmark, label: 'Leis' },
        { path: '/resolucoes', icon: ScrollText, label: 'Resoluções' },
        { path: '/decretos', icon: Stamp, label: 'Decretos' },
        { path: '/portarias', icon: BookMarked, label: 'Portarias' },
        { path: '/emendas-impositivas', icon: DollarSign, label: 'Emendas Impositivas' },
      ]),
    },
    {
      label: 'Sessões e Votação',
      items: filterItems([
        { path: '/sessoes', icon: Calendar, label: 'Sessões Plenárias' },
        { path: '/painel-eletronico', icon: Monitor, label: 'Painel Eletrônico', highlight: true },
        { path: '/quorum', icon: UserCheck, label: 'Controle de Presença' },
      ]),
    },
    {
      label: 'Documentos',
      items: filterItems([
        { path: '/atas-sessoes', icon: BookOpen, label: 'Atas das Sessões' },
        { path: '/pautas-sessoes', icon: ClipboardList, label: 'Pautas' },
        { path: '/audiencias', icon: Users, label: 'Audiências Públicas' },
      ]),
    },
    {
      label: 'Administração',
      items: filterItems([
        { path: '/gerenciar-usuarios', icon: Users, label: 'Usuários da Câmara' },
        { path: '/casa-legislativa', icon: Building2, label: 'Casa Legislativa' },
        { path: '/relatorios', icon: BarChart3, label: 'Relatórios' },
        { path: '/auditoria', icon: ScrollText, label: 'Auditoria da Câmara' },
      ]),
    },
    {
      label: 'Outros',
      items: filterItems([
        { path: '/transparencia', icon: Globe, label: 'Portal de Transparência' },
      ]),
    },
  ];

  return groups.filter(g => g.items.length > 0);
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { isSuperAdmin, isAdminCamara, userRole, camara, activeCamara, exitCamara, isInChamberContext } = useTenant();
  const { user, logout } = useAuth();

  const navGroups = getNavGroups(user, isInChamberContext);
  const [expandedGroups, setExpandedGroups] = useState(navGroups.map(() => true));

  // SUPER_ADMIN sem câmara ativa → redirecionar da home para painel master
  if (isSuperAdmin && !isInChamberContext && location.pathname === '/') {
    return <Navigate to="/painel-master" replace />;
  }

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
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user.nome || user.email || user.username}</p>
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
            onClick={() => logout(true)}
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
        {/* Barra "Administrando" — visível quando SUPER_ADMIN está dentro de uma câmara */}
        {isSuperAdmin && activeCamara && (
          <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-700 dark:text-amber-400 flex-shrink-0 z-10">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Shield size={13} className="flex-shrink-0" />
              <span>Administrando: <strong>{activeCamara.nome}</strong></span>
              {activeCamara.municipio && <span className="text-amber-600/70 dark:text-amber-500/60">— {activeCamara.municipio}{activeCamara.estado ? `, ${activeCamara.estado}` : ''}</span>}
            </div>
            <button
              onClick={() => { exitCamara(); window.location.href = '/painel-master'; }}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
            >
              <ArrowLeftRight size={12} /> Trocar Câmara
            </button>
          </div>
        )}
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