import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Calendar, Vote, Users, Building2,
  ScrollText, Inbox, ChevronLeft, ChevronRight, Menu, X, Bell, LogOut
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/materias', icon: FileText, label: 'Matérias' },
  { path: '/sessoes', icon: Calendar, label: 'Sessões' },
  { path: '/votacao', icon: Vote, label: 'Votação', highlight: true },
  { path: '/parlamentares', icon: Users, label: 'Parlamentares' },
  { path: '/comissoes', icon: Building2, label: 'Comissões' },
  { path: '/normas', icon: ScrollText, label: 'Normas Jurídicas' },
  { path: '/protocolo', icon: Inbox, label: 'Protocolo' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:relative z-50 flex flex-col h-full transition-all duration-300 ease-in-out",
        "bg-sidebar text-sidebar-foreground shadow-2xl",
        collapsed ? "w-16" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Logo */}
        <div className={cn("flex items-center px-4 py-5 border-b border-sidebar-border", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && (
            <div>
              <div className="text-sidebar-primary font-heading font-bold text-lg leading-tight">Câmara</div>
              <div className="text-sidebar-foreground/60 text-xs font-body">Sistema Legislativo</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  active
                    ? "bg-sidebar-primary text-white shadow-lg shadow-blue-900/30"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  item.highlight && !active && "ring-1 ring-sidebar-primary/40"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} className={cn("flex-shrink-0", item.highlight && !active && "text-sidebar-primary")} />
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
                {!collapsed && item.highlight && !active && (
                  <span className="ml-auto text-[10px] bg-sidebar-primary/20 text-sidebar-primary px-1.5 py-0.5 rounded-full font-semibold">AO VIVO</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-sidebar-border">
          <button
            onClick={() => base44.auth.logout()}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors",
              "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-muted">
            <Menu size={20} />
          </button>
          <span className="font-heading font-semibold text-foreground">Sistema Legislativo</span>
          <div className="w-8" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}