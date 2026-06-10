import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Globe, Search, FileText, ScrollText, Users, Calendar,
  Download, BookOpen, ClipboardList, DollarSign, Scale,
  Stamp, BookMarked, ExternalLink, LogIn, ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import StatusBadge from '@/components/StatusBadge';

const ANOS = ['todos', ...Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() - i))];

function usePublicData() {
  const [data, setData] = useState({
    parlamentares: [], materias: [], normas: [],
    sessoes: [], atas: [], pautas: [], emendas: [],
    camara: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Parlamentar.filter({ ativo: true }, 'nome', 200),
      base44.entities.Materia.filter({}, '-created_date', 500),
      base44.entities.NormaJuridica.filter({}, '-data_publicacao', 500),
      base44.entities.Sessao.filter({}, '-data', 200),
      base44.entities.AtaSessao.filter({}, '-data', 200),
      base44.entities.PautaSessao.filter({}, '-created_date', 200),
      base44.entities.EmendaImpositiva.filter({}, '-created_date', 500),
      base44.entities.Camara.list('-created_date', 1),
    ]).then(([parlamentares, materias, normas, sessoes, atas, pautas, emendas, camaras]) => {
      setData({ parlamentares, materias, normas, sessoes, atas, pautas, emendas, camara: camaras[0] || null });
      setLoading(false);
    });
  }, []);

  return { data, loading };
}

function filterItems(items, { busca, filtroAno, filtroTipo, filtroStatus, filtroAutor, searchFields, tipoField, statusField, anoField, autorField }) {
  return items.filter(item => {
    const matchBusca = !busca || searchFields.some(f => item[f]?.toLowerCase().includes(busca.toLowerCase()));
    const matchAno = filtroAno === 'todos' || String(item[anoField] || item.ano || '').includes(filtroAno) || (item[anoField] || item.data || item.data_publicacao || '').startsWith(filtroAno);
    const matchTipo = !filtroTipo || filtroTipo === 'todos' || item[tipoField] === filtroTipo;
    const matchStatus = !filtroStatus || filtroStatus === 'todos' || item[statusField] === filtroStatus;
    const matchAutor = !filtroAutor || filtroAutor === 'todos' || item[autorField]?.toLowerCase().includes(filtroAutor.toLowerCase());
    return matchBusca && matchAno && matchTipo && matchStatus && matchAutor;
  });
}

/* ─── Row genérico para normas/matérias ─── */
function ItemRow({ icon: Icon, label, ementa, status, arquivo_url, data, extra }) {
  return (
    <div className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground font-semibold mb-0.5">{label}</div>
        <div className="text-sm font-medium text-foreground leading-snug">{ementa}</div>
        {(data || extra) && (
          <div className="text-xs text-muted-foreground mt-1">{[data, extra].filter(Boolean).join(' · ')}</div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {status && <StatusBadge status={status} />}
        {arquivo_url && (
          <a href={arquivo_url} target="_blank" rel="noreferrer"
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Abrir PDF">
            <Download size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

function CountBadge({ n }) {
  return <span className="ml-1.5 bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-semibold">{n}</span>;
}

function EmptyMsg({ label }) {
  return (
    <div className="bg-card border border-border rounded-xl p-10 text-center">
      <p className="text-muted-foreground text-sm">Nenhum(a) {label} encontrado(a) com os filtros aplicados.</p>
    </div>
  );
}

function LoadingMsg() {
  return <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm animate-pulse">Carregando...</div>;
}

/* ─── Filtros superiores compartilhados ─── */
function Filtros({ busca, setBusca, filtroAno, setFiltroAno, filtroStatus, setFiltroStatus, filtroAutor, setFiltroAutor, autores }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex flex-col md:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por palavra-chave..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9 h-10" />
        </div>
        <Select value={filtroAno} onValueChange={setFiltroAno}>
          <SelectTrigger className="w-36 h-10"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            {ANOS.map(a => <SelectItem key={a} value={a}>{a === 'todos' ? 'Todos os anos' : a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-44 h-10"><SelectValue placeholder="Situação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas situações</SelectItem>
            <SelectItem value="Vigente">Vigente</SelectItem>
            <SelectItem value="Em tramitação">Em tramitação</SelectItem>
            <SelectItem value="Aprovada">Aprovada</SelectItem>
            <SelectItem value="Rejeitada">Rejeitada</SelectItem>
            <SelectItem value="Revogada">Revogada</SelectItem>
            <SelectItem value="Agendada">Agendada</SelectItem>
            <SelectItem value="Em Andamento">Em Andamento</SelectItem>
            <SelectItem value="Encerrada">Encerrada</SelectItem>
          </SelectContent>
        </Select>
        {autores?.length > 0 && (
          <Select value={filtroAutor} onValueChange={setFiltroAutor}>
            <SelectTrigger className="w-44 h-10"><SelectValue placeholder="Autor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os autores</SelectItem>
              {autores.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

export default function Transparencia() {
  const { data, loading } = usePublicData();
  const [busca, setBusca] = useState('');
  const [filtroAno, setFiltroAno] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroAutor, setFiltroAutor] = useState('todos');

  const f = { busca, filtroAno, filtroTipo, filtroStatus, filtroAutor };

  // Derivações filtradas
  const parlFiltrados = data.parlamentares.filter(p =>
    !busca || [p.nome, p.nome_parlamentar, p.partido_sigla].some(v => v?.toLowerCase().includes(busca.toLowerCase()))
  );

  const projetosFiltrados = filterItems(
    data.materias.filter(m => m.tipo === 'Projeto de Lei' || m.tipo === 'Projeto de Lei Complementar'),
    { ...f, searchFields: ['ementa', 'autor_nome', 'numero'], tipoField: 'tipo', statusField: 'status', anoField: 'ano', autorField: 'autor_nome' }
  );

  const normasPorTipo = (tipo) => filterItems(
    data.normas.filter(n => n.tipo === tipo),
    { ...f, searchFields: ['ementa', 'numero'], tipoField: 'tipo', statusField: 'situacao', anoField: 'ano', autorField: '' }
  );
  const leisFiltradas = filterItems(
    data.normas.filter(n => n.tipo === 'Lei Ordinária' || n.tipo === 'Lei Complementar' || n.tipo === 'Lei Orgânica'),
    { ...f, searchFields: ['ementa', 'numero'], tipoField: 'tipo', statusField: 'situacao', anoField: 'ano', autorField: '' }
  );
  const resolucoesFiltradas = normasPorTipo('Resolução');
  const decretosFiltrados = normasPorTipo('Decreto Legislativo');
  const portariasFiltradas = normasPorTipo('Portaria');

  const sessoesFiltradas = filterItems(
    data.sessoes,
    { ...f, searchFields: ['tipo', 'numero', 'local'], tipoField: 'tipo', statusField: 'status', anoField: 'data', autorField: '' }
  );

  const atasFiltradas = data.atas.filter(a =>
    !busca || `${a.numero} ${a.sessao_numero}`.toLowerCase().includes(busca.toLowerCase())
  ).filter(a => filtroAno === 'todos' || (a.data || '').startsWith(filtroAno));

  const pautasFiltradas = data.pautas.filter(p =>
    !busca || `${p.numero} ${p.sessao_numero}`.toLowerCase().includes(busca.toLowerCase())
  );

  const emendasFiltradas = filterItems(
    data.emendas,
    { ...f, searchFields: ['numero', 'objeto', 'vereador_nome'], tipoField: '', statusField: '', anoField: 'ano', autorField: 'vereador_nome' }
  );

  const autoresMateria = [...new Set(data.materias.map(m => m.autor_nome).filter(Boolean))].sort();

  const { camara } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-primary text-primary-foreground py-10 px-6 relative">
        <div className="max-w-5xl mx-auto text-center">
          {camara?.brasao_url && (
            <img src={camara.brasao_url} alt="Brasão" className="h-16 w-16 object-contain mx-auto mb-4 rounded-xl" />
          )}
          <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">Portal da Transparência</h1>
          <p className="text-primary-foreground/70 text-base">
            {camara?.nome || 'Câmara Municipal'} — Consulta pública de atos legislativos
          </p>
          {camara?.municipio && (
            <p className="text-primary-foreground/50 text-sm mt-1">{camara.municipio}{camara.estado ? `, ${camara.estado}` : ''}</p>
          )}
        </div>
        {/* Botão de login */}
        <div className="absolute top-4 right-4">
          <Link to="/login">
            <button className="flex items-center gap-2 py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-medium transition-all border border-white/20">
              <LogIn size={13} /> Área Restrita
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">
        {/* Filtros */}
        <Filtros
          busca={busca} setBusca={setBusca}
          filtroAno={filtroAno} setFiltroAno={setFiltroAno}
          filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus}
          filtroAutor={filtroAutor} setFiltroAutor={setFiltroAutor}
          autores={autoresMateria}
        />

        {/* Abas */}
        <Tabs defaultValue="parlamentares">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap gap-0.5 bg-muted p-1 rounded-xl h-auto">
            <TabsTrigger value="parlamentares" className="gap-1 rounded-lg text-xs whitespace-nowrap">
              <Users size={13} /> Parlamentares <CountBadge n={parlFiltrados.length} />
            </TabsTrigger>
            <TabsTrigger value="projetos" className="gap-1 rounded-lg text-xs whitespace-nowrap">
              <FileText size={13} /> Projetos de Lei <CountBadge n={projetosFiltrados.length} />
            </TabsTrigger>
            <TabsTrigger value="leis" className="gap-1 rounded-lg text-xs whitespace-nowrap">
              <ScrollText size={13} /> Leis <CountBadge n={leisFiltradas.length} />
            </TabsTrigger>
            <TabsTrigger value="resolucoes" className="gap-1 rounded-lg text-xs whitespace-nowrap">
              <Scale size={13} /> Resoluções <CountBadge n={resolucoesFiltradas.length} />
            </TabsTrigger>
            <TabsTrigger value="decretos" className="gap-1 rounded-lg text-xs whitespace-nowrap">
              <Stamp size={13} /> Decretos <CountBadge n={decretosFiltrados.length} />
            </TabsTrigger>
            <TabsTrigger value="portarias" className="gap-1 rounded-lg text-xs whitespace-nowrap">
              <BookMarked size={13} /> Portarias <CountBadge n={portariasFiltradas.length} />
            </TabsTrigger>
            <TabsTrigger value="sessoes" className="gap-1 rounded-lg text-xs whitespace-nowrap">
              <Calendar size={13} /> Sessões <CountBadge n={sessoesFiltradas.length} />
            </TabsTrigger>
            <TabsTrigger value="atas" className="gap-1 rounded-lg text-xs whitespace-nowrap">
              <BookOpen size={13} /> Atas <CountBadge n={atasFiltradas.length} />
            </TabsTrigger>
            <TabsTrigger value="pautas" className="gap-1 rounded-lg text-xs whitespace-nowrap">
              <ClipboardList size={13} /> Pautas <CountBadge n={pautasFiltradas.length} />
            </TabsTrigger>
            <TabsTrigger value="emendas" className="gap-1 rounded-lg text-xs whitespace-nowrap">
              <DollarSign size={13} /> Emendas Imp. <CountBadge n={emendasFiltradas.length} />
            </TabsTrigger>
          </TabsList>

          {/* PARLAMENTARES */}
          <TabsContent value="parlamentares" className="mt-4">
            {loading ? <LoadingMsg /> : parlFiltrados.length === 0 ? <EmptyMsg label="parlamentares" /> : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {parlFiltrados.map(p => {
                  const nome = p.nome_parlamentar || p.nome;
                  const nMaterias = data.materias.filter(m => m.autor_id === p.id || m.autor_nome === nome).length;
                  return (
                    <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                      {p.foto_url ? (
                        <img src={p.foto_url} alt={nome} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 bg-accent rounded-xl flex items-center justify-center font-heading font-bold text-primary text-xl flex-shrink-0">
                          {nome?.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-foreground">{nome}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {p.partido_sigla && <span className="font-semibold text-primary mr-1">{p.partido_sigla}</span>}
                          {p.cargo && <span>{p.cargo}</span>}
                        </div>
                        {nMaterias > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="bg-accent text-accent-foreground px-1.5 py-0.5 rounded-md">{nMaterias} matéria{nMaterias !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* PROJETOS DE LEI */}
          <TabsContent value="projetos" className="mt-4">
            <TipoFilter tipos={['Projeto de Lei', 'Projeto de Lei Complementar']} filtroTipo={filtroTipo} setFiltroTipo={setFiltroTipo} />
            {loading ? <LoadingMsg /> : projetosFiltrados.length === 0 ? <EmptyMsg label="projetos de lei" /> : (
              <NormaList items={projetosFiltrados.map(m => ({
                id: m.id,
                icon: FileText,
                label: `${m.tipo}${m.numero ? ` nº ${m.numero}` : ''}${m.ano ? `/${m.ano}` : ''}`,
                ementa: m.ementa,
                status: m.status,
                arquivo_url: m.arquivo_url,
                data: m.data_apresentacao ? `Apresentado em ${m.data_apresentacao}` : null,
                extra: m.autor_nome ? `Autor: ${m.autor_nome}` : null,
              }))} />
            )}
          </TabsContent>

          {/* LEIS */}
          <TabsContent value="leis" className="mt-4">
            <TipoFilter tipos={['Lei Ordinária', 'Lei Complementar', 'Lei Orgânica', 'Emenda à Lei Orgânica']} filtroTipo={filtroTipo} setFiltroTipo={setFiltroTipo} />
            {loading ? <LoadingMsg /> : leisFiltradas.length === 0 ? <EmptyMsg label="leis" /> : (
              <NormaList items={leisFiltradas.map(n => ({
                id: n.id, icon: ScrollText,
                label: `${n.tipo}${n.numero ? ` nº ${n.numero}` : ''}${n.ano ? `/${n.ano}` : ''}`,
                ementa: n.ementa, status: n.situacao,
                arquivo_url: n.arquivo_url,
                data: n.data_publicacao ? `Publicada em ${n.data_publicacao}` : null,
              }))} />
            )}
          </TabsContent>

          {/* RESOLUÇÕES */}
          <TabsContent value="resolucoes" className="mt-4">
            {loading ? <LoadingMsg /> : resolucoesFiltradas.length === 0 ? <EmptyMsg label="resoluções" /> : (
              <NormaList items={resolucoesFiltradas.map(n => ({
                id: n.id, icon: Scale,
                label: `Resolução${n.numero ? ` nº ${n.numero}` : ''}${n.ano ? `/${n.ano}` : ''}`,
                ementa: n.ementa, status: n.situacao,
                arquivo_url: n.arquivo_url,
                data: n.data_publicacao ? `Publicada em ${n.data_publicacao}` : null,
              }))} />
            )}
          </TabsContent>

          {/* DECRETOS */}
          <TabsContent value="decretos" className="mt-4">
            {loading ? <LoadingMsg /> : decretosFiltrados.length === 0 ? <EmptyMsg label="decretos" /> : (
              <NormaList items={decretosFiltrados.map(n => ({
                id: n.id, icon: Stamp,
                label: `Decreto Legislativo${n.numero ? ` nº ${n.numero}` : ''}${n.ano ? `/${n.ano}` : ''}`,
                ementa: n.ementa, status: n.situacao,
                arquivo_url: n.arquivo_url,
                data: n.data_publicacao ? `Publicada em ${n.data_publicacao}` : null,
              }))} />
            )}
          </TabsContent>

          {/* PORTARIAS */}
          <TabsContent value="portarias" className="mt-4">
            {loading ? <LoadingMsg /> : portariasFiltradas.length === 0 ? <EmptyMsg label="portarias" /> : (
              <NormaList items={portariasFiltradas.map(n => ({
                id: n.id, icon: BookMarked,
                label: `Portaria${n.numero ? ` nº ${n.numero}` : ''}${n.ano ? `/${n.ano}` : ''}`,
                ementa: n.ementa, status: n.situacao,
                arquivo_url: n.arquivo_url,
                data: n.data_publicacao ? `Publicada em ${n.data_publicacao}` : null,
              }))} />
            )}
          </TabsContent>

          {/* SESSÕES */}
          <TabsContent value="sessoes" className="mt-4">
            <TipoFilter tipos={['Ordinária', 'Extraordinária', 'Solene', 'Especial']} filtroTipo={filtroTipo} setFiltroTipo={setFiltroTipo} label="Tipo de sessão" />
            {loading ? <LoadingMsg /> : sessoesFiltradas.length === 0 ? <EmptyMsg label="sessões" /> : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="divide-y divide-border">
                  {sessoesFiltradas.map(s => (
                    <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                        <Calendar size={15} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          {s.numero ? `${s.numero}ª ` : ''}Sessão {s.tipo}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {s.data}{s.hora_inicio ? ` às ${s.hora_inicio}` : ''}{s.local ? ` · ${s.local}` : ''}
                        </div>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ATAS */}
          <TabsContent value="atas" className="mt-4">
            {loading ? <LoadingMsg /> : atasFiltradas.length === 0 ? <EmptyMsg label="atas" /> : (
              <NormaList items={atasFiltradas.map(a => ({
                id: a.id, icon: BookOpen,
                label: `Ata nº ${a.numero}`,
                ementa: a.observacoes || 'Ata da sessão',
                arquivo_url: a.arquivo_url,
                data: a.data,
                extra: a.sessao_numero ? `Sessão ${a.sessao_numero}` : null,
              }))} />
            )}
          </TabsContent>

          {/* PAUTAS */}
          <TabsContent value="pautas" className="mt-4">
            {loading ? <LoadingMsg /> : pautasFiltradas.length === 0 ? <EmptyMsg label="pautas" /> : (
              <NormaList items={pautasFiltradas.map(p => ({
                id: p.id, icon: ClipboardList,
                label: `Pauta nº ${p.numero}`,
                ementa: p.observacoes || 'Pauta da sessão',
                arquivo_url: p.arquivo_url,
                extra: p.sessao_numero ? `Sessão ${p.sessao_numero}` : null,
              }))} />
            )}
          </TabsContent>

          {/* EMENDAS IMPOSITIVAS */}
          <TabsContent value="emendas" className="mt-4">
            {loading ? <LoadingMsg /> : emendasFiltradas.length === 0 ? <EmptyMsg label="emendas impositivas" /> : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="divide-y divide-border">
                  {emendasFiltradas.map(e => (
                    <div key={e.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                        <DollarSign size={15} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground font-semibold mb-0.5">
                          Emenda Impositiva nº {e.numero}{e.ano ? `/${e.ano}` : ''}
                          {e.valor ? ` · R$ ${Number(e.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                        </div>
                        <div className="text-sm font-medium text-foreground leading-snug">{e.objeto}</div>
                        {e.vereador_nome && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Vereador: {e.vereador_nome}{e.vereador_partido ? ` — ${e.vereador_partido}` : ''}
                          </div>
                        )}
                      </div>
                      {e.arquivo_url && (
                        <a href={e.arquivo_url} target="_blank" rel="noreferrer"
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0">
                          <Download size={14} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Rodapé */}
        <div className="text-center text-xs text-muted-foreground py-6 border-t border-border mt-4 space-y-2">
          <div>Portal da Transparência Legislativa · {camara?.nome || 'Câmara Municipal'}{camara?.municipio ? ` — ${camara.municipio}` : ''}</div>
          <div>
            <Link to="/login" className="text-primary hover:underline inline-flex items-center gap-1">
              <LogIn size={11} /> Acesso ao Sistema Interno
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Lista de normas/documentos ─── */
function NormaList({ items }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="divide-y divide-border">
        {items.map(item => (
          <ItemRow key={item.id} {...item} />
        ))}
      </div>
    </div>
  );
}

/* ─── Filtro de tipo inline ─── */
function TipoFilter({ tipos, filtroTipo, setFiltroTipo, label = 'Tipo' }) {
  return (
    <div className="mb-3">
      <Select value={filtroTipo} onValueChange={setFiltroTipo}>
        <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder={label} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os tipos</SelectItem>
          {tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}