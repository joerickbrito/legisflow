import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { FileText, Calendar, Vote, Users, ScrollText, Inbox, ArrowRight, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [stats, setStats] = useState({ materias: 0, sessoes: 0, parlamentares: 0, normas: 0, protocolos: 0 });
  const [sessaoHoje, setSessaoHoje] = useState(null);
  const [materiasRecentes, setMateriasRecentes] = useState([]);
  const [votacaoAtiva, setVotacaoAtiva] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [materias, sessoes, parlamentares, normas, protocolos, votacoes] = await Promise.all([
        base44.entities.Materia.list('-created_date', 5),
        base44.entities.Sessao.list('-data', 10),
        base44.entities.Parlamentar.list(),
        base44.entities.NormaJuridica.list(),
        base44.entities.Protocolo.list(),
        base44.entities.Votacao.filter({ status: 'Em Votação' }),
      ]);
      const hoje = format(new Date(), 'yyyy-MM-dd');
      setSessaoHoje(sessoes.find(s => s.data === hoje && s.status !== 'Cancelada') || null);
      setMateriasRecentes(materias);
      setVotacaoAtiva(votacoes[0] || null);
      setStats({
        materias: materias.length,
        sessoes: sessoes.filter(s => s.status === 'Em Andamento').length,
        parlamentares: parlamentares.filter(p => p.ativo !== false).length,
        normas: normas.length,
        protocolos: protocolos.filter(p => p.status === 'Recebido').length,
      });
      setLoading(false);
    }
    load();
  }, []);

  const statCards = [
    { label: 'Matérias em Tramitação', value: stats.materias, icon: FileText, color: 'bg-blue-50 text-blue-600', link: '/materias' },
    { label: 'Parlamentares Ativos', value: stats.parlamentares, icon: Users, color: 'bg-purple-50 text-purple-600', link: '/parlamentares' },
    { label: 'Normas Publicadas', value: stats.normas, icon: ScrollText, color: 'bg-green-50 text-green-600', link: '/normas' },
    { label: 'Protocolos Pendentes', value: stats.protocolos, icon: Inbox, color: 'bg-orange-50 text-orange-600', link: '/protocolo' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 font-body">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Votação ativa alert */}
      {votacaoAtiva && (
        <Link to="/votacao" className="block">
          <div className="bg-primary text-primary-foreground rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-primary/20 animate-pulse-once">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Vote size={24} />
              </div>
              <div>
                <div className="text-xs font-semibold opacity-80 uppercase tracking-wider">Votação em Andamento</div>
                <div className="font-semibold text-lg leading-tight mt-0.5 line-clamp-1">{votacaoAtiva.materia_ementa}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl font-semibold text-sm">
              Votar Agora <ArrowRight size={16} />
            </div>
          </div>
        </Link>
      )}

      {/* Sessão de hoje */}
      {sessaoHoje && (
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
            <Calendar size={22} className="text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Sessão de Hoje</div>
            <div className="font-semibold text-foreground mt-0.5">
              {sessaoHoje.tipo} — Sessão nº {sessaoHoje.numero}
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock size={13} /> {sessaoHoje.hora_inicio || 'Horário a confirmar'}
            </div>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${sessaoHoje.status === 'Em Andamento' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {sessaoHoje.status}
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link key={card.label} to={card.link} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon size={20} />
            </div>
            <div className="text-2xl font-bold text-foreground font-heading">{loading ? '—' : card.value}</div>
            <div className="text-xs text-muted-foreground mt-1 font-body">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* Matérias recentes */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-heading font-semibold text-foreground">Matérias Recentes</h2>
          <Link to="/materias" className="text-primary text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
            Ver todas <ArrowRight size={14} />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {materiasRecentes.length === 0 ? (
            <div className="px-6 py-8 text-center text-muted-foreground text-sm">Nenhuma matéria cadastrada ainda.</div>
          ) : (
            materiasRecentes.map((m) => (
              <Link key={m.id} to="/materias" className="flex items-center gap-4 px-6 py-4 hover:bg-muted/40 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{m.ementa}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{m.tipo} · {m.autor_nome || 'Sem autor'}</div>
                </div>
                <StatusBadge status={m.status} />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    'Em tramitação': 'bg-blue-100 text-blue-700',
    'Aprovada': 'bg-green-100 text-green-700',
    'Rejeitada': 'bg-red-100 text-red-700',
    'Arquivada': 'bg-gray-100 text-gray-600',
    'Retirada': 'bg-yellow-100 text-yellow-700',
    'Transformada em Norma': 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${map[status] || 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}