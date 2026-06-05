import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FolderOpen, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

const TIPOS = ['Ofício', 'Memorando', 'Circular', 'Portaria', 'Despacho', 'Resolução Interna', 'Ato da Mesa'];
const STATUS_OPTS = ['Rascunho', 'Emitido', 'Entregue', 'Arquivado'];

export default function Documentos() {
  const [documentos, setDocumentos] = useState([]);
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ tipo: 'Ofício', numero: '', ano: new Date().getFullYear(), assunto: '', texto: '', remetente: '', destinatario: '', data: '', status: 'Rascunho' });

  useEffect(() => { load(); }, []);

  async function load() {
    const d = await base44.entities.DocumentoAdministrativo.list('-created_date', 100);
    setDocumentos(d);
  }

  async function salvar() {
    if (editando) await base44.entities.DocumentoAdministrativo.update(editando.id, form);
    else await base44.entities.DocumentoAdministrativo.create(form);
    setShowForm(false);
    load();
  }

  const filtrados = documentos.filter(d =>
    d.assunto?.toLowerCase().includes(busca.toLowerCase()) ||
    d.remetente?.toLowerCase().includes(busca.toLowerCase())
  );

  const statusColor = { 'Rascunho': 'bg-gray-100 text-gray-600', 'Emitido': 'bg-blue-100 text-blue-700', 'Entregue': 'bg-green-100 text-green-700', 'Arquivado': 'bg-gray-100 text-gray-500' };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader icon={FolderOpen} title="Documentos Administrativos" subtitle="Ofícios, memorandos, portarias e despachos"
        action={<Button onClick={() => { setEditando(null); setForm({ tipo: 'Ofício', numero: '', ano: new Date().getFullYear(), assunto: '', texto: '', remetente: '', destinatario: '', data: '', status: 'Rascunho' }); setShowForm(true); }} className="gap-2"><Plus size={16} /> Novo Documento</Button>}
      />

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por assunto ou remetente..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Nenhum documento cadastrado" onAdd={() => setShowForm(true)} addLabel="Criar Documento" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {filtrados.map(d => (
              <div key={d.id} onClick={() => { setEditando(d); setForm({ tipo: d.tipo, numero: d.numero || '', ano: d.ano || new Date().getFullYear(), assunto: d.assunto, texto: d.texto || '', remetente: d.remetente || '', destinatario: d.destinatario || '', data: d.data || '', status: d.status }); setShowForm(true); }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                  <FolderOpen size={17} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">{d.tipo}</span>
                    {d.numero && <span className="text-xs text-muted-foreground">nº {d.numero}/{d.ano}</span>}
                  </div>
                  <div className="text-sm font-medium text-foreground mt-0.5 line-clamp-1">{d.assunto}</div>
                  {(d.remetente || d.destinatario) && <div className="text-xs text-muted-foreground mt-0.5">{d.remetente && `De: ${d.remetente}`}{d.destinatario && ` → Para: ${d.destinatario}`}</div>}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${statusColor[d.status]}`}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">{editando ? 'Editar' : 'Novo'} Documento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Tipo *</label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2"><label className="text-sm font-medium mb-1.5 block">Assunto *</label><Input value={form.assunto} onChange={e => setForm(f => ({ ...f, assunto: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Data</label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1.5 block">Remetente</label><Input value={form.remetente} onChange={e => setForm(f => ({ ...f, remetente: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Destinatário</label><Input value={form.destinatario} onChange={e => setForm(f => ({ ...f, destinatario: e.target.value }))} /></div>
            </div>
            <div><label className="text-sm font-medium mb-1.5 block">Texto</label><Textarea value={form.texto} onChange={e => setForm(f => ({ ...f, texto: e.target.value }))} rows={6} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!form.assunto}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}