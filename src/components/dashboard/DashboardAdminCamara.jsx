import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { FileText, Calendar, Users, ScrollText, Inbox, AlertCircle, ArrowRight, Clock, Vote, TrendingUp, FolderOpen, Gavel, Hourglass } from 'lucide-react';
import { Card } from '@/components/ui/card';
import StatusBadge from '@/components/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardAdminCamara() {
  const { tenantId, camara, withTenant } = useTenant();
  const [data, setData] = useState({ materias: [], sessoes: [], parlamentares: [], normas: [], protocolos: [], votacaoAtiva: null, aguardandoVotacao: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const filter = tenantId ? { tenant_id: tenantId } : {};
      const [materias, sessoes, parlamentares, normas, protocolos, votacoes, aguardandoVot] = await Promise.all([
        base44.entities.Materia.filter(filter, '-created_date', 50),
        base44.entities.Sessao.filter(filter, '-data', 20),
        base44.entities.Parlamentar.filter(filter),
        base44.entities.NormaJuridica.filter(filter),
        base44.entities.Protocolo.filter(filter, '-created_date', 8),
        base44.entities.Votacao.filter({ ...filter, status: 'Em Votação' }),
        base44.entities.Materia.filter({ ...filter, status: 'Aguardando Votação' }, '-created_date', 10),
      ]);
      const hoje = format(new Date(), 'yyyy-MM-dd');
      setData({
        materias,
        sessoes,
        sessaoHoje: sessoes.find(s => s.data === hoje && s.status !== 'Cancelada') || null,
        parlamentares: parlamentares.filter(p => p.ativo !== false),
        normas,
        protocolos,
        votacaoAtiva: votacoes[0] || null,
        urgentes: materias.filter(m => m.regime_tramitacao && m.regime_tramitacao !== 'Normal'),
        aguardandoVotacao: aguardandoVot,
      });
      setLoading(false);
    }
    load();
  }, [tenantId]);

  // Chart data: matérias por status
  const chartData = [
    { name: 'Em Tramitação', value: data.materias?.filter(m => m.status === 'Em tramitação').length || 0, color: '#3b82f6' },
    { name: 'Aguard. Votação', value: data.materias?.filter(m => m.status === 'Aguardando Votação').length || 0, color: '#f59e0b' },
    { name: 'Aprovadas', value: data.materias?.filter(m => m.status === 'Aprovada').length || 0, color: '#22c55e' },
    { name: 'Rejeitadas', value: data.materias?.filter(m => m.status === 'Rejeitada').length || 0, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Próximas sessões
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const proximasSessoes = data.sessoes?.filter(s => s.data >= hoje && s.status !== 'Cancelada' && s.status !== 'Encerrada').slice(0, 3) || [];

  const cards = [
    { label: 'Matérias em Tramitação', value: data.materias?.filter(m => m.status === 'Em tramitação').length || 0, icon: FileText, color: 'text-blue-600 bg-blue-50', link: '/materias' },
    { label: 'Parlamentares Ativos', value: data.parlamentares?.length || 0, icon: Users, color: 'text-purple-600 bg-purple-50', link: '/parlamentares' },
    { label: 'Normas Vigentes', value: data.normas?.filter(n => n.situacao === 'Vigente' || !n.situacao).length || 0, icon: ScrollText, color: 'text-green-600 bg-green-50', link: '/normas' },
    { label: 'Protocolos Pendentes', value: data.protocolos?.filter(p => p.status === 'Recebido').length || 0, icon: Inbox, color: 'text-orange-600 bg-orange-50', link: '/protocolo' },
    { label: 'Sessões Agendadas', value: data.sessoes?.filter(s => s.status === 'Agendada').length || 0, icon: Calendar, color: 'text-indigo-600 bg-indigo-50', link: '/sessoes' },
    { label: 'Urgências', value: data.urgentes?.length || 0, icon: AlertCircle, color: 'text-red-600 bg-red-50', link: '/materias' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">
          {camara?.nome || 'Dashboard'}
        </h1>
        <p className="text-muted-foreground mt-1 font-body text-sm capitalize">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Votação ativa */}
      {data.votacaoAtiva && (
        <Link to="/votacao">
          <div className="bg-primary text-primary-foreground rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-primary/25">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Vote size={24} />
              </div>
              <div>
                <div className="text-xs font-bold opacity-70 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse inline-block" /> Votação em Andamento
                </div>
                <div className="font-semibold text-lg leading-tight mt-1 line-clamp-1">{data.votacaoAtiva.materia_ementa}</div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl font-semibold text-sm flex-shrink-0">
              Acessar <ArrowRight size={15} />
            </div>
          </div>
        </Link>
      )}

      {/* Alertas urgentes */}
      {data.urgentes?.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={18} className="text-orange-600 flex-shrink-0" />
          <span className="text-sm text-orange-700 font-medium">
            {data.urgentes.length} matéria(s) em regime de urgência aguardando deliberação
          </span>
          <Link to="/materias" className="ml-auto text-orange-600 text-sm font-semibold hover:underline flex items-center gap-1">
            Ver <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Sessão hoje */}
      {data.sessaoHoje && (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-11 h-11 bg-accent rounded-xl flex items-center justify-center">
            <Calendar size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Sessão de Hoje</div>
            <div className="font-semibold text-foreground mt-0.5">{data.sessaoHoje.tipo} — Sessão nº {data.sessaoHoje.numero}</div>
            {data.sessaoHoje.hora_inicio && (
              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock size={12} /> {data.sessaoHoje.hora_inicio}
              </div>
            )}
          </div>
          <StatusBadge status={data.sessaoHoje.status} />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card) => (
          <Link key={card.label} to={card.link} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all group">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon size={18} />
            </div>
            <div className="text-2xl font-bold text-foreground font-heading">{loading ? '—' : card.value}</div>
            <div className="text-xs text-muted-foreground mt-1 leading-tight">{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Matérias recentes */}
        <Card className="overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-heading font-semibold text-foreground">Matérias Recentes</h2>
            <Link to="/materias" className="text-primary text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
              Ver todas <ArrowRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {data.materias?.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Nenhuma matéria cadastrada.</div>
            ) : data.materias?.slice(0, 6).map((m) => (
              <Link key={m.id} to="/materias" className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                <FileText size={15} className="text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{m.ementa}</div>
                  <div className="text-xs text-muted-foreground">{m.tipo} · {m.autor_nome || '—'}</div>
                </div>
                <StatusBadge status={m.status} />
              </Link>
            ))}
          </div>
        </Card>

        {/* Painel lateral: gráfico + próximas sessões */}
        <div className="space-y-4">
          {/* Gráfico matérias por status */}
          {chartData.length > 0 && (
            <Card className="p-4">
              <h3 className="font-heading font-semibold text-sm text-foreground mb-3">Matérias por Status</h3>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Próximas sessões */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-heading font-semibold text-sm text-foreground">Próximas Sessões</h3>
              <Link to="/sessoes" className="text-primary text-xs font-medium flex items-center gap-1">Ver <ArrowRight size={11} /></Link>
            </div>
            <div className="divide-y divide-border">
              {proximasSessoes.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-xs">Nenhuma sessão agendada.</div>
              ) : proximasSessoes.map(s => (
                <div key={s.id} className="px-4 py-3">
                  <div className="text-xs font-semibold text-foreground">{s.tipo}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Calendar size={10} />
                    {format(new Date(s.data + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                    {s.hora_inicio && <span>· {s.hora_inicio}</span>}
                  </div>
                  {s.pauta?.length > 0 && <div className="text-[10px] text-muted-foreground mt-0.5">{s.pauta.length} matéria(s) em pauta</div>}
                </div>
              ))}
            </div>
          </Card>

              {/* Protocolos recentes */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-heading font-semibold text-sm text-foreground">Protocolos Recentes</h3>
              <Link to="/protocolo" className="text-primary text-xs font-medium flex items-center gap-1">Ver <ArrowRight size={11} /></Link>
            </div>
            <div className="divide-y divide-border">
              {data.protocolos?.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-xs">Nenhum protocolo.</div>
              ) : data.protocolos?.map((p) => (
                <Link key={p.id} to="/protocolo" className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                  <Inbox size={13} className="text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{p.assunto}</div>
                    <div className="text-[10px] text-muted-foreground">{p.tipo_documento} · {p.interessado}</div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Projetos aguardando votação */}
      {(data.aguardandoVotacao?.length > 0) && (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hourglass size={16} className="text-amber-500" />
              <h2 className="font-heading font-semibold text-foreground">Projetos Aguardando Votação</h2>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{data.aguardandoVotacao.length}</span>
            </div>
            <Link to="/materias" className="text-primary text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
              Ver todas <ArrowRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {data.aguardandoVotacao.map((m) => (
              <Link key={m.id} to="/materias" className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Gavel size={14} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{m.ementa}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.tipo}{m.numero ? ` nº ${m.numero}` : ''}{m.autor_nome ? ` · ${m.autor_nome}` : ''}
                    {m.regime_tramitacao && m.regime_tramitacao !== 'Normal' && (
                      <span className="ml-1.5 bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">{m.regime_tramitacao}</span>
                    )}
                  </div>
                </div>
                <Link to="/painel-eletronico">
                  <div className="flex items-center gap-1 text-xs text-primary font-semibold bg-accent px-2.5 py-1 rounded-lg hover:bg-primary hover:text-white transition-colors flex-shrink-0">
                    <Vote size={12} /> Votar
                  </div>
                </Link>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}