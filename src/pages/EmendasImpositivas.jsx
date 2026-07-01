import { useState, useEffect } from 'react';
import { sislegisEntities } from '@/lib/sislegisApi';
import { useTenant } from '@/lib/TenantContext';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { useExclusaoSegura } from '@/components/ExclusaoSegura';
import FilterBar, { TODOS } from '@/components/FilterBar';
import LoadingState from '@/components/LoadingState';
import FileUpload from '@/components/FileUpload';

const empty = { numero: '', ano: new Date().getFullYear(), data: '', objeto: '', valor: '', vereador_id: '', vereador_nome: '', vereador_partido: '', arquivo_url: '', observacoes: '' };

export default function EmendasImpositivas() {
  const { tenant, withTenant, canQuery } = useTenant();
  const { pode } = useAuth();
  const podeCriar = pode('emendas_impositivas_criar');
  const podeEditar = pode('emendas_impositivas_editar');
  const podeExcluir = pode('emendas_impositivas_excluir');
  const [items, setItems] = useState([]);
  const [parlamentares, setParlamentares] = useState([]);
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
    sislegisEntities.EmendaImpositiva.filter(withTenant({})).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
    sislegisEntities.Parlamentar.filter(withTenant({ ativo: true })).then(setParlamentares).catch(() => {});
  }, [canQuery, tenant]);

  const anos = [...new Set(items.map(i => i.ano).filter(Boolean))].sort((a, b) => b - a).map(String);

  const filtered = items.filter(i => {
    const buscaOk = `${i.numero} ${i.objeto} ${i.vereador_nome}`.toLowerCase().includes(search.toLowerCase());
    const anoOk = !filtros.ano || filtros.ano === TODOS || String(i.ano) === filtros.ano;
    return buscaOk && anoOk;
  });

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (item) => { setForm({ ...item }); setEditing(item.id); setOpen(true); };

  const handleParlamentarChange = (id) => {
    const p = parlamentares.find(p => p.id === id);
    if (p) setForm(f => ({
      ...f,
      vereador_id: p.id,
      vereador_nome: p.nome_parlamentar || p.nome,
      vereador_partido: p.partido_sigla || '',
      vereador_telefone: p.telefone || '',
      vereador_email: p.email || '',
      vereador_foto_url: p.foto_url || '',
    }));
  };

  const save = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const data = { ...form, tenant_id: tenant?.id, valor: form.valor ? Number(form.valor) : null };
      if (editing) await sislegisEntities.EmendaImpositiva.update(editing, data);
      else await sislegisEntities.EmendaImpositiva.create(data);
      const updated = await sislegisEntities.EmendaImpositiva.filter(withTenant({}));
      setItems(updated);
      setOpen(false);
      setErrorMsg('');
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao salvar emenda.');
    } finally {
      setSaving(false);
    }
  };

  const { pedirExclusao, dialogExclusao } = useExclusaoSegura({
    withTenant,
    onExcluido: () => sislegisEntities.EmendaImpositiva.filter(withTenant({})).then(setItems),
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={DollarSign}
        title="Emendas Impositivas"
        subtitle="Gestão de emendas impositivas ao orçamento"
        action={podeCriar && <Button onClick={openNew}><Plus size={16} className="mr-1" /> Nova Emenda</Button>}
      />

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar por número, objeto ou vereador..."
        filtros={[{ key: 'ano', label: 'Ano', options: anos }]}
        valores={filtros}
        onChange={(k, v) => setFiltros(f => ({ ...f, [k]: v }))}
        onLimpar={() => { setSearch(''); setFiltros({}); }}
      />

      {loading ? (
        <LoadingState label="Carregando emendas..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={DollarSign} title="Nenhuma emenda encontrada" description="Cadastre a primeira emenda impositiva." onAdd={podeCriar ? openNew : undefined} addLabel="Nova Emenda" />
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={item.id} className="bg-card border rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm">Emenda nº {item.numero}/{item.ano}</span>
                  {item.valor && <span className="text-sm font-medium text-green-700">R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{item.objeto}</p>
                {item.vereador_nome && <p className="text-xs text-muted-foreground mt-1">Vereador: {item.vereador_nome}{item.vereador_partido ? ` — ${item.vereador_partido}` : ''}</p>}
                {item.arquivo_url && (
                  <a href={item.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-1">
                    <ExternalLink size={12} /> Ver PDF
                  </a>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {podeEditar && <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil size={14} /></Button>}
                {podeExcluir && <Button size="icon" variant="ghost" className="text-destructive" onClick={() => pedirExclusao('EmendaImpositiva', item, `Emenda nº ${item.numero || ''}/${item.ano || ''}`)}><Trash2 size={14} /></Button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Emenda Impositiva' : 'Nova Emenda Impositiva'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <label className="text-sm font-medium">Número *</label>
              <Input value={form.numero || ''} onChange={e => set('numero', e.target.value)} placeholder="001" />
            </div>
            <div>
              <label className="text-sm font-medium">Ano</label>
              <Input type="number" value={form.ano || ''} onChange={e => set('ano', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Data</label>
              <Input type="date" value={form.data || ''} onChange={e => set('data', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Valor (R$)</label>
              <Input type="number" step="0.01" value={form.valor || ''} onChange={e => set('valor', e.target.value)} placeholder="0,00" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Objeto *</label>
              <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px] bg-background" value={form.objeto || ''} onChange={e => set('objeto', e.target.value)} placeholder="Descrição do objeto da emenda..." />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Vereador</label>
              <Select value={form.vereador_id || ''} onValueChange={handleParlamentarChange}>
                <SelectTrigger><SelectValue placeholder="Selecionar vereador..." /></SelectTrigger>
                <SelectContent>
                  {parlamentares.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome_parlamentar || p.nome}{p.partido_sigla ? ` — ${p.partido_sigla}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <FileUpload value={form.arquivo_url} onUploaded={url => set('arquivo_url', url)} label="Arquivo (PDF, DOC...)" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Observações</label>
              <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] bg-background" value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} />
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