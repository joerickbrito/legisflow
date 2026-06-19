import { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Calendar, Users, Building2,
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
        { path: '/proposicoes', icon: FolderOpen, label: 'Proposições' },
        { path: '/materias', icon: ScrollText, label: 'Matérias Legislativas' },
        { path: '/tramitacoes', icon: ArrowLeftRight, label: 'Tramitações' },
        { path: '/pareceres', icon: MessageSquare, label: 'Pareceres' },
        { path: '/normas', icon: Scale, label: 'Normas Jurídicas' },
        { path: '/emendas', icon: FileDiff, label: 'Emendas' },
      ]),
    },
    {
      label: 'Sessões e Votação',
      items: filterItems([
        { path: '/sessoes', icon: Calendar, label: 'Sessões Plenárias' },
        { path: '/painel-eletronico', icon: Monitor, label: 'Painel Eletrônico', highlight: true },
        { path: '/quorum', icon: UserCheck, label: 'Controle de Presença' },
        { path: '/reuniao-comissao', icon: UsersRound, label: 'Reuniões de Comissão' },
      ]),
    },
    {
      label: 'Documentos',
      items: filterItems([
        { path: '/atas-sessoes', icon: BookOpen, label: 'Atas das Sessões' },
        { path: '/pautas-sessoes', icon: ClipboardList, label: 'Pautas' },
        { path: '/audiencias', icon: Users, label: 'Audiências Públicas' },
        { path: '/protocolo', icon: Inbox, label: 'Protocolo' },
        { path: '/documentos', icon: FolderOpen, label: 'Documentos Administrativos' },
        { path: '/oficios', icon: Mail, label: 'Ofícios' },
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
        "sidebar-surface text-sidebar-foreground shadow-2xl border-r border-sidebar-border",
        collapsed ? "w-16" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Logo */}
        <div className={cn(
          "flex items-center px-3 py-4 border-b border-sidebar-border/70 flex-shrink-0",
          collapsed ? "justify-center" : "justify-between gap-2"
        )}>
          {!collapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              {(camara?.brasao_url || camara?.logotipo_url) ? (
                <img
                  src={camara.brasao_url || camara.logotipo_url}
                  alt={camara?.nome || 'Brasão'}
                  className="w-9 h-9 rounded-xl object-contain bg-white ring-1 ring-inset ring-sidebar-primary/20 flex-shrink-0 p-0.5"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-sidebar-primary/15 ring-1 ring-inset ring-sidebar-primary/30 flex items-center justify-center flex-shrink-0">
                  <Scale size={18} className="text-sidebar-primary" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sidebar-foreground font-heading font-bold text-sm leading-tight line-clamp-2">
                  {isInChamberContext ? (camara?.nome || camara?.sigla || 'SisLegis') : 'SisLegis'}
                </div>
                <div className="text-sidebar-foreground/45 text-[10px] font-body mt-0.5 truncate uppercase tracking-wider">
                  {isInChamberContext ? 'Sistema Legislativo' : 'Super Admin'}
                </div>
              </div>
            </div>
          ) : (
            (camara?.brasao_url || camara?.logotipo_url) ? (
              <img
                src={camara.brasao_url || camara.logotipo_url}
                alt={camara?.nome || 'Brasão'}
                className="w-9 h-9 rounded-xl object-contain bg-white ring-1 ring-inset ring-sidebar-primary/20 p-0.5"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-sidebar-primary/15 ring-1 ring-inset ring-sidebar-primary/30 flex items-center justify-center">
                <Scale size={18} className="text-sidebar-primary" />
              </div>
            )
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground flex-shrink-0"
            >
              <ChevronLeft size={14} />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="hidden md:flex mx-auto mt-1 p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground"
            title="Expandir"
          >
            <ChevronRight size={14} />
          </button>
        )}

        {/* User info */}
        {!collapsed && user && (
          <div className="mx-3 my-3 px-3 py-2.5 rounded-xl bg-sidebar-accent/40 ring-1 ring-inset ring-sidebar-border flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-sidebar-primary/20 ring-1 ring-inset ring-sidebar-primary/30 flex items-center justify-center flex-shrink-0 text-sidebar-primary font-heading font-bold text-xs uppercase">
              {(user.nome || user.email || user.username || '?').trim().split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">{user.nome || user.email || user.username}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate mt-0.5">{ROLE_LABELS[userRole] || userRole}</p>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
          {navGroups.map((group, gi) => (
            <div key={gi} className="mb-2">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(gi)}
                  className="flex items-center justify-between w-full px-2 py-1.5 mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-px w-3 bg-sidebar-foreground/20" />
                    {group.label}
                  </span>
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
                      "relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 group text-sm",
                      active
                        ? "bg-sidebar-primary/15 text-white font-semibold shadow-sm border-l-2 border-sidebar-primary pl-[8px]"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground border-l-2 border-transparent pl-[8px]",
                      item.highlight && !active && "ring-1 ring-inset ring-sidebar-primary/40"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon
                      size={16}
                      className={cn(
                        "flex-shrink-0",
                        active ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground",
                        item.highlight && !active && "text-sidebar-primary"
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.highlight && !active && (
                      <span className="ml-auto text-[9px] bg-sidebar-primary/25 text-sidebar-primary px-1.5 py-0.5 rounded-full font-bold tracking-wide">LIVE</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-2 py-2 border-t border-sidebar-border/70 flex-shrink-0">
          <button
            onClick={() => logout(true)}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg w-full transition-colors text-sm",
              "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <LogOut size={15} className="flex-shrink-0" />
            {!collapsed && <span className="font-medium">Sair</span>}
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
          <span className="font-heading font-semibold text-foreground text-sm truncate max-w-[220px]">{(isInChamberContext && (camara?.sigla || camara?.nome)) || 'SisLegis'}</span>
          <div className="w-8" />
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
