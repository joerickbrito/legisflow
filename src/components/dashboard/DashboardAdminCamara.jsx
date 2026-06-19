import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sislegisEntities } from '@/lib/sislegisApi';
import { Building2, Users, FileText, ScrollText, Calendar, ArrowRight, TrendingUp, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardSuperAdmin() {
  const [stats, setStats] = useState({ camaras: [], usuarios: [], materias: [], normas: [], sessoes: [], logs: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      sislegisEntities.Camara.list('-created_date', 200),
      sislegisEntities.UsuarioSislegis.filter({}),
      sislegisEntities.Materia.list('-created_date', 50),
      sislegisEntities.NormaJuridica.list('-created_date', 20),
      sislegisEntities.Sessao.list('-data', 20),
      sislegisEntities.LogAuditoria.list('-created_date', 10),
    ]).then(([camaras, usuarios, materias, normas, sessoes, logs]) => {
      setStats({ camaras, usuarios, materias, normas, sessoes, logs });
      setLoading(false);
    });
  }, []);

  const metricCards = [
    { label: 'Câmaras Cadastradas', value: stats.camaras.length, sub: `${stats.camaras.filter(c => c.status === 'Ativa').length} ativas`, icon: Building2, color: 'bg-blue-50 text-blue-600', link: '/gerenciar-camaras' },
    { label: 'Usuários Totais', value: stats.usuarios.length, sub: `${stats.usuarios.filter(u => u.status === 'Ativo').length} ativos`, icon: Users, color: 'bg-purple-50 text-purple-600', link: '/gerenciar-usuarios' },
    { label: 'Matérias (global)', value: stats.materias.length, sub: `${stats.materias.filter(m => m.status === 'Em tramitação').length} em tramitação`, icon: FileText, color: 'bg-orange-50 text-orange-600', link: '/materias' },
    { label: 'Normas (global)', value: stats.normas.length, sub: `${stats.normas.filter(n => n.situacao === 'Vigente').length} vigentes`, icon: ScrollText, color: 'bg-green-50 text-green-600', link: '/normas' },
    { label: 'Sessões (global)', value: stats.sessoes.length, sub: `${stats.sessoes.filter(s => s.status === 'Agendada').length} agendadas`, icon: Calendar, color: 'bg-indigo-50 text-indigo-600', link: '/sessoes' },
    { label: 'Logs de Auditoria', value: stats.logs.length, sub: 'últimos 10', icon: Shield, color: 'bg-slate-100 text-slate-600', link: '/auditoria' },
  ];

  const planCount = (plano) => stats.camaras.filter(c => c.plano === plano).length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary bg-accent px-2.5 py-1 rounded-full ring-1 ring-inset ring-primary/15">
            <Shield size={11} /> Super Admin — Painel Global
          </span>
        </div>
        <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">Visão Geral da Plataforma</h1>
        <p className="text-muted-foreground text-sm mt-1 capitalize">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Métricas globais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metricCards.map(c => (
          <Link
            key={c.label}
            to={c.link}
            className="group relative bg-card border border-border rounded-xl p-4 card-elevated hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 transition-all"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ring-1 ring-inset ring-black/5 ${c.color}`}>
              <c.icon size={18} />
            </div>
            <div className="text-3xl font-bold text-foreground tabular-num leading-none">{loading ? '—' : c.value}</div>
            <div className="eyebrow mt-2 leading-tight">{c.label}</div>
            <div className="text-[11px] text-muted-foreground/80 mt-1 tabular-num">{loading ? '' : c.sub}</div>
          </Link>
        ))}
      </div>

      {/* Câmaras por plano + Status */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-heading font-semibold text-foreground">Distribuição por Plano</h2>
          </div>
          <CardContent className="pt-4 space-y-3">
            {['Básico', 'Profissional', 'Enterprise'].map(plano => (
              <div key={plano} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{plano}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: stats.camaras.length ? `${(planCount(plano) / stats.camaras.length) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-sm font-bold w-6 text-right">{planCount(plano)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Câmaras recentes */}
        <Card>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-heading font-semibold text-foreground">Câmaras Recentes</h2>
            <Link to="/gerenciar-camaras" className="text-primary text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
              Ver todas <ArrowRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {stats.camaras.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{c.nome}</p>
                  <p className="text-xs text-muted-foreground">{c.cidade || '—'}{c.estado ? ` / ${c.estado}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={c.status === 'Ativa' ? 'default' : 'secondary'} className="text-xs">{c.status}</Badge>
                  <Badge variant="outline" className="text-xs">{c.plano}</Badge>
                </div>
              </div>
            ))}
            {stats.camaras.length === 0 && !loading && (
              <p className="text-muted-foreground text-sm text-center py-6">Nenhuma câmara cadastrada.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Log de auditoria recente */}
      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-heading font-semibold text-foreground">Últimas Ações (Auditoria)</h2>
          <Link to="/auditoria" className="text-primary text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
            Ver tudo <ArrowRight size={13} />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {stats.logs.map(log => (
            <div key={log.id} className="flex items-center gap-3 px-5 py-3">
              <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full text-foreground">{log.acao}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{log.descricao || log.modulo}</p>
                <p className="text-xs text-muted-foreground">{log.usuario_nome || '—'}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {log.created_date ? format(new Date(log.created_date), 'dd/MM HH:mm') : '—'}
              </span>
            </div>
          ))}
          {stats.logs.length === 0 && !loading && (
            <p className="text-muted-foreground text-sm text-center py-6">Nenhum log registrado.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
