import { useState, useEffect } from 'react';
import { sislegisEntities } from '@/lib/sislegisApi';
import { useTenant } from '@/lib/TenantContext';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import { useExclusaoSegura } from '@/components/ExclusaoSegura';
import FilterBar, { TODOS } from '@/components/FilterBar';
import LoadingState from '@/components/LoadingState';

const TIPOS = ['Projeto de Lei', 'Projeto de Lei Complementar', 'Emenda à Lei Orgânica'];
const STATUS = ['Em tramitação', 'Aprovada', 'Rejeitada', 'Arquivada', 'Retirada', 'Transformada em Norma', 'Aguardando Votação'];
const REGIMES = ['Normal', 'Urgência', 'Urgência Urgentíssima'];

const statusColors = {
  'Em tramitação': 'bg-blue-100 text-blue-800',
  'Aprovada': 'bg-green-100 text-green-800',
  'Rejeitada': 'bg-red-100 text-red-800',
  'Arquivada': 'bg-gray-100 text-gray-800',
  'Retirada': 'bg-yellow-100 text-yellow-800',
  'Transformada em Norma': 'bg-purple-100 text-purple-800',
  'Aguardando Votação': 'bg-orange-100 text-orange-800',
};

const empty = { tipo: 'Projeto de Lei', numero: '', ano: new Date().getFullYear(), ementa: '', autor_nome: '', autor_tipo: 'Vereador', regime_tramitacao: 'Normal', status: 'Em tramitação', data_apresentacao: '', data_protocolo: '', observacoes: '', arquivo_url: '' };

export default function ProjetosLei() {
  const { tenantId, withTenant, canQuery } = useTenant();
  const { pode } = useAuth();
  const podeCriar = pode('projetos_lei_criar');
  const podeEditar = pode('projetos_lei_editar');
  const podeExcluir = pode('projetos_lei_excluir');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [filtros, setFiltros] = useState({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canQuery) return;
    setLoading(true);
    sislegisEntities.Materia.filter(withTenant({ tipo: { $in: TIPOS } })).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [canQuery, tenantId]);

  const anos = [...new Set(items.map(i => i.ano).filter(Boolean))].sort((a, b) => b - a).map(String);

  const filtered = items.filter(i => {
    const buscaOk = `${i.numero} ${i.ementa} ${i.autor_nome}`.toLowerCase().includes(search.toLowerCase());
    const statusOk = !filtros.status || filtros.status === TODOS || i.status === filtros.status;
    const tipoOk = !filtros.tipo || filtros.tipo === TODOS || i.tipo === filtros.tipo;
    const anoOk = !filtros.ano || filtros.ano === TODOS || String(i.ano) === filtros.ano;
    return buscaOk && statusOk && tipoOk && anoOk;
  });

  const openNew = () => { setForm(empty); setEditing(null); setErrorMsg(''); setOpen(true); };
  const openEdit = (item) => { setForm({ ...item }); setEditing(item.id); setErrorMsg(''); setOpen(true); };

  const save = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      // Mapear autor_tipo (campo do formulário) → origem (campo da entidade Materia)
      const { autor_tipo, ...rest } = form;
      const origemMap = {
        'Vereador': 'Parlamentar',
        'Executivo': 'Executivo',
        'Comissão': 'Comissão',
        'Popular': 'Popular',
      };
      const data = {
        ...rest,
        tenant_id: tenantId || '',
        origem: origemMap[autor_tipo] || 'Parlamentar',
      };
      if (editing) await sislegisEntities.Materia.update(editing, data);
      else await sislegisEntities.Materia.create(data);
      const updated = await sislegisEntities.Materia.filter(withTenant({ tipo: { $in: TIPOS } }));
      setItems(updated);
      setOpen(false);
      setErrorMsg('');
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao salvar projeto.');
    } finally {
      setSaving(false);
    }
  };

  const { pedirExclusao, dialogExclusao } = useExclusaoSegura({
    withTenant,
    onExcluido: () => sislegisEntities.Materia.filter(withTenant({ tipo: { $in: TIPOS } })).then(setItems),
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={FileText}
        title="Projetos de Lei"
        subtitle="Gestão de projetos de lei e projetos de lei complementar"
        action={podeCriar && <Button onClick={openNew}><Plus size={16} className="mr-1" /> Novo Projeto</Button>}
      />

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar por número, ementa ou autor..."
        filtros={[
          { key: 'status', label: 'Status', options: STATUS },
          { key: 'tipo', label: 'Tipo', options: TIPOS },
          { key: 'ano', label: 'Ano', options: anos },
        ]}
        valores={filtros}
        onChange={(k, v) => setFiltros(f => ({ ...f, [k]: v }))}
        onLimpar={() => { setSearch(''); setFiltros({}); }}
      />

      {loading ? (
        <LoadingState label="Carregando projetos..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhum projeto encontrado" description="Cadastre o primeiro projeto de lei." onAdd={podeCriar ? openNew : undefined} addLabel="Novo Projeto" />
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={item.id} className="bg-card border rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm">{item.tipo} {item.numero}/{item.ano}</span>
                  <Badge className={statusColors[item.status] || 'bg-gray-100 text-gray-800'}>{item.status}</Badge>
                  {item.regime_tramitacao !== 'Normal' && <Badge variant="outline" className="text-orange-700 border-orange-300">{item.regime_tramitacao}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{item.ementa}</p>
                {item.autor_nome && <p className="text-xs text-muted-foreground mt-1">Autor: {item.autor_nome}</p>}
                {item.arquivo_url && (
                  <a href={item.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline">
                    <ExternalLink size={11} /> Ver documento
                  </a>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {podeEditar && <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil size={14} /></Button>}
                {podeExcluir && <Button size="icon" variant="ghost" className="text-destructive" onClick={() => pedirExclusao('Materia', item, `${item.tipo} ${item.numero}/${item.ano}`)}><Trash2 size={14} /></Button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Projeto' : 'Novo Projeto de Lei'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={form.tipo} onValueChange={v => set('tipo', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Número</label>
              <Input value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="001" />
            </div>
            <div>
              <label className="text-sm font-medium">Ano</label>
              <Input type="number" value={form.ano} onChange={e => set('ano', Number(e.target.value))} />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Ementa *</label>
              <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px] bg-background" value={form.ementa} onChange={e => set('ementa', e.target.value)} placeholder="Descrição do projeto..." />
            </div>
            <div>
              <label className="text-sm font-medium">Autor</label>
              <Input value={form.autor_nome} onChange={e => set('autor_nome', e.target.value)} placeholder="Nome do autor" />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo de Autor</label>
              <Select value={form.autor_tipo} onValueChange={v => set('autor_tipo', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Vereador', 'Executivo', 'Comissão', 'Popular'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Regime de Tramitação</label>
              <Select value={form.regime_tramitacao} onValueChange={v => set('regime_tramitacao', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REGIMES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Data de Apresentação</label>
              <Input type="date" value={form.data_apresentacao} onChange={e => set('data_apresentacao', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Data de Protocolo</label>
              <Input type="date" value={form.data_protocolo} onChange={e => set('data_protocolo', e.target.value)} />
            </div>
            <div className="col-span-2">
              <FileUpload value={form.arquivo_url} onUploaded={url => set('arquivo_url', url)} label="Arquivo (PDF, DOC...)" />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={!!form.vai_votacao} onChange={e => set('vai_votacao', e.target.checked)} className="w-4 h-4 rounded border-border accent-primary" />
                Enviar para votação no painel eletrônico
              </label>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Observações</label>
              <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] bg-background" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
            </div>
          </div>
          {errorMsg && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md mt-2">{errorMsg}</p>}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setOpen(false); setErrorMsg(''); }}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {dialogExclusao}
    </div>
  );
}