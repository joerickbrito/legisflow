import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { FileText, Calendar, Vote, Users, ScrollText, Inbox, ArrowRight, Clock, TrendingUp, FolderOpen, Building2, BarChart3, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StatusBadge from '@/components/StatusBadge';

export default function Dashboard() {
  const [data, setData] = useState({
    materias: [], sessoes: [], parlamentares: [], normas: [],
    protocolos: [], votacaoAtiva: null, proposicoes: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [materias, sessoes, parlamentares, normas, protocolos, votacoes, proposicoes] = await Promise.all([
        base44.entities.Materia.list('-created_date', 5),
        base44.entities.Sessao.list('-data', 10),
        base44.entities.Parlamentar.list(),
        base44.entities.NormaJuridica.list(),
        base44.entities.Protocolo.list('-created_date', 5),
        base44.entities.Votacao.filter({ status: 'Em Votação' }),
        base44.entities.Proposicao.filter({ status: 'Rascunho' }),
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
        proposicoes,
        urgentes: materias.filter(m => m.regime_tramitacao && m.regime_tramitacao !== 'Normal'),
      });
      setLoading(false);
    }
    load();
  }, []);

  const cards = [
    { label: 'Matérias em Tramitação', value: data.materias?.filter(m => m.status === 'Em tramitação').length || 0, icon: FileText, color: 'text-blue-600 bg-blue-50', link: '/materias' },
    { label: 'Parlamentares Ativos', value: data.parlamentares?.length || 0, icon: Users, color: 'text-purple-600 bg-purple-50', link: '/parlamentares' },
    { label: 'Normas Vigentes', value: data.normas?.filter(n => n.situacao === 'Vigente' || !n.situacao).length || 0, icon: ScrollText, color: 'text-green-600 bg-green-50', link: '/normas' },
    { label: 'Protocolos Pendentes', value: data.protocolos?.filter(p => p.status === 'Recebido').length || 0, icon: Inbox, color: 'text-orange-600 bg-orange-50', link: '/protocolo' },
    { label: 'Proposições em Rascunho', value: data.proposicoes?.length || 0, icon: FolderOpen, color: 'text-pink-600 bg-pink-50', link: '/proposicoes' },
    { label: 'Sessões Este Mês', value: data.sessoes?.length || 0, icon: Calendar, color: 'text-indigo-600 bg-indigo-50', link: '/sessoes' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard</h1>
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Matérias recentes */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-heading font-semibold text-foreground">Matérias Recentes</h2>
            <Link to="/materias" className="text-primary text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
              Ver todas <ArrowRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {data.materias?.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Nenhuma matéria cadastrada.</div>
            ) : data.materias?.map((m) => (
              <Link key={m.id} to="/materias" className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                <FileText size={15} className="text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{m.ementa}</div>
                  <div className="text-xs text-muted-foreground">{m.tipo} · {m.autor_nome || '—'}</div>
                </div>
                <StatusBadge status={m.status} />
              </Link>
            ))}
          </div>
        </div>

        {/* Protocolos recentes */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-heading font-semibold text-foreground">Protocolos Recentes</h2>
            <Link to="/protocolo" className="text-primary text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
              Ver todos <ArrowRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {data.protocolos?.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Nenhum protocolo registrado.</div>
            ) : data.protocolos?.map((p) => (
              <Link key={p.id} to="/protocolo" className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                <Inbox size={15} className="text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{p.assunto}</div>
                  <div className="text-xs text-muted-foreground">{p.tipo_documento} · {p.interessado}</div>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}