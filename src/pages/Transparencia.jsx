import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Globe, Search, FileText, ScrollText, Users, Calendar,
  Download, Filter, ChevronDown, Building2, BookOpen, ExternalLink
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import StatusBadge from '@/components/StatusBadge';
import { useTenant } from '@/lib/TenantContext';

// Usado tanto como página interna (autenticado) quanto como portal público (sem auth)
export default function Transparencia() {
  const { tenantId, camara } = useTenant();
  const [data, setData] = useState({ materias: [], normas: [], parlamentares: [], sessoes: [], emendas: [] });
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroAno, setFiltroAno] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const anos = ['todos', ...Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i))];

  useEffect(() => {
    const filter = tenantId ? { tenant_id: tenantId } : {};
    Promise.all([
      base44.entities.Materia.filter(filter, '-created_date', 500),
      base44.entities.NormaJuridica.filter(filter, '-data_publicacao', 500),
      base44.entities.Parlamentar.filter({ ...filter, ativo: true }, 'nome', 100),
      base44.entities.Sessao.filter(filter, '-data', 100),
    ]).then(([materias, normas, parlamentares, sessoes]) => {
      setData({ materias, normas, parlamentares, sessoes });
      setLoading(false);
    });
  }, [tenantId]);

  function applyFilters(items, searchFields, tipoField, statusField, anoField) {
    return items.filter(item => {
      const matchBusca = !busca || searchFields.some(f => item[f]?.toLowerCase().includes(busca.toLowerCase()));
      const matchAno = filtroAno === 'todos' || String(item[anoField] || item.ano || '').includes(filtroAno) || (item.data_publicacao || item.data || '').startsWith(filtroAno);
      const matchTipo = filtroTipo === 'todos' || item[tipoField] === filtroTipo;
      const matchStatus = filtroStatus === 'todos' || item[statusField] === filtroStatus;
      return matchBusca && matchAno && matchTipo && matchStatus;
    });
  }

  const matFiltradas = applyFilters(data.materias, ['ementa', 'autor_nome', 'tipo', 'numero'], 'tipo', 'status', 'ano');
  const normasFiltradas = applyFilters(data.normas, ['ementa', 'numero', 'tipo'], 'tipo', 'situacao', 'ano');
  const parlFiltrados = !busca ? data.parlamentares : data.parlamentares.filter(p =>
    p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    p.nome_parlamentar?.toLowerCase().includes(busca.toLowerCase()) ||
    p.partido_sigla?.toLowerCase().includes(busca.toLowerCase())
  );
  const sessoesFiltradas = applyFilters(data.sessoes, ['tipo', 'numero'], 'tipo', 'status', 'data');

  const tiposMateria = [...new Set(data.materias.map(m => m.tipo).filter(Boolean))];
  const tiposNorma = [...new Set(data.normas.map(n => n.tipo).filter(Boolean))];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-primary text-primary-foreground py-10 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {camara?.brasao_url && (
            <img src={camara.brasao_url} alt="Brasão" className="h-16 w-16 object-contain mx-auto mb-4 rounded-xl" />
          )}
          <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">Portal da Transparência</h1>
          <p className="text-primary-foreground/70 text-base mb-2">
            {camara?.nome || 'Câmara Municipal'} — Consulta pública de atos legislativos
          </p>
          {camara?.municipio && (
            <p className="text-primary-foreground/50 text-sm">{camara.municipio}{camara.estado ? `, ${camara.estado}` : ''}</p>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Barra de busca e filtros */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar leis, matérias, vereadores, atas..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <Select value={filtroAno} onValueChange={setFiltroAno}>
              <SelectTrigger className="w-32 h-10"><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>
                {anos.map(a => <SelectItem key={a} value={a}>{a === 'todos' ? 'Todos os anos' : a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-40 h-10"><SelectValue placeholder="Situação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas situações</SelectItem>
                <SelectItem value="Vigente">Vigente</SelectItem>
                <SelectItem value="Em tramitação">Em tramitação</SelectItem>
                <SelectItem value="Aprovada">Aprovada</SelectItem>
                <SelectItem value="Rejeitada">Rejeitada</SelectItem>
                <SelectItem value="Revogada">Revogada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Abas */}
        <Tabs defaultValue="normas">
          <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap gap-1 bg-muted p-1 rounded-xl">
            <TabsTrigger value="normas" className="gap-1.5 rounded-lg"><ScrollText size={14} /> Leis & Normas <span className="ml-1 bg-primary/10 text-primary text-[10px] px-1.5 rounded-full">{normasFiltradas.length}</span></TabsTrigger>
            <TabsTrigger value="materias" className="gap-1.5 rounded-lg"><FileText size={14} /> Matérias <span className="ml-1 bg-primary/10 text-primary text-[10px] px-1.5 rounded-full">{matFiltradas.length}</span></TabsTrigger>
            <TabsTrigger value="parlamentares" className="gap-1.5 rounded-lg"><Users size={14} /> Parlamentares <span className="ml-1 bg-primary/10 text-primary text-[10px] px-1.5 rounded-full">{parlFiltrados.length}</span></TabsTrigger>
            <TabsTrigger value="sessoes" className="gap-1.5 rounded-lg"><Calendar size={14} /> Sessões <span className="ml-1 bg-primary/10 text-primary text-[10px] px-1.5 rounded-full">{sessoesFiltradas.length}</span></TabsTrigger>
          </TabsList>

          {/* NORMAS */}
          <TabsContent value="normas" className="mt-4">
            <div className="flex gap-2 mb-3 flex-wrap">
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Tipo de norma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {tiposNorma.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {loading ? <LoadingState /> : normasFiltradas.length === 0 ? <EmptyState label="normas" /> : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="divide-y divide-border">
                  {normasFiltradas.map(n => (
                    <div key={n.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                        <ScrollText size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground font-semibold">
                          {n.tipo}{n.numero ? ` nº ${n.numero}` : ''}{n.ano ? `/${n.ano}` : ''}
                        </div>
                        <div className="text-sm font-medium text-foreground leading-snug mt-0.5">{n.ementa}</div>
                        {n.data_publicacao && <div className="text-xs text-muted-foreground mt-0.5">Publicada em {n.data_publicacao}</div>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={n.situacao || 'Vigente'} />
                        {n.arquivo_url && (
                          <a href={n.arquivo_url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Baixar PDF">
                            <Download size={14} className="text-muted-foreground" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* MATÉRIAS */}
          <TabsContent value="materias" className="mt-4">
            <div className="flex gap-2 mb-3 flex-wrap">
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="Tipo de matéria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {tiposMateria.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {loading ? <LoadingState /> : matFiltradas.length === 0 ? <EmptyState label="matérias" /> : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="divide-y divide-border">
                  {matFiltradas.map(m => (
                    <div key={m.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                        <FileText size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground font-semibold">
                          {m.tipo}{m.numero ? ` nº ${m.numero}` : ''}{m.ano ? `/${m.ano}` : ''}{m.autor_nome ? ` · ${m.autor_nome}` : ''}
                        </div>
                        <div className="text-sm font-medium text-foreground leading-snug mt-0.5 line-clamp-2">{m.ementa}</div>
                        {m.data_apresentacao && <div className="text-xs text-muted-foreground mt-0.5">Apresentada em {m.data_apresentacao}</div>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={m.status} />
                        {m.arquivo_url && (
                          <a href={m.arquivo_url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Baixar PDF">
                            <Download size={14} className="text-muted-foreground" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* PARLAMENTARES */}
          <TabsContent value="parlamentares" className="mt-4">
            {loading ? <LoadingState /> : parlFiltrados.length === 0 ? <EmptyState label="parlamentares" /> : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {parlFiltrados.map(p => (
                  <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                    {p.foto_url ? (
                      <img src={p.foto_url} alt={p.nome} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center font-heading font-bold text-primary text-lg flex-shrink-0">
                        {(p.nome_parlamentar || p.nome)?.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {p.nome_parlamentar || p.nome}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p.partido_sigla && <span className="font-semibold text-primary">{p.partido_sigla}</span>}
                        {p.cargo && <span> · {p.cargo}</span>}
                      </div>
                      {p.situacao && p.situacao !== 'Ativo' && (
                        <StatusBadge status={p.situacao} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* SESSÕES */}
          <TabsContent value="sessoes" className="mt-4">
            {loading ? <LoadingState /> : sessoesFiltradas.length === 0 ? <EmptyState label="sessões" /> : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="divide-y divide-border">
                  {sessoesFiltradas.map(s => (
                    <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                        <Calendar size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          {s.tipo}{s.numero ? ` — Sessão nº ${s.numero}` : ''}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {s.data}{s.hora_inicio ? ` às ${s.hora_inicio}` : ''}
                          {s.local ? ` · ${s.local}` : ''}
                        </div>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="text-center text-xs text-muted-foreground py-4 border-t border-border mt-8">
          Portal da Transparência Legislativa · {camara?.nome || 'Câmara Municipal'}
          {camara?.municipio ? ` — ${camara.municipio}` : ''}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">Carregando...</div>;
}

function EmptyState({ label }) {
  return (
    <div className="bg-card border border-border rounded-xl p-10 text-center">
      <p className="text-muted-foreground text-sm">Nenhum(a) {label} encontrado(a) com os filtros aplicados.</p>
    </div>
  );
}