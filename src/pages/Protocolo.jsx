import { useEffect, useState } from 'react';
import { sislegisEntities } from '@/lib/sislegisApi';
import { Plus, Inbox, Search } from 'lucide-react';
import { useTenant } from '@/lib/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import LoadingState from '@/components/LoadingState';

const TIPOS = ['Ofício', 'Requerimento', 'Petição', 'Memorando', 'Relatório', 'Outros'];
const STATUS_OPTS = ['Recebido', 'Em Análise', 'Encaminhado', 'Arquivado', 'Respondido'];

export default function Protocolo() {
  const { tenantId, withTenant, canQuery } = useTenant();
  const [protocolos, setProtocolos] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ tipo: 'Ofício', assunto: '', remetente: '', data_recebimento: '', status: 'Recebido', destino: '', observacoes: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (canQuery) loadData(); }, [tenantId, canQuery]);

  async function loadData() {
    setLoading(true);
    try {
      const p = await sislegisEntities.Protocolo.filter(withTenant({}), '-created_date', 100);
      setProtocolos(p);
    } catch (e) {
      setProtocolos([]);
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditando(null);
    setForm({ tipo: 'Ofício', assunto: '', remetente: '', data_recebimento: '', status: 'Recebido', destino: '', observacoes: '' });
    setShowForm(true);
  }

  function openEdit(p) {
    setEditando(p);
    setForm({ tipo: p.tipo, assunto: p.assunto, remetente: p.remetente, data_recebimento: p.data_recebimento || '', status: p.status, destino: p.destino || '', observacoes: p.observacoes || '' });
    setShowForm(true);
  }

  async function salvar() {
    if (editando) await sislegisEntities.Protocolo.update(editando.id, form);
    else await sislegisEntities.Protocolo.create({ ...form, tenant_id: tenantId || '', numero: String(protocolos.length + 1).padStart(4, '0'), ano: new Date().getFullYear() });
    setShowForm(false);
    loadData();
  }

  const filtrados = protocolos.filter(p => {
    const matchBusca = p.assunto?.toLowerCase().includes(busca.toLowerCase()) || p.remetente?.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const statusColor = {
    'Recebido': 'bg-blue-100 text-blue-700',
    'Em Análise': 'bg-yellow-100 text-yellow-700',
    'Encaminhado': 'bg-orange-100 text-orange-700',
    'Arquivado': 'bg-gray-100 text-gray-600',
    'Respondido': 'bg-green-100 text-green-700',
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Protocolo</h1>
          <p className="text-muted-foreground mt-1">{protocolos.filter(p => p.status === 'Recebido').length} documento(s) pendente(s)</p>
        </div>
        <Button onClick={openNew} className="gap-2 shadow-lg shadow-primary/20"><Plus size={18} /> Novo Protocolo</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por assunto ou remetente..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {STATUS_OPTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingState label="Carregando protocolos..." />
      ) : filtrados.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center">
          <Inbox size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum protocolo encontrado.</p>
          <Button onClick={openNew} variant="outline" className="mt-4 gap-2"><Plus size={16} /> Registrar protocolo</Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {filtrados.map((p) => (
              <div key={p.id} onClick={() => openEdit(p)} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                  <Inbox size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">{p.tipo}</span>
                    {p.numero && <span className="text-xs text-muted-foreground">· nº {p.numero}/{p.ano}</span>}
                  </div>
                  <div className="text-sm font-medium text-foreground mt-0.5 line-clamp-1">{p.assunto}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    De: {p.remetente}
                    {p.data_recebimento && ` · Recebido em: ${p.data_recebimento}`}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${statusColor[p.status] || 'bg-muted text-muted-foreground'}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{editando ? 'Editar Protocolo' : 'Novo Protocolo'}</DialogTitle>
          </DialogHeader>
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
            <div>
              <label className="text-sm font-medium mb-1.5 block">Assunto *</label>
              <Input value={form.assunto} onChange={e => setForm(f => ({ ...f, assunto: e.target.value }))} placeholder="Assunto do documento" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Remetente *</label>
              <Input value={form.remetente} onChange={e => setForm(f => ({ ...f, remetente: e.target.value }))} placeholder="Quem enviou o documento" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Data de Recebimento</label>
                <Input type="date" value={form.data_recebimento} onChange={e => setForm(f => ({ ...f, data_recebimento: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Destino</label>
                <Input value={form.destino} onChange={e => setForm(f => ({ ...f, destino: e.target.value }))} placeholder="Para onde encaminhar" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Observações</label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!form.assunto || !form.remetente}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}