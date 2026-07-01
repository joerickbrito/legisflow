import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Globe, Search, FileText, ScrollText, Users, Calendar,
  Download, BookOpen, ClipboardList, DollarSign, Scale,
  Stamp, BookMarked, LogIn, ChevronDown, Building2, Inbox, ArrowLeft,
  Sparkles, Link2, Check
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import StatusBadge from '@/components/StatusBadge';
import ProtocoloPublico from '@/components/portal/ProtocoloPublico';

const ANOS = ['todos', ...Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() - i))];

/* ─── Seletor de câmara (por busca — não expõe a lista completa) ─── */
function CamaraSelector({ onChange, aviso }) {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [buscou, setBuscou] = useState(false);

  useEffect(() => {
    const termo = q.trim();
    if (termo.length < 2) { setResultados([]); setBuscou(false); setBuscando(false); return; }
    setBuscando(true);
    const t = setTimeout(() => {
      base44.functions.invoke('portalPublico', { buscar: termo })
        .then((resp) => { setResultados(resp?.data?.data || []); setBuscou(true); })
        .catch(() => { setResultados([]); setBuscou(true); })
        .finally(() => setBuscando(false));
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[radial-gradient(120%_120%_at_50%_-20%,#1e40af_0%,#0b1220_55%,#050914_100%)]">
      {/* mesh sutil */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(600px 300px at 10% 10%, rgba(59,130,246,0.25), transparent 60%),' +
            'radial-gradient(500px 260px at 90% 20%, rgba(147,197,253,0.18), transparent 60%),' +
            'radial-gradient(700px 400px at 50% 100%, rgba(37,99,235,0.22), transparent 60%)',
        }} />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md shadow-[0_10px_40px_-10px_rgba(59,130,246,0.6)] mb-4">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Portal da Transparência</h1>
          <p className="text-blue-200/80 text-sm mt-1.5">Consulta pública de atos legislativos</p>
        </div>

        <div className="rounded-3xl bg-white/[0.06] backdrop-blur-xl border border-white/10 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
          <h2 className="text-lg font-semibold text-white">Encontre sua Câmara</h2>
          <p className="text-slate-400 text-sm mt-1 mb-4">Digite o nome do município ou da câmara.</p>

          {aviso && (
            <div className="mb-4 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">{aviso}</div>
          )}

          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ex.: Piraí do Norte"
              className="w-full h-12 pl-10 pr-3 rounded-2xl bg-slate-950/40 border border-white/10 text-white placeholder:text-slate-500 text-sm outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>

          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
            {q.trim().length < 2 ? (
              <p className="text-slate-500 text-xs text-center py-4">Digite ao menos 2 letras para buscar.</p>
            ) : buscando ? (
              <p className="text-slate-400 text-xs text-center py-4 animate-pulse">Buscando...</p>
            ) : resultados.length === 0 && buscou ? (
              <p className="text-slate-400 text-xs text-center py-4">Nenhuma câmara encontrada para “{q.trim()}”.</p>
            ) : (
              resultados.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onChange(c.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-blue-400/40 text-left transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center flex-shrink-0">
                    {c.brasao_url
                      ? <img src={c.brasao_url} alt="" className="w-7 h-7 object-contain rounded" />
                      : <Building2 size={16} className="text-blue-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium leading-tight truncate">{c.nome}</div>
                    {c.municipio && (
                      <div className="text-slate-400 text-xs mt-0.5">{c.municipio}{c.estado ? `, ${c.estado}` : ''}</div>
                    )}
                  </div>
                  <ChevronDown size={14} className="text-slate-500 group-hover:text-blue-300 -rotate-90 transition-colors flex-shrink-0" />
                </button>
              ))
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-white/10">
            <Link to="/login">
              <button className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-white/[0.04] border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all text-sm font-medium">
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

function ItemRow({ icon: Icon, label, ementa, status, arquivo_url, data, extra, highlight, linkCopiar }) {
  const ref = useRef(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (highlight && ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight]);

  function copiar() {
    try { navigator.clipboard?.writeText(linkCopiar); } catch { /* ignore */ }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <div ref={ref} className={`group flex items-start gap-4 px-5 py-4 transition-colors ${highlight ? 'bg-primary/5 ring-2 ring-inset ring-primary/50' : 'hover:bg-slate-50/70 dark:hover:bg-muted/20'}`}>
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/20 ring-1 ring-blue-100 dark:ring-blue-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-blue-700 dark:text-blue-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{label}</div>
        <div className="text-sm font-medium text-foreground leading-snug">{ementa}</div>
        {(data || extra) && (
          <div className="text-xs text-muted-foreground mt-1">{[data, extra].filter(Boolean).join(' · ')}</div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {status && <StatusBadge status={status} />}
        {linkCopiar && (
          <button onClick={copiar}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Copiar link deste item">
            {copiado ? <Check size={14} className="text-emerald-500" /> : <Link2 size={14} />}
          </button>
        )}
        {arquivo_url && (
          <a href={arquivo_url} target="_blank" rel="noreferrer"
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Abrir PDF">
            <Download size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

function NormaList({ items, itemAlvo, linkBase }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="divide-y divide-border">
        {items.map(item => (
          <ItemRow
            key={item.id}
            {...item}
            highlight={itemAlvo && item.id === itemAlvo}
            linkCopiar={linkBase ? `${linkBase}&item=${item.id}` : null}
          />
        ))}
      </div>
    </div>
  );
}

function CountBadge({ n, active }) {
  return (
    <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums ${
      active ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
    }`}>{n}</span>
  );
}

function EmptyMsg({ label }) {
  return (
    <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
      <div className="w-12 h-12 rounded-2xl bg-muted mx-auto mb-3 flex items-center justify-center">
        <Sparkles size={18} className="text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm">Nenhum(a) {label} encontrado(a) com os filtros aplicados.</p>
    </div>
  );
}

function TipoFilter({ tipos, filtroTipo, setFiltroTipo, label = 'Tipo' }) {
  return (
    <div className="mb-3">
      <Select value={filtroTipo} onValueChange={setFiltroTipo}>
        <SelectTrigger className="w-52 h-8 text-xs rounded-lg"><SelectValue placeholder={label} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os tipos</SelectItem>
          {tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function Transparencia() {
  // A câmara vem SOMENTE do link direto (?c=ID). Sem esse parâmetro, mostramos a
  // busca — assim o acesso genérico sempre pede a câmara (não reabre a última).
  const [camaraId, setCamaraId] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('c') || null; }
    catch { return null; }
  });

  const [busca, setBusca] = useState('');
  const [filtroAno, setFiltroAno] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroAutor, setFiltroAutor] = useState('todos');
  const [emendaVereador, setEmendaVereador] = useState(null);
  const [aba, setAba] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('aba') || 'parlamentares'; }
    catch { return 'parlamentares'; }
  });
  // Item específico apontado pela URL (?item=<id>) — destaca/rola até ele.
  const [itemAlvo, setItemAlvo] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('item') || ''; }
    catch { return ''; }
  });

  // Troca a aba e reflete na URL (links diretos por seção).
  function mudarAba(nova) {
    setAba(nova);
    setItemAlvo('');
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('aba', nova);
      url.searchParams.delete('item');
      window.history.replaceState(null, '', url);
    } catch { /* ignore */ }
  }

  const { data, loading } = usePublicData(camaraId);

  function selectCamara(id) {
    try {
      localStorage.setItem('portal_camara_id', id);
      const url = new URL(window.location.href);
      url.searchParams.set('c', id);
      window.history.replaceState(null, '', url);
    } catch { /* ignore */ }
    setCamaraId(id);
    setBusca(''); setFiltroAno('todos'); setFiltroTipo('todos'); setFiltroStatus('todos'); setFiltroAutor('todos');
  }

  function trocarCamara(aviso) {
    try {
      localStorage.removeItem('portal_camara_id');
      const url = new URL(window.location.href);
      url.searchParams.delete('c');
      window.history.replaceState(null, '', url);
    } catch { /* ignore */ }
    setCamaraId(null);
    if (aviso) setCamaraInvalida(aviso);
  }

  const [camaraInvalida, setCamaraInvalida] = useState('');

  if (!camaraId) {
    return <CamaraSelector onChange={selectCamara} aviso={camaraInvalida} />;
  }
  if (!loading && !data.camara) {
    return <CamaraSelector onChange={selectCamara} aviso="Não encontramos essa câmara. Verifique o link ou busque abaixo." />;
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

  // Base para "copiar link" de um item — leva à mesma aba com o item destacado.
  const linkBase = camaraId
    ? `${window.location.origin}/transparencia?c=${camaraId}&aba=${aba}`
    : null;

  const totais = [
    { icon: Users, label: 'Parlamentares', n: data.parlamentares.length, accent: 'from-blue-500/15 to-blue-500/5 text-blue-700 dark:text-blue-300 ring-blue-500/20' },
    { icon: FileText, label: 'Projetos de Lei', n: data.materias.filter(m => m.tipo === 'Projeto de Lei' || m.tipo === 'Projeto de Lei Complementar').length, accent: 'from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20' },
    { icon: ScrollText, label: 'Leis e Normas', n: data.normas.length, accent: 'from-violet-500/15 to-violet-500/5 text-violet-700 dark:text-violet-300 ring-violet-500/20' },
    { icon: Calendar, label: 'Sessões', n: data.sessoes.length, accent: 'from-amber-500/15 to-amber-500/5 text-amber-700 dark:text-amber-300 ring-amber-500/20' },
  ];

  const abasCfg = [
    { key: 'parlamentares', label: 'Parlamentares', icon: Users, n: parlFiltrados.length },
    { key: 'projetos',      label: 'Projetos de Lei', icon: FileText, n: projetosFiltrados.length },
    { key: 'leis',          label: 'Leis', icon: ScrollText, n: leisFiltradas.length },
    { key: 'resolucoes',    label: 'Resoluções', icon: Scale, n: resolucoesFiltradas.length },
    { key: 'decretos',      label: 'Decretos', icon: Stamp, n: decretosFiltrados.length },
    { key: 'portarias',     label: 'Portarias', icon: BookMarked, n: portariasFiltradas.length },
    { key: 'atas',          label: 'Atas', icon: BookOpen, n: atasFiltradas.length },
    { key: 'pautas',        label: 'Pautas', icon: ClipboardList, n: pautasFiltradas.length },
    { key: 'emendas',       label: 'Emendas Imp.', icon: DollarSign, n: emendasPorVereador.length },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(120%_60%_at_50%_-20%,rgba(59,130,246,0.08),transparent_60%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] dark:bg-background">
      {/* HERO */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_-30%,#1d4ed8_0%,#0b1f4a_55%,#050914_100%)]" />
        <div className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(500px 260px at 12% 20%, rgba(96,165,250,0.35), transparent 60%),' +
              'radial-gradient(500px 260px at 88% 30%, rgba(59,130,246,0.28), transparent 60%)',
          }} />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />

        <div className="relative z-10 pt-14 pb-28 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-end">
              <Link to="/login">
                <button className="flex items-center gap-2 py-2 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-xs font-medium transition-all border border-white/15 backdrop-blur">
                  <LogIn size={13} /> Área Restrita
                </button>
              </Link>
            </div>

            <div className="text-center mt-4">
              {camara?.brasao_url && (
                <img src={camara.brasao_url} alt="Brasão" className="h-20 w-20 object-contain mx-auto mb-4 rounded-2xl bg-white/95 p-1.5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]" />
              )}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-blue-100/90 text-[11px] font-medium mb-4 backdrop-blur">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Portal público · dados abertos
              </div>
              <h1 className="text-4xl md:text-5xl font-heading font-bold text-white tracking-tight">Portal da Transparência</h1>
              <p className="text-blue-100/85 text-base mt-3 max-w-2xl mx-auto">
                {camara?.nome || 'Câmara Municipal'} — consulta pública de atos legislativos, sessões e documentos.
              </p>
              {camara?.municipio && (
                <p className="text-blue-200/60 text-sm mt-1">{camara.municipio}{camara.estado ? `, ${camara.estado}` : ''}</p>
              )}
              <button
                onClick={() => trocarCamara()}
                className="mt-4 text-xs text-blue-200/70 hover:text-white underline underline-offset-4 transition-colors"
              >
                Trocar câmara
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-10 space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 -mt-20 relative z-10">
          {totais.map((t) => (
            <div key={t.label} className={`relative overflow-hidden bg-card border border-border rounded-2xl p-4 shadow-[0_10px_30px_-15px_rgba(15,23,42,0.25)] hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 transition-all`}>
              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${t.accent.split(' text-')[0]} blur-2xl opacity-70`} />
              <div className="relative flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${t.accent} ring-1 flex items-center justify-center flex-shrink-0`}>
                  <t.icon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-heading font-bold text-foreground tabular-nums leading-none">{t.n}</div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">{t.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Barra de busca sticky */}
        <div className="sticky top-2 z-20">
          <div className="bg-card/90 backdrop-blur-xl border border-border rounded-2xl p-3 shadow-[0_10px_30px_-15px_rgba(15,23,42,0.2)]">
            <div className="flex flex-col md:flex-row gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar por palavra-chave..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-10 h-11 rounded-xl border-transparent bg-muted/60 focus-visible:bg-background" />
              </div>
              <Select value={filtroAno} onValueChange={setFiltroAno}>
                <SelectTrigger className="w-36 h-11 rounded-xl border-transparent bg-muted/60"><SelectValue placeholder="Ano" /></SelectTrigger>
                <SelectContent>
                  {ANOS.map(a => <SelectItem key={a} value={a}>{a === 'todos' ? 'Todos os anos' : a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-44 h-11 rounded-xl border-transparent bg-muted/60"><SelectValue placeholder="Situação" /></SelectTrigger>
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
                  <SelectTrigger className="w-44 h-11 rounded-xl border-transparent bg-muted/60"><SelectValue placeholder="Autor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os autores</SelectItem>
                    {autoresMateria.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        {/* Protocolo em destaque */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-200/60 dark:border-blue-900/40 bg-gradient-to-br from-blue-50 via-white to-blue-50/40 dark:from-blue-950/30 dark:via-slate-950 dark:to-blue-950/10 p-4 sm:p-5">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white ring-1 ring-blue-200 dark:ring-blue-900 shadow-sm flex items-center justify-center flex-shrink-0">
                <Inbox size={20} className="text-blue-700 dark:text-blue-300" />
              </div>
              <div>
                <div className="text-sm sm:text-base font-semibold text-foreground">Protocolar ou consultar documento</div>
                <div className="text-xs text-muted-foreground mt-0.5">Envie um documento à câmara ou acompanhe pelo código.</div>
              </div>
            </div>
            <button
              onClick={() => mudarAba('protocolo')}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-700 shadow-[0_10px_25px_-10px_rgba(37,99,235,0.7)] transition-all flex-shrink-0"
            >
              <Inbox size={16} /> Abrir Protocolo
            </button>
          </div>
        </div>

        {/* Abas */}
        <Tabs value={aba} onValueChange={mudarAba}>
          <TabsList className="w-full flex-wrap justify-start gap-1.5 bg-card border border-border p-1.5 rounded-2xl h-auto shadow-sm">
            {abasCfg.map(a => {
              const active = aba === a.key;
              const Icon = a.icon;
              return (
                <TabsTrigger
                  key={a.key}
                  value={a.key}
                  className={`gap-1.5 rounded-xl text-xs px-3 py-2 transition-all data-[state=active]:bg-gradient-to-b data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-[0_6px_16px_-6px_rgba(37,99,235,0.6)]`}
                >
                  <Icon size={13} /> {a.label} <CountBadge n={a.n} active={active} />
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* PARLAMENTARES */}
          <TabsContent value="parlamentares" className="mt-5">
            {loading ? <LoadingMsg /> : parlFiltrados.length === 0 ? <EmptyMsg label="parlamentares" /> : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {parlFiltrados.map(p => {
                  const nome = p.nome_parlamentar || p.nome;
                  const nMaterias = data.materias.filter(m => m.autor_id === p.id || m.autor_nome === nome).length;
                  return (
                    <div key={p.id} className="group relative bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:border-blue-300/60 hover:shadow-[0_15px_35px_-15px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 transition-all">
                      {p.foto_url
                        ? <img src={p.foto_url} alt={nome} className="w-16 h-16 rounded-2xl object-cover object-top ring-2 ring-white shadow flex-shrink-0" />
                        : <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-heading font-bold text-white text-xl flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700">{nome?.charAt(0)}</div>}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-foreground truncate">{nome}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                          {p.partido_sigla && <span className="font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded-md">{p.partido_sigla}</span>}
                          {p.cargo && <span>{p.cargo}</span>}
                        </div>
                        {nMaterias > 0 && (
                          <div className="text-[11px] text-muted-foreground mt-1.5">
                            <span className="bg-muted px-1.5 py-0.5 rounded-md">{nMaterias} matéria{nMaterias !== 1 ? 's' : ''}</span>
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
          <TabsContent value="projetos" className="mt-5">
            <TipoFilter tipos={['Projeto de Lei', 'Projeto de Lei Complementar']} filtroTipo={filtroTipo} setFiltroTipo={setFiltroTipo} />
            {loading ? <LoadingMsg /> : projetosFiltrados.length === 0 ? <EmptyMsg label="projetos de lei" /> : (
              <NormaList items={projetosFiltrados.map(m => ({
                id: m.id, icon: FileText,
                label: `${m.tipo}${m.numero ? ` nº ${m.numero}` : ''}${m.ano ? `/${m.ano}` : ''}`,
                ementa: m.ementa, status: m.status, arquivo_url: m.arquivo_url,
                data: m.data_apresentacao ? `Apresentado em ${m.data_apresentacao}` : null,
                extra: m.autor_nome ? `Autor: ${m.autor_nome}` : null,
              }))} itemAlvo={itemAlvo} linkBase={linkBase} />
            )}
          </TabsContent>

          {/* LEIS */}
          <TabsContent value="leis" className="mt-5">
            <TipoFilter tipos={['Lei Ordinária', 'Lei Complementar', 'Lei Orgânica', 'Emenda à Lei Orgânica']} filtroTipo={filtroTipo} setFiltroTipo={setFiltroTipo} />
            {loading ? <LoadingMsg /> : leisFiltradas.length === 0 ? <EmptyMsg label="leis" /> : (
              <NormaList items={leisFiltradas.map(n => ({
                id: n.id, icon: ScrollText,
                label: `${n.tipo}${n.numero ? ` nº ${n.numero}` : ''}${n.ano ? `/${n.ano}` : ''}`,
                ementa: n.ementa, status: n.situacao, arquivo_url: n.arquivo_url,
                data: n.data_publicacao ? `Publicada em ${n.data_publicacao}` : null,
              }))} itemAlvo={itemAlvo} linkBase={linkBase} />
            )}
          </TabsContent>

          {/* RESOLUÇÕES */}
          <TabsContent value="resolucoes" className="mt-5">
            {loading ? <LoadingMsg /> : resolucoesFiltradas.length === 0 ? <EmptyMsg label="resoluções" /> : (
              <NormaList items={resolucoesFiltradas.map(n => ({
                id: n.id, icon: Scale,
                label: `Resolução${n.numero ? ` nº ${n.numero}` : ''}${n.ano ? `/${n.ano}` : ''}`,
                ementa: n.ementa, status: n.situacao, arquivo_url: n.arquivo_url,
                data: n.data_publicacao ? `Publicada em ${n.data_publicacao}` : null,
              }))} itemAlvo={itemAlvo} linkBase={linkBase} />
            )}
          </TabsContent>

          {/* DECRETOS */}
          <TabsContent value="decretos" className="mt-5">
            {loading ? <LoadingMsg /> : decretosFiltrados.length === 0 ? <EmptyMsg label="decretos" /> : (
              <NormaList items={decretosFiltrados.map(n => ({
                id: n.id, icon: Stamp,
                label: `Decreto Legislativo${n.numero ? ` nº ${n.numero}` : ''}${n.ano ? `/${n.ano}` : ''}`,
                ementa: n.ementa, status: n.situacao, arquivo_url: n.arquivo_url,
                data: n.data_publicacao ? `Publicada em ${n.data_publicacao}` : null,
              }))} itemAlvo={itemAlvo} linkBase={linkBase} />
            )}
          </TabsContent>

          {/* PORTARIAS */}
          <TabsContent value="portarias" className="mt-5">
            {loading ? <LoadingMsg /> : portariasFiltradas.length === 0 ? <EmptyMsg label="portarias" /> : (
              <NormaList items={portariasFiltradas.map(n => ({
                id: n.id, icon: BookMarked,
                label: `Portaria${n.numero ? ` nº ${n.numero}` : ''}${n.ano ? `/${n.ano}` : ''}`,
                ementa: n.ementa, status: n.situacao, arquivo_url: n.arquivo_url,
                data: n.data_publicacao ? `Publicada em ${n.data_publicacao}` : null,
              }))} itemAlvo={itemAlvo} linkBase={linkBase} />
            )}
          </TabsContent>

          {/* ATAS */}
          <TabsContent value="atas" className="mt-5">
            {loading ? <LoadingMsg /> : atasFiltradas.length === 0 ? <EmptyMsg label="atas" /> : (
              <NormaList items={atasFiltradas.map(a => ({
                id: a.id, icon: BookOpen,
                label: a.numero || 'Ata',
                ementa: a.observacoes || 'Ata da sessão',
                arquivo_url: a.arquivo_url,
                data: a.data,
                extra: a.sessao_numero ? `Sessão ${a.sessao_numero}` : null,
              }))} itemAlvo={itemAlvo} linkBase={linkBase} />
            )}
          </TabsContent>

          {/* PAUTAS */}
          <TabsContent value="pautas" className="mt-5">
            {loading ? <LoadingMsg /> : pautasFiltradas.length === 0 ? <EmptyMsg label="pautas" /> : (
              <NormaList items={pautasFiltradas.map(p => ({
                id: p.id, icon: ClipboardList,
                label: p.numero || 'Pauta',
                ementa: p.observacoes || 'Pauta da sessão',
                arquivo_url: p.arquivo_url,
                extra: p.sessao_numero ? `Sessão ${p.sessao_numero}` : null,
              }))} itemAlvo={itemAlvo} linkBase={linkBase} />
            )}
          </TabsContent>

          {/* EMENDAS */}
          <TabsContent value="emendas" className="mt-5">
            {loading ? <LoadingMsg /> : grupoSelecionado ? (
              <div>
                <button
                  onClick={() => setEmendaVereador(null)}
                  className="flex items-center gap-1.5 text-sm text-blue-700 dark:text-blue-300 hover:underline font-medium mb-4"
                >
                  <ArrowLeft size={15} /> Voltar aos vereadores
                </button>
                <div className="flex items-center gap-4 mb-4 bg-card border border-border rounded-2xl p-4 shadow-sm">
                  {grupoSelecionado.foto
                    ? <img src={grupoSelecionado.foto} alt={grupoSelecionado.nome} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white shadow" />
                    : <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-heading font-bold text-white text-2xl bg-gradient-to-br from-blue-500 to-blue-700">{grupoSelecionado.nome.charAt(0)}</div>}
                  <div>
                    <div className="font-heading font-bold text-lg text-foreground">{grupoSelecionado.nome}</div>
                    {grupoSelecionado.partido && <div className="text-sm text-blue-700 dark:text-blue-300 font-semibold">{grupoSelecionado.partido}</div>}
                    <div className="text-xs text-muted-foreground mt-0.5">{grupoSelecionado.emendas.length} emenda{grupoSelecionado.emendas.length !== 1 ? 's' : ''} impositiva{grupoSelecionado.emendas.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="divide-y divide-border">
                    {grupoSelecionado.emendas.map(e => (
                      <div key={e.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/70 dark:hover:bg-muted/20 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950/40 dark:to-emerald-900/20 ring-1 ring-emerald-200/60 dark:ring-emerald-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <DollarSign size={15} className="text-emerald-700 dark:text-emerald-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                            Emenda Impositiva nº {e.numero}{e.ano ? `/${e.ano}` : ''}
                            {e.valor ? ` · R$ ${Number(e.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                          </div>
                          <div className="text-sm font-medium text-foreground leading-snug">{e.objeto}</div>
                        </div>
                        {e.arquivo_url && (
                          <a href={e.arquivo_url} target="_blank" rel="noreferrer"
                            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0">
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
                      className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:shadow-[0_15px_35px_-15px_rgba(37,99,235,0.35)] hover:border-blue-300/60 hover:-translate-y-0.5 transition-all text-left"
                    >
                      {g.foto
                        ? <img src={g.foto} alt={g.nome} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow flex-shrink-0" />
                        : <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-heading font-bold text-white text-xl flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700">{g.nome.charAt(0)}</div>}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-foreground truncate">{g.nome}</div>
                        {g.partido && <div className="text-xs text-blue-700 dark:text-blue-300 font-semibold">{g.partido}</div>}
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

          {/* PROTOCOLO */}
          <TabsContent value="protocolo" className="mt-5">
            <ProtocoloPublico camaraId={camaraId} />
          </TabsContent>
        </Tabs>

        {/* Rodapé */}
        <div className="text-center text-xs text-muted-foreground py-8 border-t border-border mt-4 space-y-2">
          <div>Portal da Transparência Legislativa · {camara?.nome || 'Câmara Municipal'}{camara?.municipio ? ` — ${camara.municipio}` : ''}</div>
          <div>
            <Link to="/login" className="text-blue-700 dark:text-blue-300 hover:underline inline-flex items-center gap-1">
              <LogIn size={11} /> Acesso ao Sistema Interno
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingMsg() {
  return (
    <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground text-sm animate-pulse">
      Carregando...
    </div>
  );
}
