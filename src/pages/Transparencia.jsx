import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Globe, Search, FileText, ScrollText, Users, Calendar, Inbox } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';

export default function Transparencia() {
  const [materias, setMaterias] = useState([]);
  const [normas, setNormas] = useState([]);
  const [parlamentares, setParlamentares] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [m, n, p, s] = await Promise.all([
        base44.entities.Materia.list('-created_date', 200),
        base44.entities.NormaJuridica.list('-created_date', 200),
        base44.entities.Parlamentar.filter({ ativo: true }),
        base44.entities.Sessao.list('-data', 50),
      ]);
      setMaterias(m);
      setNormas(n);
      setParlamentares(p);
      setSessoes(s);
      setLoading(false);
    }
    load();
  }, []);

  const filterItems = (items, fields) =>
    !busca ? items : items.filter(item => fields.some(f => item[f]?.toLowerCase().includes(busca.toLowerCase())));

  const matFiltradas = filterItems(materias, ['ementa', 'autor_nome', 'tipo', 'numero']);
  const normasFiltradas = filterItems(normas, ['ementa', 'numero', 'tipo']);
  const parlFiltrados = filterItems(parlamentares, ['nome', 'nome_parlamentar', 'partido_sigla']);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="text-center space-y-3 py-6">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
          <Globe size={32} className="text-primary" />
        </div>
        <h1 className="text-3xl font-heading font-bold text-foreground">Portal da Transparência</h1>
        <p className="text-muted-foreground">Consulta pública de leis, matérias, parlamentares e sessões</p>
      </div>

      <div className="relative max-w-2xl mx-auto">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar leis, matérias, vereadores..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="pl-12 h-12 text-base rounded-xl border-2"
        />
      </div>

      <Tabs defaultValue="normas">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="normas" className="gap-1.5"><ScrollText size={14} /> Leis & Normas ({normasFiltradas.length})</TabsTrigger>
          <TabsTrigger value="materias" className="gap-1.5"><FileText size={14} /> Matérias ({matFiltradas.length})</TabsTrigger>
          <TabsTrigger value="parlamentares" className="gap-1.5"><Users size={14} /> Parlamentares ({parlFiltrados.length})</TabsTrigger>
          <TabsTrigger value="sessoes" className="gap-1.5"><Calendar size={14} /> Sessões ({sessoes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="normas" className="mt-4">
          {loading ? <LoadingList /> : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="divide-y divide-border">
                {normasFiltradas.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">Nenhuma norma encontrada.</div>
                ) : normasFiltradas.map(n => (
                  <div key={n.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20">
                    <ScrollText size={16} className="text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground font-semibold">{n.tipo} {n.numero && `nº ${n.numero}/${n.ano}`}</div>
                      <div className="text-sm font-medium text-foreground line-clamp-1">{n.ementa}</div>
                      {n.data_publicacao && <div className="text-xs text-muted-foreground">Publicada: {n.data_publicacao}</div>}
                    </div>
                    <StatusBadge status={n.situacao || 'Vigente'} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="materias" className="mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {matFiltradas.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Nenhuma matéria encontrada.</div>
              ) : matFiltradas.map(m => (
                <div key={m.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20">
                  <FileText size={16} className="text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground font-semibold">{m.tipo} {m.numero && `nº ${m.numero}/${m.ano}`}</div>
                    <div className="text-sm font-medium text-foreground line-clamp-2">{m.ementa}</div>
                    {m.autor_nome && <div className="text-xs text-muted-foreground">Autor: {m.autor_nome}</div>}
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="parlamentares" className="mt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {parlFiltrados.map(p => (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center font-heading font-bold text-primary text-sm flex-shrink-0">
                  {(p.nome_parlamentar || p.nome)?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-foreground truncate">{p.nome_parlamentar || p.nome}</div>
                  <div className="text-xs text-muted-foreground">{p.partido_sigla} · {p.cargo || 'Vereador'}</div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sessoes" className="mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {sessoes.map(s => (
                <div key={s.id} className="flex items-center gap-4 px-6 py-4">
                  <Calendar size={16} className="text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{s.tipo} {s.numero && `— Sessão nº ${s.numero}`}</div>
                    <div className="text-xs text-muted-foreground">{s.data} {s.hora_inicio && `às ${s.hora_inicio}`}</div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoadingList() {
  return (
    <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
      Carregando...
    </div>
  );
}