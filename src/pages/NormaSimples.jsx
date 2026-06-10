import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import FileUpload from '@/components/FileUpload';

const STATUS_NORMA = ['Vigente', 'Revogada', 'Revogada Parcialmente', 'Suspensa', 'Não Vigente'];
const statusColors = {
  'Vigente': 'bg-green-100 text-green-800',
  'Revogada': 'bg-red-100 text-red-800',
  'Revogada Parcialmente': 'bg-orange-100 text-orange-800',
  'Suspensa': 'bg-yellow-100 text-yellow-800',
  'Não Vigente': 'bg-gray-100 text-gray-800',
};

export default function NormaSimples({ tipo, icon: Icon, title, subtitle, addLabel }) {
  const { tenant, withTenant, canQuery } = useTenant();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(null);

  const empty = { tipo, numero: '', ano: new Date().getFullYear(), ementa: '', data_publicacao: '', situacao: 'Vigente', arquivo_url: '' };

  useEffect(() => {
    if (!canQuery) return;
    base44.entities.NormaJuridica.filter(withTenant({ tipo })).then(setItems);
  }, [canQuery, tenant]);

  const filtered = items.filter(i =>
    `${i.numero} ${i.ementa}`.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (item) => { setForm({ ...item }); setEditing(item.id); setOpen(true); };

  const save = async () => {
    const data = { ...form, tipo, tenant_id: tenant?.id };
    if (editing) await base44.entities.NormaJuridica.update(editing, data);
    else await base44.entities.NormaJuridica.create(data);
    const updated = await base44.entities.NormaJuridica.filter(withTenant({ tipo }));
    setItems(updated);
    setOpen(false);
  };

  const remove = async (id) => {
    await base44.entities.NormaJuridica.delete(id);
    setItems(items.filter(i => i.id !== id));
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={Icon}
        title={title}
        subtitle={subtitle}
        action={<Button onClick={openNew}><Plus size={16} className="mr-1" /> {addLabel}</Button>}
      />

      <div className="mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por número ou ementa..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Icon} title={`Nenhum registro encontrado`} description={`Cadastre o primeiro registro.`} onAdd={openNew} addLabel={addLabel} />
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={item.id} className="bg-card border rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm">{item.tipo} nº {item.numero}/{item.ano}</span>
                  <Badge className={statusColors[item.situacao] || 'bg-gray-100 text-gray-800'}>{item.situacao}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{item.ementa}</p>
                {item.data_publicacao && <p className="text-xs text-muted-foreground mt-1">Publicação: {item.data_publicacao}</p>}
                {item.arquivo_url && (
                  <a href={item.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-1">
                    <ExternalLink size={12} /> Ver PDF
                  </a>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil size={14} /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(item.id)}><Trash2 size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${tipo}` : `Nova ${tipo}`}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <label className="text-sm font-medium">Número</label>
              <Input value={form.numero || ''} onChange={e => set('numero', e.target.value)} placeholder="001" />
            </div>
            <div>
              <label className="text-sm font-medium">Ano</label>
              <Input type="number" value={form.ano || ''} onChange={e => set('ano', Number(e.target.value))} />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Ementa *</label>
              <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px] bg-background" value={form.ementa || ''} onChange={e => set('ementa', e.target.value)} placeholder="Descrição..." />
            </div>
            <div>
              <label className="text-sm font-medium">Data de Publicação</label>
              <Input type="date" value={form.data_publicacao || ''} onChange={e => set('data_publicacao', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Situação</label>
              <Select value={form.situacao || 'Vigente'} onValueChange={v => set('situacao', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_NORMA.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <FileUpload value={form.arquivo_url} onUploaded={url => set('arquivo_url', url)} label="Arquivo (PDF, DOC...)" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}