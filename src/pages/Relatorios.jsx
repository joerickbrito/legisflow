import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart3, TrendingUp, Users, FileText, Vote } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import PageHeader from '@/components/PageHeader';

const COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'];

export default function Relatorios() {
  const [data, setData] = useState({ materias: [], parlamentares: [], votacoes: [], sessoes: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [m, p, v, s] = await Promise.all([
        base44.entities.Materia.list('-created_date', 500),
        base44.entities.Parlamentar.filter({ ativo: true }),
        base44.entities.Votacao.list('-created_date', 200),
        base44.entities.Sessao.list('-data', 100),
      ]);
      setData({ materias: m, parlamentares: p, votacoes: v, sessoes: s });
      setLoading(false);
    }
    load();
  }, []);

  // Matérias por tipo
  const porTipo = data.materias.reduce((acc, m) => {
    acc[m.tipo] = (acc[m.tipo] || 0) + 1;
    return acc;
  }, {});
  const tiposData = Object.entries(porTipo).map(([name, value]) => ({ name: name.replace('Projeto de ', 'PL '), value })).sort((a, b) => b.value - a.value);

  // Matérias por status
  const porStatus = data.materias.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(porStatus).map(([name, value]) => ({ name, value }));

  // Produção por parlamentar
  const porAutor = data.materias.reduce((acc, m) => {
    if (m.autor_nome) acc[m.autor_nome] = (acc[m.autor_nome] || 0) + 1;
    return acc;
  }, {});
  const autorData = Object.entries(porAutor).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name: name.split(' ').slice(0, 2).join(' '), value }));

  // Votações aprovadas vs rejeitadas
  const aprovadas = data.votacoes.filter(v => v.resultado === 'Aprovada').length;
  const rejeitadas = data.votacoes.filter(v => v.resultado === 'Rejeitada').length;

  const summaryCards = [
    { label: 'Total de Matérias', value: data.materias.length, icon: FileText, color: 'text-blue-600 bg-blue-50' },
    { label: 'Aprovadas', value: data.materias.filter(m => m.status === 'Aprovada').length, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
    { label: 'Votações Realizadas', value: data.votacoes.filter(v => v.status === 'Encerrada').length, icon: Vote, color: 'text-purple-600 bg-purple-50' },
    { label: 'Sessões Realizadas', value: data.sessoes.filter(s => s.status === 'Encerrada').length, icon: Users, color: 'text-orange-600 bg-orange-50' },
  ];

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando relatórios...</div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader icon={BarChart3} title="Relatórios & Estatísticas" subtitle="Indicadores de produção legislativa" />

      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${c.color}`}>
              <c.icon size={18} />
            </div>
            <div className="text-2xl font-heading font-bold text-foreground">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Matérias por tipo */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Matérias por Tipo</h3>
          {tiposData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados disponíveis</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tiposData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Quantidade" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status das matérias */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Status das Matérias</h3>
          {statusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados disponíveis</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Produção por parlamentar */}
        <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
          <h3 className="font-heading font-semibold text-foreground mb-4">Ranking de Produção Legislativa</h3>
          {autorData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Cadastre matérias com autores para ver o ranking</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={autorData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="value" name="Matérias" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Votações */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-heading font-semibold text-foreground mb-4">Resultados das Votações</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-heading font-bold text-green-600">{aprovadas}</div>
            <div className="text-sm text-muted-foreground mt-1">Aprovadas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-heading font-bold text-red-600">{rejeitadas}</div>
            <div className="text-sm text-muted-foreground mt-1">Rejeitadas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-heading font-bold text-foreground">{data.votacoes.length}</div>
            <div className="text-sm text-muted-foreground mt-1">Total de Votações</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-heading font-bold text-primary">
              {data.votacoes.length > 0 ? Math.round((aprovadas / data.votacoes.length) * 100) : 0}%
            </div>
            <div className="text-sm text-muted-foreground mt-1">Taxa de Aprovação</div>
          </div>
        </div>
      </div>
    </div>
  );
}