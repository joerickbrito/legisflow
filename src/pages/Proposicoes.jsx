import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FolderOpen, Plus, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

const TIPOS = ['Projeto de Lei', 'Projeto de Lei Complementar', 'Resolução', 'Decreto Legislativo', 'Indicação', 'Moção', 'Requerimento', 'Emenda'];
const STATUS_OPTS = ['Rascunho', 'Enviada ao Protocolo', 'Protocolada', 'Devolvida'];

export default function Proposicoes() {
  const [proposicoes, setProposicoes] = useState([]);
  const [parlamentares, setParlamentares] = useState([]);
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ tipo: 'Projeto de Lei', ementa: '', justificativa: '', texto: '', autor_id: '', status: 'Rascunho', data_apresentacao: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    const [p, parl] = await Promise.all([
      base44.entities.Proposicao.list('-created_date', 100),
      base44.entities.Parlamentar.filter({ ativo: true }),
    ]);
    setProposicoes(p);
    setParlamentares(parl);
  }

  async function salvar() {
    const autor = parlamentares.find(p => p.id === form.autor_id);
    const data = { ...form, autor_nome: autor?.nome || '' };
    if (editando) await base44.entities.Proposicao.update(editando.id, data);
    else await base44.entities.Proposicao.create(data);
    setShowForm(false);
    load();
  }

  async function enviarProtocolo(p) {
    await base44.entities.Proposicao.update(p.id, { status: 'Enviada ao Protocolo' });
    load();
  }

  const filtradas = proposicoes.filter(p =>
    p.ementa?.toLowerCase().includes(busca.toLowerCase()) ||
    p.autor_nome?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader icon={FolderOpen} title="Proposições" subtitle="Propostas antes de virar matéria legislativa"
        action={<Button onClick={() => { setEditando(null); setForm({ tipo: 'Projeto de Lei', ementa: '', justificativa: '', texto: '', autor_id: '', status: 'Rascunho', data_apresentacao: '' }); setShowForm(true); }} className="gap-2"><Plus size={16} /> Nova Proposição</Button>}
      />

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por ementa ou autor..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
      </div>

      {filtradas.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Nenhuma proposição cadastrada" onAdd={() => setShowForm(true)} addLabel="Nova Proposição" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {filtradas.map(p => (
              <div key={p.id} className="flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FolderOpen size={17} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-muted-foreground">{p.tipo}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="text-sm font-medium text-foreground mt-0.5 line-clamp-2">{p.ementa}</div>
                  {p.autor_nome && <div className="text-xs text-muted-foreground mt-1">Autor: {p.autor_nome}</div>}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => { setEditando(p); setForm({ tipo: p.tipo, ementa: p.ementa, justificativa: p.justificativa || '', texto: p.texto || '', autor_id: p.autor_id || '', status: p.status, data_apresentacao: p.data_apresentacao || '' }); setShowForm(true); }}>
                    Editar
                  </Button>
                  {p.status === 'Rascunho' && (
                    <Button size="sm" onClick={() => enviarProtocolo(p)} className="gap-1 text-xs">
                      Protocolar <ArrowRight size={12} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">{editando ? 'Editar' : 'Nova'} Proposição</DialogTitle></DialogHeader>
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
                <label className="text-sm font-medium mb-1.5 block">Autor</label>
                <Select value={form.autor_id} onValueChange={v => setForm(f => ({ ...f, autor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{parlamentares.map(p => <SelectItem key={p.id} value={p.id}>{p.nome_parlamentar || p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Ementa *</label>
              <Textarea value={form.ementa} onChange={e => setForm(f => ({ ...f, ementa: e.target.value }))} rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Justificativa</label>
              <Textarea value={form.justificativa} onChange={e => setForm(f => ({ ...f, justificativa: e.target.value }))} rows={4} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Texto da Proposição</label>
              <Textarea value={form.texto} onChange={e => setForm(f => ({ ...f, texto: e.target.value }))} rows={6} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1.5 block">Data de Apresentação</label><Input type="date" value={form.data_apresentacao} onChange={e => setForm(f => ({ ...f, data_apresentacao: e.target.value }))} /></div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!form.ementa}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}