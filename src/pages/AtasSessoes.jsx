import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Plus, Search, Pencil, Trash2, ExternalLink } from 'lucide-react';
import FileUpload from '@/components/FileUpload';

const empty = { numero: '', data: '', sessao_id: '', sessao_numero: '', observacoes: '', arquivo_url: '' };

export default function AtasSessoes() {
  const { tenant, withTenant, canQuery } = useTenant();
  const [items, setItems] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!canQuery) return;
    base44.entities.AtaSessao.filter(withTenant({})).then(setItems);
    base44.entities.Sessao.filter(withTenant({})).then(setSessoes);
  }, [canQuery, tenant]);

  const filtered = items.filter(i =>
    `${i.numero} ${i.sessao_numero}`.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (item) => { setForm({ ...item }); setEditing(item.id); setOpen(true); };

  const handleSessaoChange = (id) => {
    const s = sessoes.find(s => s.id === id);
    setForm(f => ({ ...f, sessao_id: id, sessao_numero: s?.numero || '' }));
  };

  const save = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const data = { ...form, tenant_id: tenant?.id };
      if (editing) await base44.entities.AtaSessao.update(editing, data);
      else await base44.entities.AtaSessao.create(data);
      const updated = await base44.entities.AtaSessao.filter(withTenant({}));
      setItems(updated);
      setOpen(false);
      setErrorMsg('');
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao salvar ata.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta ata?')) return;
    try {
      await base44.entities.AtaSessao.delete(id);
      setItems(items.filter(i => i.id !== id));
    } catch (e) {
      setErrorMsg(e?.message || 'Erro ao excluir ata.');
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={BookOpen}
        title="Atas das Sessões"
        subtitle="Registro de atas das sessões plenárias"
        action={<Button onClick={openNew}><Plus size={16} className="mr-1" /> Nova Ata</Button>}
      />

      <div className="mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por número ou sessão..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nenhuma ata encontrada" description="Cadastre a primeira ata de sessão." onAdd={openNew} addLabel="Nova Ata" />
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={item.id} className="bg-card border rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">Ata nº {item.numero}</span>
                  {item.data && <span className="text-xs text-muted-foreground">{item.data}</span>}
                </div>
                {item.sessao_numero && <p className="text-sm text-muted-foreground">Sessão: {item.sessao_numero}</p>}
                {item.observacoes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.observacoes}</p>}
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
            <DialogTitle>{editing ? 'Editar Ata' : 'Nova Ata de Sessão'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <label className="text-sm font-medium">Número *</label>
              <Input value={form.numero || ''} onChange={e => set('numero', e.target.value)} placeholder="001" />
            </div>
            <div>
              <label className="text-sm font-medium">Data *</label>
              <Input type="date" value={form.data || ''} onChange={e => set('data', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Sessão Plenária</label>
              <Select value={form.sessao_id || ''} onValueChange={handleSessaoChange}>
                <SelectTrigger><SelectValue placeholder="Vincular sessão..." /></SelectTrigger>
                <SelectContent>
                  {sessoes.map(s => (
                    <SelectItem key={s.id} value={s.id}>Sessão {s.numero} — {s.data || ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Observações</label>
              <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px] bg-background" value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} />
            </div>
            <div className="col-span-2">
              <FileUpload value={form.arquivo_url} onUploaded={url => set('arquivo_url', url)} label="Arquivo (PDF, DOC...)" />
            </div>
          </div>
          {errorMsg && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md mt-2">{errorMsg}</p>}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setOpen(false); setErrorMsg(''); }}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}