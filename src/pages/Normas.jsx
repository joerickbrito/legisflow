import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, ScrollText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const TIPOS = ['Lei Ordinária', 'Lei Complementar', 'Lei Orgânica', 'Decreto Legislativo', 'Resolução', 'Portaria'];
const SITUACOES = ['Vigente', 'Revogada', 'Suspensa'];

export default function Normas() {
  const [normas, setNormas] = useState([]);
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ tipo: 'Lei Ordinária', numero: '', ano: new Date().getFullYear(), ementa: '', data_publicacao: '', texto_integral: '', situacao: 'Vigente' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const n = await base44.entities.NormaJuridica.list('-created_date', 100);
    setNormas(n);
  }

  function openNew() {
    setEditando(null);
    setForm({ tipo: 'Lei Ordinária', numero: '', ano: new Date().getFullYear(), ementa: '', data_publicacao: '', texto_integral: '', situacao: 'Vigente' });
    setShowForm(true);
  }

  function openEdit(n) {
    setEditando(n);
    setForm({ tipo: n.tipo, numero: n.numero || '', ano: n.ano || new Date().getFullYear(), ementa: n.ementa, data_publicacao: n.data_publicacao || '', texto_integral: n.texto_integral || '', situacao: n.situacao || 'Vigente' });
    setShowForm(true);
  }

  async function salvar() {
    if (editando) await base44.entities.NormaJuridica.update(editando.id, form);
    else await base44.entities.NormaJuridica.create(form);
    setShowForm(false);
    loadData();
  }

  const filtradas = normas.filter(n => n.ementa?.toLowerCase().includes(busca.toLowerCase()) || n.numero?.includes(busca));

  const situacaoColor = { 'Vigente': 'bg-green-100 text-green-700', 'Revogada': 'bg-red-100 text-red-700', 'Suspensa': 'bg-yellow-100 text-yellow-700' };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Normas Jurídicas</h1>
          <p className="text-muted-foreground mt-1">{normas.filter(n => n.situacao !== 'Revogada').length} vigente(s)</p>
        </div>
        <Button onClick={openNew} className="gap-2 shadow-lg shadow-primary/20"><Plus size={18} /> Nova Norma</Button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por ementa ou número..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center">
          <ScrollText size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma norma cadastrada.</p>
          <Button onClick={openNew} variant="outline" className="mt-4 gap-2"><Plus size={16} /> Cadastrar norma</Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {filtradas.map((n) => (
              <div key={n.id} onClick={() => openEdit(n)} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                  <ScrollText size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-muted-foreground">{n.tipo}</span>
                    {n.numero && <span className="text-xs text-muted-foreground">nº {n.numero}/{n.ano}</span>}
                  </div>
                  <div className="text-sm font-medium text-foreground mt-0.5 line-clamp-1">{n.ementa}</div>
                  {n.data_publicacao && <div className="text-xs text-muted-foreground mt-0.5">Publicada em: {n.data_publicacao}</div>}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${situacaoColor[n.situacao] || 'bg-muted text-muted-foreground'}`}>{n.situacao}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editando ? 'Editar Norma' : 'Nova Norma Jurídica'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Tipo *</label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Situação</label>
                <Select value={form.situacao} onValueChange={v => setForm(f => ({ ...f, situacao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SITUACOES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Número</label>
                <Input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="Ex: 1234" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ano</label>
                <Input type="number" value={form.ano} onChange={e => setForm(f => ({ ...f, ano: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Ementa *</label>
              <Textarea value={form.ementa} onChange={e => setForm(f => ({ ...f, ementa: e.target.value }))} rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Data de Publicação</label>
              <Input type="date" value={form.data_publicacao} onChange={e => setForm(f => ({ ...f, data_publicacao: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Texto Integral</label>
              <Textarea value={form.texto_integral} onChange={e => setForm(f => ({ ...f, texto_integral: e.target.value }))} rows={5} />
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