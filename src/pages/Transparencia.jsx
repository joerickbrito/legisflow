import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Globe, Search, FileText, ScrollText, Users, Calendar,
  Download, BookOpen, ClipboardList, DollarSign, Scale,
  Stamp, BookMarked, LogIn, ChevronDown, Building2, Inbox, ArrowLeft
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import StatusBadge from '@/components/StatusBadge';
import ProtocoloPublico from '@/components/portal/ProtocoloPublico';

const ANOS = ['todos', ...Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() - i))];

/* ─── Seletor de câmara ─── */
function CamaraSelector({ camaras, camaraId, onChange, loading }) {
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="text-white/60 text-sm animate-pulse">Carregando câmaras...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-white">Portal da Transparência</h1>
          <p className="text-blue-300 text-sm mt-1">Consulta pública de atos legislativos</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Selecione a Câmara Municipal</h2>
          <p className="text-slate-400 text-sm mb-6">Escolha a câmara que deseja consultar</p>

          {camaras.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Nenhuma câmara disponível no momento.
            </div>
          ) : (
            <div className="space-y-2">
              {camaras.map(c => (
                <button
                  key={c.id}
                  onClick={() => onChange(c.id)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-left transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-600/30 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                    {c.brasao_url
                      ? <img src={c.brasao_url} alt="" className="w-8 h-8 object-contain rounded" />
                      : <Building2 size={18} className="text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium leading-tight truncate">{c.nome}</div>
                    {c.municipio && (
                      <div className="text-slate-400 text-xs mt-0.5">{c.municipio}{c.estado ? `, ${c.estado}` : ''}</div>
                    )}
                  </div>
                  <ChevronDown size={14} className="text-slate-500 group-hover:text-white -rotate-90 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-white/10">
            <Link to="/login">
              <button className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 border border-white/15 text-slate-400 hover:bg-white/10 hover:text-white transition-all text-sm font-medium">
                <LogIn size={14} /> Área Restrita — Login
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Hook de dados públicos filtrados por câmara ─── */
function usePublicData(camaraId) {
  const [data, setData] = useState({
    parlamentares: [], materias: [], normas: [],
    sessoes: [], atas: [], pautas: [], emendas: [], camara: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!camaraId) return;
    setLoading(true);
    // Lê pelo backend (portalPublico), que devolve só campos públicos — sem dados pessoais.
    base44.functions.invoke('portalPublico', { camara_id: camaraId })
      .then((resp) => {
        const d = resp?.data?.data || {};
        setData({
          parlamentares: d.parlamentares || [],
          materias: d.materias || [],
          normas: d.normas || [],
          sessoes: d.sessoes || [],
          atas: d.atas || [],
          pautas: d.pautas || [],
          emendas: d.emendas || [],
          camara: d.camara || null,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [camaraId]);

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

function NormaList({ items }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="divide-y divide-border">
        {items.map(item => <ItemRow key={item.id} {...item} />)}
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

export default function Transparencia() {
  const [camaras, setCamaras] = useState([]);
  const [loadingCamaras, setLoadingCamaras] = useState(true);
  const [camaraId, setCamaraId] = useState(() => localStorage.getItem('portal_camara_id') || null);

  const [busca, setBusca] = useState('');
  const [filtroAno, setFiltroAno] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroAutor, setFiltroAutor] = useState('todos');
  const [emendaVereador, setEmendaVereador] = useState(null);

  const { data, loading } = usePublicData(camaraId);

  useEffect(() => {
    base44.functions.invoke('portalPublico', { listar: true })
      .then((resp) => { setCamaras(resp?.data?.data || []); setLoadingCamaras(false); })
      .catch(() => setLoadingCamaras(false));
  }, []);

  function selectCamara(id) {
    localStorage.setItem('portal_camara_id', id);
    setCamaraId(id);
    setBusca(''); setFiltroAno('todos'); setFiltroTipo('todos'); setFiltroStatus('todos'); setFiltroAutor('todos');
  }

  // Se não selecionou câmara ou câmara inválida, mostrar seletor
  const camaraValida = camaraId && (camaras.length === 0 || camaras.find(c => c.id === camaraId));
  if (!camaraValida) {
    return <CamaraSelector camaras={camaras} camaraId={camaraId} onChange={selectCamara} loading={loadingCamaras} />;
  }

  const f = { busca, filtroAno, filtroTipo, filtroStatus, filtroAutor };

  const parlFiltrados = data.parlamentares.filter(p =>
    !busca || [p.nome, p.nome_parlamentar, p.partido_sigla].some(v => v?.toLowerCase().includes(busca.toLowerCase()))
  );

  const projetosFiltrados = filterItems(
    data.materias.filter(m => m.tipo === 'Projeto de Lei' || m.tipo === 'Projeto de Lei Complementar'),
    { ...f, searchFields: ['ementa', 'autor_nome', 'numero'], tipoField: 'tipo', statusField: 'status', anoField: 'ano', autorField: 'autor_nome' }
  );

  const leisFiltradas = filterItems(
    data.normas.filter(n => n.tipo === 'Lei Ordinária' || n.tipo === 'Lei Complementar' || n.tipo === 'Lei Orgânica'),
    { ...f, searchFields: ['ementa', 'numero'], tipoField: 'tipo', statusField: 'situacao', anoField: 'ano', autorField: '' }
  );

  const normasPorTipo = (tipo) => filterItems(
    data.normas.filter(n => n.tipo === tipo),
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
    (!busca || `${a.numero} ${a.sessao_numero}`.toLowerCase().includes(busca.toLowerCase())) &&
    (filtroAno === 'todos' || (a.data || '').startsWith(filtroAno))
  );

  const pautasFiltradas = data.pautas.filter(p =>
    !busca || `${p.numero} ${p.sessao_numero}`.toLowerCase().includes(busca.toLowerCase())
  );

  const emendasFiltradas = filterItems(
    data.emendas,
    { ...f, searchFields: ['numero', 'objeto', 'vereador_nome'], tipoField: '', statusField: '', anoField: 'ano', autorField: 'vereador_nome' }
  );

  // Emendas impositivas agrupadas por vereador (portal mostra vereador → emendas dele)
  const emendasPorVereador = (() => {
    const map = new Map();
    data.emendas.forEach(e => {
      const key = e.vereador_id || e.vereador_nome || 'sem-autor';
      if (!map.has(key)) {
        const parl = data.parlamentares.find(p => p.id === e.vereador_id || (p.nome_parlamentar || p.nome) === e.vereador_nome);
        map.set(key, {
          key,
          nome: e.vereador_nome || 'Não informado',
          partido: e.vereador_partido || parl?.partido_sigla || '',
          foto: parl?.foto_url || '',
          emendas: [],
        });
      }
      map.get(key).emendas.push(e);
    });
    return Array.from(map.values())
      .filter(g => !busca || g.nome.toLowerCase().includes(busca.toLowerCase()))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  })();
  const grupoSelecionado = emendaVereador ? emendasPorVereador.find(g => g.key === emendaVereador) : null;

  const autoresMateria = [...new Set(data.materias.map(m => m.autor_nome).filter(Boolean))].sort();
  const { camara } = data;

  const totais = [
    { icon: Users, label: 'Parlamentares', n: data.parlamentares.length },
    { icon: FileText, label: 'Projetos de Lei', n: data.materias.filter(m => m.tipo === 'Projeto de Lei' || m.tipo === 'Projeto de Lei Complementar').length },
    { icon: ScrollText, label: 'Leis e Normas', n: data.normas.length },
    { icon: Calendar, label: 'Sessões', n: data.sessoes.length },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-primary text-primary-foreground pt-12 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {camara?.brasao_url && (
            <img src={camara.brasao_url} alt="Brasão" className="h-20 w-20 object-contain mx-auto mb-4 rounded-xl bg-white/95 p-1.5 shadow-lg" />
          )}
          <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">Portal da Transparência</h1>
          <p className="text-primary-foreground/70 text-base">
            {camara?.nome || 'Câmara Municipal'} — Consulta pública de atos legislativos
          </p>
          {camara?.municipio && (
            <p className="text-primary-foreground/50 text-sm mt-1">{camara.municipio}{camara.estado ? `, ${camara.estado}` : ''}</p>
          )}
          <button
            onClick={() => { localStorage.removeItem('portal_camara_id'); setCamaraId(null); }}
            className="mt-3 text-xs text-primary-foreground/50 hover:text-primary-foreground/80 underline transition-colors"
          >
            Trocar câmara
          </button>
        </div>
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <Link to="/login">
            <button className="flex items-center gap-2 py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-medium transition-all border border-white/20">
              <LogIn size={13} /> Área Restrita
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-8 space-y-5">
        {/* Resumo (cards sobrepostos ao hero) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 -mt-16 relative z-10">
          {totais.map((t) => (
            <div key={t.label} className="bg-card border border-border rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <t.icon size={18} className="text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-heading font-bold text-foreground tabular-nums leading-none">{t.n}</div>
                <div className="text-xs text-muted-foreground mt-1 truncate">{t.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros globais */}
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
                <SelectItem value="Encerrada">Encerrada</SelectItem>
              </SelectContent>
            </Select>
            {autoresMateria.length > 0 && (
              <Select value={filtroAutor} onValueChange={setFiltroAutor}>
                <SelectTrigger className="w-44 h-10"><SelectValue placeholder="Autor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os autores</SelectItem>
                  {autoresMateria.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

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
              <DollarSign size={13} /> Emendas Imp. <CountBadge n={emendasPorVereador.length} />
            </TabsTrigger>
            <TabsTrigger value="protocolo" className="gap-1 rounded-lg text-xs whitespace-nowrap">
              <Inbox size={13} /> Protocolo
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
                      {p.foto_url
                        ? <img src={p.foto_url} alt={nome} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                        : <div className="w-14 h-14 bg-accent rounded-xl flex items-center justify-center font-heading font-bold text-primary text-xl flex-shrink-0">{nome?.charAt(0)}</div>}
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
                id: m.id, icon: FileText,
                label: `${m.tipo}${m.numero ? ` nº ${m.numero}` : ''}${m.ano ? `/${m.ano}` : ''}`,
                ementa: m.ementa, status: m.status, arquivo_url: m.arquivo_url,
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
                ementa: n.ementa, status: n.situacao, arquivo_url: n.arquivo_url,
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
                ementa: n.ementa, status: n.situacao, arquivo_url: n.arquivo_url,
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
                ementa: n.ementa, status: n.situacao, arquivo_url: n.arquivo_url,
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
                ementa: n.ementa, status: n.situacao, arquivo_url: n.arquivo_url,
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

          {/* EMENDAS IMPOSITIVAS — por vereador */}
          <TabsContent value="emendas" className="mt-4">
            {loading ? <LoadingMsg /> : grupoSelecionado ? (
              <div>
                <button
                  onClick={() => setEmendaVereador(null)}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium mb-4"
                >
                  <ArrowLeft size={15} /> Voltar aos vereadores
                </button>
                <div className="flex items-center gap-4 mb-4 bg-card border border-border rounded-xl p-4">
                  {grupoSelecionado.foto
                    ? <img src={grupoSelecionado.foto} alt={grupoSelecionado.nome} className="w-16 h-16 rounded-xl object-cover" />
                    : <div className="w-16 h-16 bg-accent rounded-xl flex items-center justify-center font-heading font-bold text-primary text-2xl">{grupoSelecionado.nome.charAt(0)}</div>}
                  <div>
                    <div className="font-heading font-bold text-lg text-foreground">{grupoSelecionado.nome}</div>
                    {grupoSelecionado.partido && <div className="text-sm text-primary font-semibold">{grupoSelecionado.partido}</div>}
                    <div className="text-xs text-muted-foreground mt-0.5">{grupoSelecionado.emendas.length} emenda{grupoSelecionado.emendas.length !== 1 ? 's' : ''} impositiva{grupoSelecionado.emendas.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="divide-y divide-border">
                    {grupoSelecionado.emendas.map(e => (
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
              </div>
            ) : emendasPorVereador.length === 0 ? <EmptyMsg label="emendas impositivas" /> : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {emendasPorVereador.map(g => {
                  const total = g.emendas.reduce((s, e) => s + (Number(e.valor) || 0), 0);
                  return (
                    <button
                      key={g.key}
                      onClick={() => setEmendaVereador(g.key)}
                      className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:shadow-md hover:border-primary/30 transition-all text-left"
                    >
                      {g.foto
                        ? <img src={g.foto} alt={g.nome} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                        : <div className="w-14 h-14 bg-accent rounded-xl flex items-center justify-center font-heading font-bold text-primary text-xl flex-shrink-0">{g.nome.charAt(0)}</div>}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-foreground truncate">{g.nome}</div>
                        {g.partido && <div className="text-xs text-primary font-semibold">{g.partido}</div>}
                        <div className="text-xs text-muted-foreground mt-1">
                          {g.emendas.length} emenda{g.emendas.length !== 1 ? 's' : ''}
                          {total > 0 ? ` · R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                        </div>
                      </div>
                      <ChevronDown size={14} className="text-muted-foreground -rotate-90 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* PROTOCOLO — criar / consultar */}
          <TabsContent value="protocolo" className="mt-4">
            <ProtocoloPublico camaraId={camaraId} />
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

function LoadingMsg() {
  return <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm animate-pulse">Carregando...</div>;
}